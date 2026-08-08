export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '../../../../egdesk-helpers';
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
    
    // SYSTEM_ADMIN, TENANT_ADMIN, SUPER_ADMIN 및 부운영자(SUB_OPERATOR) 등급 허용
    const isAuthorized = role === 'SYSTEM_ADMIN' || role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR';
    
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
    
    // 2. 소프트 삭제(deleted_at)되지 않은 활성 임직원 중 SYSTEM_ADMIN 제외 필터링
    const activeOps = (result.rows || []).filter((op: any) => {
      if (op.deleted_at) return false;
      if (op.role === 'SYSTEM_ADMIN' || op.username === 'admin') return false;
      return true;
    });

    return NextResponse.json({ success: true, employees: activeOps });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 📥 [POST] 테넌트 격리형 신규 직원 등록 및 퇴사자 재등록/복원 처리 (연차 자동 부여 및 알림톡)
export async function POST(req: Request) {
  try {
    const { isAuthorized, name: operatorName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action;
    const nowStr = new Date().toISOString();

    // 💡 [신규/재등록] 직원 엑셀 일괄 등록 처리
    if (action === 'batch_register') {
      const { employees = [] } = body;
      if (!Array.isArray(employees) || employees.length === 0) {
        return NextResponse.json({ success: false, error: '등록할 직원 데이터가 없습니다.' }, { status: 400 });
      }

      const allExistingRes = await queryTable('crm_operators', { limit: 5000 });
      const allRows = allExistingRes.rows || [];
      
      // username 기준으로 DB 레코드 맵 구성
      const opMapByUsername = new Map<string, any>();
      allRows.forEach((op: any) => {
        opMapByUsername.set(op.username, op);
      });

      const rowsToInsert: any[] = [];
      const leaveRowsToInsert: any[] = [];
      let successCount = 0;

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const { username, password, name, role, employee_number, phone, department, work_start_time, work_end_time } = emp;
        if (!username || !name) continue;

        const existingOp = opMapByUsername.get(username);
        const finalEmpNumber = (employee_number || `EMP-${Date.now() % 10000 + i}`).trim();
        const pwdHash = await bcrypt.hash(password || '1234', 10);

        if (existingOp) {
          // 이미 활성(active) 상태인 사용자는 스킵
          if (!existingOp.deleted_at) continue;

          // 🔄 소프트 삭제되었던 직원이면 복원(Restored) 및 업데이트 처리
          await updateRows('crm_operators', {
            name,
            password_hash: pwdHash,
            role: role || 'EMPLOYEE',
            employee_number: finalEmpNumber,
            phone: (phone || '').trim(),
            department: (department || '').trim(),
            work_start_time: work_start_time || '09:00:00',
            work_end_time: work_end_time || '18:00:00',
            tenant_id: tenantId,
            deleted_at: null,
            deleted_by: null,
            restored_at: nowStr,
            restored_by: operatorName
          }, { filters: { id: String(existingOp.id) } });

          successCount++;
        } else {
          // 🆕 완전 신규 사용자 생성
          const newOpId = Date.now() + i;

          rowsToInsert.push({
            id: newOpId,
            username,
            password_hash: pwdHash,
            name,
            role: role || 'EMPLOYEE',
            employee_number: finalEmpNumber,
            phone: (phone || '').trim(),
            department: (department || '').trim(),
            work_start_time: work_start_time || '09:00:00',
            work_end_time: work_end_time || '18:00:00',
            created_at: nowStr,
            tenant_id: tenantId
          });

          leaveRowsToInsert.push({
            operator_id: String(newOpId),
            total_allowed: 15.0,
            used: 0.0,
            remaining: 15.0,
            year: new Date().getFullYear(),
            created_at: nowStr,
            tenant_id: tenantId
          });

          opMapByUsername.set(username, { username, deleted_at: null });
          successCount++;
        }
      }

      if (rowsToInsert.length > 0) {
        await insertRows('crm_operators', rowsToInsert);
        await insertRows('crm_operator_leave_balances', leaveRowsToInsert);
      }

      return NextResponse.json({
        success: true,
        count: successCount,
        message: `🎉 총 ${successCount}명의 직원 계정이 성공적으로 등록(복원)되었습니다.`
      });
    }

    // 💡 [신규/재등록] 단일 직원 등록 처리
    const { username, password, name, newRole, employee_number, phone, department, workplace_id, work_start_time, work_end_time } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ success: false, error: '모든 필수 필드(아이디, 비밀번호, 이름)를 입력해주세요.' }, { status: 400 });
    }

    const finalEmpNumber = (employee_number || '').trim();
    if (!finalEmpNumber) {
      return NextResponse.json({ success: false, error: '사원번호를 입력해주세요.' }, { status: 400 });
    }

    // 1. 아이디(username) 기준 기존 DB 사용자 조회
    const existingRes = await queryTable('crm_operators', { filters: { username } });
    const existingOp = existingRes.rows && existingRes.rows.length > 0 ? existingRes.rows[0] : null;

    // 이미 다른 활성 직원이 사용 중인 아이디면 중복 차단
    if (existingOp && !existingOp.deleted_at) {
      return NextResponse.json({ success: false, error: '이미 사용 중인 활성 아이디입니다.' }, { status: 400 });
    }

    // 2. 사원번호 본인 매장(테넌트) 내 활성 유저 중복 체크
    const queryFilters: any = { employee_number: finalEmpNumber };
    if (loggedUsername !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }
    const existingEmpNumRes = await queryTable('crm_operators', { filters: queryFilters });
    const activeEmpNumOps = (existingEmpNumRes.rows || []).filter((op: any) => !op.deleted_at && op.username !== username);
    if (activeEmpNumOps.length > 0) {
      return NextResponse.json({ success: false, error: '매장 내에 이미 활성화된 동일 사원번호가 존재합니다.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // 🔄 과거 소프트 삭제(퇴사)된 직원의 계정이면 복원(Restored) 및 업데이트
    if (existingOp && existingOp.deleted_at) {
      await updateRows('crm_operators', {
        name,
        password_hash,
        role: newRole || 'EMPLOYEE',
        employee_number: finalEmpNumber,
        phone: (phone || '').trim(),
        department: (department || '').trim(),
        workplace_id: workplace_id ? Number(workplace_id) : null,
        work_start_time: work_start_time || '09:00:00',
        work_end_time: work_end_time || '18:00:00',
        tenant_id: tenantId,
        deleted_at: null,
        deleted_by: null,
        restored_at: nowStr,
        restored_by: operatorName
      }, { filters: { id: String(existingOp.id) } });

      return NextResponse.json({ 
        success: true, 
        isRestored: true, 
        message: '퇴사 처리되었던 기존 계정이 성공적으로 재등록(복원)되었습니다.' 
      });
    }

    // 🆕 완전 신규 직원 등록
    const newOpId = Date.now();

    await insertRows('crm_operators', [{
      id: newOpId,
      username,
      password_hash,
      name,
      role: newRole || 'EMPLOYEE',
      employee_number: finalEmpNumber,
      phone: (phone || '').trim(),
      department: (department || '').trim(),
      workplace_id: workplace_id ? Number(workplace_id) : null,
      work_start_time: work_start_time || '09:00:00',
      work_end_time: work_end_time || '18:00:00',
      created_at: nowStr,
      tenant_id: tenantId
    }]);

    // 연차 15일 자동 부여
    await insertRows('crm_operator_leave_balances', [{
      operator_id: String(newOpId),
      total_allowed: 15.0,
      used: 0.0,
      remaining: 15.0,
      updated_at: nowStr
    }]);

    // 웰컴 메시지 등록
    if (phone && phone.trim() !== '') {
      const welcomeContent = `[EGDesk] ${name}님의 입사를 환영합니다! 🎉\n사원번호: ${finalEmpNumber}\n임시 비밀번호: ${password}\n접속 URL: http://localhost:4000/login\n첫 온보딩 단계를 진행해 주세요.`;
      await insertRows('message_logs', [{
        id: `MSG-${Date.now()}`,
        sender: '02-1234-5678',
        receiver: phone.trim(),
        content: welcomeContent,
        status: 'PENDING',
        created_at: nowStr,
        tenant_id: tenantId
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('사원 등록/복원 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✕ [DELETE] 직원 소프트 삭제 (단일 및 복수 일괄 삭제 지원, 본인 삭제 시도 차단 가드 포함)
export async function DELETE(req: Request) {
  try {
    const { isAuthorized, name: operatorName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let idsParam = searchParams.get('id') || searchParams.get('ids');

    if (!idsParam) {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsParam = body.ids.join(',');
        } else if (body.id) {
          idsParam = String(body.id);
        }
      } catch (e) {
        // Body 없음
      }
    }

    if (!idsParam) {
      return NextResponse.json({ success: false, error: '삭제할 대상 ID가 누락되었습니다.' }, { status: 400 });
    }

    const targetIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 대상 ID가 올바르지 않습니다.' }, { status: 400 });
    }

    let deletedCount = 0;
    const dateStr = new Date().toISOString();

    for (const targetId of targetIds) {
      // 1. 대상 사용자 유효성 및 테넌트 소속 여부 선 조회
      const opRes = await queryTable('crm_operators', { filters: { id: targetId } });
      if (!opRes.rows || opRes.rows.length === 0) continue;
      const currentOp = opRes.rows[0];

      // 타 테넌트 직원 무단 삭제 보안 차단
      if (loggedUsername !== 'admin' && currentOp.tenant_id !== tenantId) continue;

      // 2. 기본 최고관리자 admin 삭제 제한 및 본인 스스로 삭제 제한 가드
      if (currentOp.username === 'admin' || currentOp.username === loggedUsername) continue;

      // 3. 소프트 삭제(Soft Delete) 갱신 실행
      const updateFilters: any = { id: String(targetId) };
      if (loggedUsername !== 'admin') {
        updateFilters.tenant_id = tenantId;
      }

      await updateRows('crm_operators', {
        deleted_at: dateStr,
        deleted_by: operatorName
      }, { filters: updateFilters });

      deletedCount++;
    }

    return NextResponse.json({ success: true, count: deletedCount });
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

    const { id, password, name, newRole, employee_number, phone, department, workplace_id, work_start_time, work_end_time } = await req.json();

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
      phone: phone !== undefined ? (phone || '').trim() : currentOp.phone,
      department: department !== undefined ? (department || '').trim() : currentOp.department,
      workplace_id: workplace_id !== undefined ? (workplace_id ? Number(workplace_id) : null) : currentOp.workplace_id,
      work_start_time: work_start_time !== undefined ? work_start_time : currentOp.work_start_time,
      work_end_time: work_end_time !== undefined ? work_end_time : currentOp.work_end_time
    };

    // 비밀번호 변경 입력 시 해싱
    if (password && password.trim() !== '') {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const updateFilters: any = { id: String(id) };
    if (loggedUsername !== 'admin') {
      updateFilters.tenant_id = tenantId;
    }

    await updateRows('crm_operators', updates, { filters: updateFilters });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
