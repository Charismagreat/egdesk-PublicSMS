export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../egdesk-helpers';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

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
    
    // 최고관리자(SUPER_ADMIN) 및 부운영자(SUB_OPERATOR) 등급 허용
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR';
    
    return {
      isAuthorized,
      role,
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

// 📂 [GET] 해당 테넌트에 속하는 소프트 삭제되지 않은 활성 임직원 목록 조회
export async function GET(req: Request) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 1. 전체 임직원 중 해당 테넌트 소속 데이터 쿼리
    const queryFilters: any = {};
    if (username !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }

    const result = await queryTable('crm_operators', { filters: queryFilters });
    
    // 2. 소프트 삭제(deleted_at)되지 않은 활성 임직원만 필터링
    const activeOps = (result.rows || []).filter((op: any) => !op.deleted_at);

    return NextResponse.json({ success: true, employees: activeOps });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 📥 [POST] 테넌트 격리형 신규 직원 등록 (연차 자동 지급 및 알림톡 발송 스케줄)
export async function POST(req: Request) {
  try {
    const { isAuthorized, name: operatorName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { username, password, name, newRole, employee_number, phone } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json({ success: false, error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 1. 아이디(username) 전역 중복 검증 (로그인 계정 고유성 보장)
    const existing = await queryTable('crm_operators', { filters: { username } });
    const activeExisting = (existing.rows || []).filter((op: any) => !op.deleted_at);
    if (activeExisting.length > 0) {
      return NextResponse.json({ success: false, error: '이미 존재하는 아이디입니다.' }, { status: 400 });
    }

    // 사원번호 검증
    const finalEmpNumber = (employee_number || '').trim();
    if (!finalEmpNumber) {
      return NextResponse.json({ success: false, error: '사원번호를 입력해주세요.' }, { status: 400 });
    }

    // 2. 사원번호 본인 매장(테넌트) 내 중복 체크
    const queryFilters: any = { employee_number: finalEmpNumber };
    if (loggedUsername !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }
    const existingEmpNum = await queryTable('crm_operators', { filters: queryFilters });
    const activeEmpNum = (existingEmpNum.rows || []).filter((op: any) => !op.deleted_at);
    if (activeEmpNum.length > 0) {
      return NextResponse.json({ success: false, error: '매장 내에 이미 존재하는 사원번호입니다.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const dateStr = new Date().toISOString();
    const newOpId = Date.now();

    // 3. 임직원 마스터 등록 (tenantId 연동 주입)
    await insertRows('crm_operators', [{
      id: newOpId,
      username,
      password_hash,
      name,
      role: newRole || 'EMPLOYEE',
      employee_number: finalEmpNumber,
      phone: (phone || '').trim(),
      created_at: dateStr,
      tenant_id: tenantId
    }]);

    // 4. [온보딩 자동화] 신규 입사자 최초 연차 15일 자동 부여
    await insertRows('crm_operator_leave_balances', [{
      operator_id: String(newOpId),
      total_allowed: 15.0,
      used: 0.0,
      remaining: 15.0,
      updated_at: dateStr
    }]);

    // 5. [온보딩 자동화] 웰컴 알림 문자 발송 예약 (테넌트 ID 매핑)
    if (phone && phone.trim() !== '') {
      const welcomeContent = `[EGDesk] ${name}님의 입사를 환영합니다! 🎉\n사원번호: ${finalEmpNumber}\n임시 비밀번호: ${password}\n접속 URL: http://localhost:4000/login\n첫 온보딩 단계를 진행해 주세요.`;
      await insertRows('message_logs', [{
        id: `MSG-${Date.now()}`,
        sender: '02-1234-5678',
        receiver: phone.trim(),
        content: welcomeContent,
        status: 'PENDING',
        created_at: dateStr,
        tenant_id: tenantId
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('사원 등록 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✕ [DELETE] 직원 소프트 삭제 (본인 삭제 시도 차단 가드 포함)
export async function DELETE(req: Request) {
  try {
    const { isAuthorized, name: operatorName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 대상 ID가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 대상 사용자 유효성 및 테넌트 소속 여부 선 조회
    const opRes = await queryTable('crm_operators', { filters: { id } });
    if (!opRes.rows || opRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 사용자입니다.' }, { status: 404 });
    }
    const currentOp = opRes.rows[0];

    // 타 테넌트 직원 무단 삭제 보안 차단
    if (loggedUsername !== 'admin' && currentOp.tenant_id !== tenantId) {
      return NextResponse.json({ success: false, error: '삭제 권한이 없는 대상입니다.' }, { status: 403 });
    }

    // 2. 기본 최고관리자 admin 삭제 제한 및 본인 스스로 삭제 제한 가드
    if (currentOp.username === 'admin') {
      return NextResponse.json({ success: false, error: '기본 시스템 최고관리자 계정은 삭제할 수 없습니다.' }, { status: 400 });
    }
    if (currentOp.username === loggedUsername) {
      return NextResponse.json({ success: false, error: '보안 정책 경고: 자기 자신(매장 오너) 계정은 리스트에서 직접 퇴사 처리할 수 없습니다.' }, { status: 400 });
    }

    // 3. 소프트 삭제(Soft Delete) 갱신 실행
    const dateStr = new Date().toISOString();
    
    const updateFilters: any = { id };
    if (loggedUsername !== 'admin') {
      updateFilters.tenant_id = tenantId;
    }

    await updateRows('crm_operators', {
      deleted_at: dateStr,
      deleted_by: operatorName
    }, { filters: updateFilters });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✏️ [PUT] 테넌트 격리 기반 임직원 정보 수정 (비밀번호 리셋 기능 포함)
export async function PUT(req: Request) {
  try {
    const { isAuthorized, name: operatorName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, password, name, newRole, employee_number, phone } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ success: false, error: '필수 항목(id, 이름)이 누락되었습니다.' }, { status: 400 });
    }

    // 1. 기존 정보 및 테넌트 소속 여부 조회
    const existing = await queryTable('crm_operators', { filters: { id } });
    if (!existing.rows || existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 직원입니다.' }, { status: 404 });
    }
    const currentOp = existing.rows[0];

    // 타 테넌트 직원 무단 수정 보안 차단
    if (loggedUsername !== 'admin' && currentOp.tenant_id !== tenantId) {
      return NextResponse.json({ success: false, error: '수정 권한이 없는 대상입니다.' }, { status: 403 });
    }

    // admin 기본 관리자 권한 변경 제한
    if (currentOp.username === 'admin' && newRole && newRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '시스템 관리자 계정의 권한 등급은 변경할 수 없습니다.' }, { status: 400 });
    }

    // 매장 오너(본인) 등급 강등 제한 가드
    if (currentOp.username === loggedUsername && newRole && newRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '본인 매장 오너 계정의 권한 등급은 강등할 수 없습니다.' }, { status: 400 });
    }

    // 사원번호 검증
    const finalEmpNumber = (employee_number || '').trim();
    if (!finalEmpNumber) {
      return NextResponse.json({ success: false, error: '사원번호를 입력해주세요.' }, { status: 400 });
    }

    // 2. 본인 제외 타인과 사원번호가 겹치는지 체크 (본인 매장 내부 활성 사원 기준)
    const allOpsRes = await queryTable('crm_operators', { filters: { tenant_id: tenantId } });
    const allOps = (allOpsRes.rows || []).filter((op: any) => !op.deleted_at);
    const duplicate = allOps.some((op: any) => op.id !== Number(id) && op.employee_number === finalEmpNumber);
    if (duplicate) {
      return NextResponse.json({ success: false, error: '매장 내에 이미 존재하는 사원번호입니다.' }, { status: 400 });
    }

    const updates: any = {
      name,
      role: newRole || currentOp.role,
      employee_number: finalEmpNumber,
      phone: phone !== undefined ? (phone || '').trim() : currentOp.phone
    };

    // 비밀번호 변경 입력 시 해싱
    if (password && password.trim() !== '') {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const updateFilters: any = { id };
    if (loggedUsername !== 'admin') {
      updateFilters.tenant_id = tenantId;
    }

    await updateRows('crm_operators', updates, { filters: updateFilters });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
