export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, uploadFile } from '../../../../../egdesk-helpers';

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR' || role === 'SYSTEM_ADMIN' || role === 'TENANT_ADMIN' || role === 'EMPLOYEE';
    return { isAuthorized, role, name, username, tenantId };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

/**
 * 전사 연차 신청 리스트 및 결재함 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // PENDING, APPROVED, REJECTED

    const { isAuthorized, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const isGlobalSysAdmin = loggedUsername === 'admin' && tenantId === 'default';

    // 직원 마스터 목록 스캔 (이름 매핑용, 테넌트 격리)
    const queryFilters: any = {};
    if (!isGlobalSysAdmin) {
      queryFilters.tenant_id = tenantId;
    }
    const operatorsRes = await queryTable('crm_operators', { filters: queryFilters });
    const ops = operatorsRes.rows || [];

    // 연차 목록 스캔 (테넌트 격리)
    const filters: Record<string, string> = {};
    if (statusFilter) {
      filters.status = statusFilter;
    }
    if (!isGlobalSysAdmin) {
      filters.tenant_id = tenantId;
    }
    const leavesRes = await queryTable('crm_annual_leaves', { filters, orderBy: 'created_at', orderDirection: 'DESC' });
    const leavesList = leavesRes.rows || [];

    // 직원 이름 매핑 매칭
    const mappedLeaves = leavesList.map((leave: any) => {
      const emp = ops.find((o: any) => String(o.id) === String(leave.operator_id));
      const app = ops.find((o: any) => String(o.id) === String(leave.approver_id));
      return {
        ...leave,
        employee_name: emp ? emp.name : '알수없음',
        employee_number: emp ? emp.employee_number : null,
        approver_name: app ? app.name : null
      };
    });

    return NextResponse.json({
      success: true,
      leaves: mappedLeaves
    });

  } catch (error: any) {
    console.error('Leaves GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 신규 연차 신청 접수 및 결재 처리 (승인/반려)
 */
export async function POST(req: Request) {
  try {
    const { action, ...payload } = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }
    const sessionUser = decodeJwt(token);
    const operatorId = sessionUser.id as string;
    const tenantId = (sessionUser.tenant_id as string) || 'default';

    // 💡 [수정] 신규 연차 신청(APPLY)을 제외한 결재 심사(APPROVE/REJECT) 조작은 관리자 권한 필수 검증
    if (action !== 'APPLY') {
      const { isAuthorized } = await verifyUserRole();
      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: '🔒 권한이 없습니다. 결재 권한을 확인해 주세요.' }, { status: 403 });
      }
    }

    const now = new Date();

    // ==========================================
    // 📂 액션 1: 신규 연차 신청 (APPLY)
    // ==========================================
    if (action === 'APPLY') {
      const { leave_type, start_date, end_date, days_spent, reason, attachments } = payload;

      if (!leave_type || !start_date || !end_date || !days_spent) {
        return NextResponse.json({ success: false, error: '연차 신청서 필수 입력 항목이 누락되었습니다.' }, { status: 400 });
      }

      // 신청자의 잔여 연차 잔액 조회 (테넌트 격리)
      const balanceRes = await queryTable('crm_operator_leave_balances', { filters: { operator_id: operatorId, tenant_id: tenantId } });
      const balance = balanceRes.rows && balanceRes.rows.length > 0 ? balanceRes.rows[0] : null;

      if (balance && balance.remaining < parseFloat(days_spent)) {
        return NextResponse.json({ success: false, error: `잔여 연차가 부족합니다. (신청: ${days_spent}일, 잔여: ${balance.remaining}일)` }, { status: 400 });
      }

      const newLeaveId = `leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const uploadedFileUrls: string[] = [];
      const attachmentNames: string[] = [];

      // 📂 증빙 서류/사진 업로드 처리 (uploadFile 헬퍼 활용)
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          if (att.base64 && att.name) {
            try {
              const uploadRes = await uploadFile('crm_annual_leaves', newLeaveId as any, 'attachment_url', att.name, att.base64);
              if (uploadRes && uploadRes.fileUrl) {
                uploadedFileUrls.push(uploadRes.fileUrl);
                attachmentNames.push(att.name);
              }
            } catch (upErr) {
              console.error('[Leave API] File upload failed:', upErr);
            }
          }
        }
      }

      const newLeave = {
        id: newLeaveId,
        operator_id: operatorId,
        leave_type,
        start_date,
        end_date,
        days_spent: parseFloat(days_spent),
        status: 'PENDING',
        reason: reason || '',
        attachment_url: uploadedFileUrls.length > 0 ? uploadedFileUrls.join(',') : null,
        attachment_name: attachmentNames.length > 0 ? attachmentNames.join(',') : null,
        reject_reason: null,
        approver_id: null,
        tenant_id: tenantId,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await insertRows('crm_annual_leaves', [newLeave]);

      return NextResponse.json({
        success: true,
        message: '연차 휴가 신청서가 성공적으로 접수되었습니다. 결재 대기 중입니다 📝',
        leave: newLeave
      });
    }

    // ==========================================
    // 📂 액션 2: 결재 심사 처리 (APPROVE 또는 REJECT)
    // ==========================================
    if (action === 'APPROVE' || action === 'REJECT') {
      const { leave_id, reject_reason } = payload;

      if (!leave_id) {
        return NextResponse.json({ success: false, error: '심사할 연차 신청서 ID가 누락되었습니다.' }, { status: 400 });
      }

      // 최고관리자/대표자 권한 가드
      if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
        return NextResponse.json({ success: false, error: '연차 결재 승인/반려 권한이 없습니다. 최고운영자 권한으로 신청해 주세요.' }, { status: 403 });
      }

      // 연차 원본 서류 스캔 (테넌트 격리)
      const leaveRes = await queryTable('crm_annual_leaves', { filters: { id: leave_id, tenant_id: tenantId } });
      const leaveDoc = leaveRes.rows && leaveRes.rows.length > 0 ? leaveRes.rows[0] : null;

      if (!leaveDoc) {
        return NextResponse.json({ success: false, error: '해당 연차 신청 내역을 찾을 수 없습니다.' }, { status: 404 });
      }

      if (leaveDoc.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: '이미 심사 처리가 종결된 연차 신청서입니다.' }, { status: 400 });
      }

      // 승인 처리 분기
      if (action === 'APPROVE') {
        // (1) 해당 직원의 잔여 연차 잔고 조회 (테넌트 격리)
        const empBalanceRes = await queryTable('crm_operator_leave_balances', { filters: { operator_id: leaveDoc.operator_id, tenant_id: tenantId } });
        const empBal = empBalanceRes.rows && empBalanceRes.rows.length > 0 ? empBalanceRes.rows[0] : null;

        if (empBal) {
          const updatedUsed = empBal.used + leaveDoc.days_spent;
          const updatedRemaining = Math.max(0, empBal.total_allowed - updatedUsed);

          await updateRows('crm_operator_leave_balances', {
            used: updatedUsed,
            remaining: updatedRemaining,
            updated_at: now.toISOString()
          }, { filters: { operator_id: leaveDoc.operator_id, tenant_id: tenantId } });
        }

        // (2) 신청 기간 날짜별로 crm_attendance 대장에 status = 'LEAVE' 플래그 스케줄 자동 적재
        const start = new Date(leaveDoc.start_date);
        const end = new Date(leaveDoc.end_date);
        const attendanceRows: any[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          attendanceRows.push({
            id: `att-leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            operator_id: leaveDoc.operator_id,
            work_date: dateStr,
            clock_in: null,
            clock_out: null,
            status: 'LEAVE',
            working_hours: 0,
            memo: `공식 연차 휴가 승인 연동 (${leaveDoc.reason || '휴가'})`,
            tenant_id: tenantId,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          });
        }

        if (attendanceRows.length > 0) {
          await insertRows('crm_attendance', attendanceRows).catch(e => console.error('근태 대장 휴가 백필 실패:', e));
        }

        // (3) 연차 신청 상태 승인으로 업데이트 (테넌트 격리)
        await updateRows('crm_annual_leaves', {
          status: 'APPROVED',
          approver_id: operatorId,
          updated_at: now.toISOString()
        }, { filters: { id: leave_id, tenant_id: tenantId } });

        // (4) 🚨 [병가 연동 파이프라인] 승인된 휴가가 '병가' 계열인 경우 360도 병가/의료 대장에 자동 적재 (테넌트 격리)
        try {
          const leaveType = (leaveDoc.leave_type || '').trim();
          const isSickLeave = leaveType === '병가' || leaveType === '질병휴가' || leaveType.toLowerCase().includes('sick');

          if (isSickLeave) {
            const medId = `med-auto-${Date.now()}`;
            await insertRows('crm_operator_medical', [{
              id: medId,
              operator_id: String(leaveDoc.operator_id),
              diagnosis_name: leaveDoc.reason || '병가 요양 (근태 연동)',
              treatment_start_date: leaveDoc.start_date,
              treatment_end_date: leaveDoc.end_date,
              hospital_name: '사내 근태 승인 연동',
              sick_leave_days: Number(leaveDoc.days_spent) || 0,
              work_limitations: '없음',
              tenant_id: tenantId
            }]);
            console.log(`[Medical Link] 근태 휴가(병가) 승인 연동으로 360도 의료대장에 자동 등록되었습니다. 직원 ID: ${leaveDoc.operator_id}, 기간: ${leaveDoc.start_date} ~ ${leaveDoc.end_date}, 일수: ${leaveDoc.days_spent}일`);
          }
        } catch (medLinkError) {
          console.error('[Medical Link] Failed to auto-insert medical history:', medLinkError);
        }

        return NextResponse.json({
          success: true,
          message: '연차 휴가 신청서가 성공적으로 승인 처리되었습니다. 전사 근태 캘린더에 휴가 일정이 자동 연동 동기화되었습니다 🟢'
        });
      }

      // 반려 처리 분기
      if (action === 'REJECT') {
        if (!reject_reason) {
          return NextResponse.json({ success: false, error: '반려 처리 시에는 반려 사유를 필히 기입해 주셔야 합니다.' }, { status: 400 });
        }

        await updateRows('crm_annual_leaves', {
          status: 'REJECTED',
          reject_reason,
          approver_id: operatorId,
          updated_at: now.toISOString()
        }, { filters: { id: leave_id, tenant_id: tenantId } });

        return NextResponse.json({
          success: true,
          message: '연차 휴가 신청이 공식 반려 처리되었습니다 🔴'
        });
      }
    }

    return NextResponse.json({ success: false, error: '올바르지 않은 요청 액션입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Leaves POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
