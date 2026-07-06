import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 🔑 세션 및 사용자 권한 획득 헬퍼
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const operatorId = Number(payload.id) || null;
    
    return {
      isAuthorized: role === 'SUPER_ADMIN' || role === 'OPERATOR',
      role,
      name,
      operatorId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
  }
}

// [GET] 비상 복구 요청 리스트 조회
export async function GET(request: Request) {
  try {
    const { isAuthorized, role, operatorId } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 로그인이 필요합니다.' }, { status: 403 });
    }
    
    // 만료된 요청들에 대해 자동으로 EXPIRED 처리 스캔
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await executeSQL(`
      UPDATE crm_credential_emergency_requests 
      SET status = 'EXPIRED' 
      WHERE status = 'APPROVED' AND expires_at < '${nowKst}'
    `);

    let requests = [];
    if (role === 'SUPER_ADMIN') {
      // 최고관리자는 모든 결재 대기 및 이력 조회 가능
      const res = await executeSQL(`
        SELECT er.*, cv.asset_name, cv.category, cv.login_id, op.name as requester_name 
        FROM crm_credential_emergency_requests er
        LEFT JOIN crm_credential_vault cv ON er.credential_id = cv.id
        LEFT JOIN crm_operators op ON er.requester_id = op.id
        ORDER BY er.id DESC
      `);
      requests = res.rows || [];
    } else {
      // 일반 운영자는 본인이 요청한 비상 결재 요청 이력만 조회 가능
      const res = await executeSQL(`
        SELECT er.*, cv.asset_name, cv.category, cv.login_id, op.name as requester_name 
        FROM crm_credential_emergency_requests er
        LEFT JOIN crm_credential_vault cv ON er.credential_id = cv.id
        LEFT JOIN crm_operators op ON er.requester_id = op.id
        WHERE er.requester_id = '${operatorId}'
        ORDER BY er.id DESC
      `);
      requests = res.rows || [];
    }

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error("GET Emergency Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// [POST] 비상 복구 요청 등록 / 승인 / 반려 처리
export async function POST(request: Request) {
  try {
    const { isAuthorized, role, name, operatorId } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 로그인이 필요합니다.' }, { status: 403 });
    }

    const { action, requestId, credentialId, requestReason } = await request.json();

    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 1. 비상 복구 요청 생성 (일반 직원 신청)
    if (action === 'request') {
      if (!credentialId || !requestReason) {
        return NextResponse.json({ success: false, error: '조회할 비밀번호 정보 또는 요청 사유가 누락되었습니다.' }, { status: 400 });
      }

      // 이미 승인된 진행 건이 있는지 검사 (중복 요청 방지)
      const existingRes = await queryTable('crm_credential_emergency_requests', {
        filters: { credential_id: String(credentialId), requester_id: String(operatorId), status: 'PENDING' }
      });
      const existing = existingRes.rows && existingRes.rows.length > 0 ? existingRes.rows[0] : null;

      if (existing) {
        return NextResponse.json({ success: false, error: '이미 해당 자산에 대해 승인 대기 중인 비상 요청이 존재합니다.' }, { status: 400 });
      }

      await insertRows('crm_credential_emergency_requests', [{
        id: Date.now(),
        credential_id: Number(credentialId),
        requester_id: operatorId,
        request_reason: requestReason,
        status: 'PENDING',
        created_at: nowKst
      }]);

      // 감사 로그에 요청 생성 남기기
      await insertRows('crm_credential_audit_logs', [{
        credential_id: Number(credentialId),
        operator_id: operatorId,
        operator_name: name,
        action_type: 'VIEW_ENCRYPTED',
        access_reason: `비상 복구 조회 결재 신청: ${requestReason}`,
        created_at: nowKst
      }]);

      return NextResponse.json({ success: true, message: '비상 복구 요청이 등록되었습니다. 최고관리자의 승인을 기다려 주세요.' });
    }

    // 2. 최고관리자 결재 처리 (승인 / 반려)
    if (action === 'approve' || action === 'reject') {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: '승인/반려 권한은 최고관리자에게만 있습니다.' }, { status: 403 });
      }

      if (!requestId) {
        return NextResponse.json({ success: false, error: '결재할 요청 ID가 누락되었습니다.' }, { status: 400 });
      }

      const reqRes = await queryTable('crm_credential_emergency_requests', { filters: { id: String(requestId) } });
      const req = reqRes.rows && reqRes.rows.length > 0 ? reqRes.rows[0] : null;
      if (!req) {
        return NextResponse.json({ success: false, error: '해당 결재 요청 건을 찾을 수 없습니다.' }, { status: 404 });
      }

      if (req.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: '이미 처리 완료된 결재 건입니다.' }, { status: 400 });
      }

      if (action === 'approve') {
        // 승인 시점부터 24시간 동안 유효한 expires_at 계산
        const expiresTime = new Date(Date.now() + (9 + 24) * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await updateRows('crm_credential_emergency_requests', {
          status: 'APPROVED',
          approved_by: name,
          approved_at: nowKst,
          expires_at: expiresTime
        }, { filters: { id: String(requestId) } });

        // 감사 로그 기록
        await insertRows('crm_credential_audit_logs', [{
          credential_id: req.credential_id,
          operator_id: operatorId,
          operator_name: name,
          action_type: 'DECRYPT_APPROVE',
          access_reason: `비상 복구 요청 승인 완료 (24시간 조회 허가)`,
          created_at: nowKst
        }]);

        return NextResponse.json({ success: true, message: '비상 복구 요청이 정상 승인되었습니다. 해당 직원은 24시간 동안 비밀번호를 복호화 열람할 수 있습니다.' });
      }

      if (action === 'reject') {
        await updateRows('crm_credential_emergency_requests', {
          status: 'REJECTED'
        }, { filters: { id: String(requestId) } });

        return NextResponse.json({ success: true, message: '비상 복구 요청이 반려 처리되었습니다.' });
      }
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 액션입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error("POST Emergency Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
