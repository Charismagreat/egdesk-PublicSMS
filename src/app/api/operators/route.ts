export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../egdesk-helpers';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

async function getAuthInfoFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { role: 'SUB_OPERATOR', username: '', isAllowed: false };
  try {
    const payload = decodeJwt(token);
    const role = String(payload.role || '').toUpperCase();
    const username = String(payload.username || '').toLowerCase();
    const isAllowed = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'TENANT_ADMIN', 'PRESIDENT', 'GUEST', 'ADMIN'].includes(role) || username === 'admin' || username === 'guest';
    return { role, username, isAllowed };
  } catch (e) {
    return { role: 'SUB_OPERATOR', username: '', isAllowed: false };
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthInfoFromToken();
    if (!auth.isAllowed) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const result = await queryTable('crm_operators');
    // 전체 임직원 목록 (admin 계정은 SYSTEM_ADMIN 역할 보정, deleted_at 포함)
    const allOps = (result.rows || []).map((op: any) => {
      if (op.username === 'admin') {
        return { ...op, role: 'SYSTEM_ADMIN' };
      }
      return op;
    });

    return NextResponse.json({ success: true, operators: allOps });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthInfoFromToken();
    if (!auth.isAllowed) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { username, password, name, newRole, employee_number, phone, tenant_id } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json({ success: false, error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // Check if user exists (소프트 삭제 안 된 사용자 중 중복 검사)
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

    // 중복 체크 (소프트 삭제 안 된 사용자 기준)
    const existingEmpNum = await queryTable('crm_operators', { filters: { employee_number: finalEmpNumber } });
    const activeEmpNum = (existingEmpNum.rows || []).filter((op: any) => !op.deleted_at);
    if (activeEmpNum.length > 0) {
      return NextResponse.json({ success: false, error: '이미 존재하는 사원번호입니다.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const dateStr = new Date().toISOString();
    const newOpId = Date.now();

    // 테넌트 식별자 결정 (대표 역할인데 미입력 시 고유 테넌트 ID 자동 발급)
    const isOwnerRole = ['SUPER_ADMIN', 'TENANT_ADMIN', 'PRESIDENT'].includes(String(newRole || '').toUpperCase());
    let finalTenantId = (tenant_id || '').trim();
    if (isOwnerRole && !finalTenantId) {
      finalTenantId = 'tenant-' + Math.random().toString(36).substring(2, 10);
    }

    // 1. 임직원 마스터 등록
    await insertRows('crm_operators', [{
      id: newOpId,
      username,
      password_hash,
      name,
      role: newRole || 'SUB_OPERATOR',
      employee_number: finalEmpNumber,
      phone: (phone || '').trim(),
      tenant_id: finalTenantId || null,
      created_at: dateStr
    }]);

    // 2. [온보딩 자동화] 신규 입사자 최초 연차 15일 자동 부여
    await insertRows('crm_operator_leave_balances', [{
      operator_id: String(newOpId),
      total_allowed: 15.0,
      used: 0.0,
      remaining: 15.0,
      updated_at: dateStr
    }]);

    // 3. [온보딩 자동화] 웰컴 알림 톡 발송 예약
    if (phone && phone.trim() !== '') {
      const welcomeContent = `[EGDesk] ${name}님의 입사를 환영합니다! 🎉\n사원번호: ${finalEmpNumber}\n임시 비밀번호: ${password}\n접속 URL: http://localhost:4000/login\n첫 온보딩 단계를 진행해 주세요.`;
      await insertRows('message_logs', [{
        id: `MSG-${Date.now()}`,
        sender: '02-1234-5678',
        receiver: phone.trim(),
        content: welcomeContent,
        status: 'PENDING',
        created_at: dateStr
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('사원 등록 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthInfoFromToken();
    if (!auth.isAllowed) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is missing' }, { status: 400 });
    }

    // prevent deleting admin
    const op = await queryTable('crm_operators', { filters: { id } });
    if (op.rows && op.rows.length > 0 && op.rows[0].username === 'admin') {
       return NextResponse.json({ success: false, error: '기본 관리자 계정은 삭제할 수 없습니다.' }, { status: 400 });
    }

    // 물리 삭제 대신 소프트 삭제(Soft Delete) 적용
    const dateStr = new Date().toISOString();
    await updateRows('crm_operators', {
      deleted_at: dateStr,
      deleted_by: auth.username || 'SUPER_ADMIN'
    }, { filters: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuthInfoFromToken();
    if (!auth.isAllowed) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, password, name, newRole, employee_number, phone, tenant_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID가 누락되었습니다.' }, { status: 400 });
    }

    // [복원(RESTORE) 액션 처리]
    if (action === 'RESTORE') {
      const targetRes = await queryTable('crm_operators', { filters: { id } });
      if (!targetRes.rows || targetRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '존재하지 않는 계정입니다.' }, { status: 404 });
      }
      const targetOp = targetRes.rows[0];

      // 직원의 경우 소속 테넌트의 대표(사장님)가 활성 상태인지 사전 검증
      const isOwner = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'TENANT_ADMIN', 'PRESIDENT', 'GUEST', 'ADMIN'].includes(String(targetOp.role || '').toUpperCase()) || targetOp.username === 'admin' || targetOp.username === 'guest';
      
      if (!isOwner && targetOp.tenant_id && targetOp.tenant_id.trim() !== '') {
        const allOpsRes = await queryTable('crm_operators');
        const allOps = allOpsRes.rows || [];
        const owners = allOps.filter((o: any) => {
          const r = String(o.role || '').toUpperCase();
          const u = String(o.username || '').toLowerCase();
          const oIsOwner = (['SUPER_ADMIN', 'TENANT_ADMIN', 'PRESIDENT', 'GUEST'].includes(r) || u === 'guest') && r !== 'SYSTEM_ADMIN' && u !== 'admin';
          return oIsOwner && o.tenant_id === targetOp.tenant_id;
        });

        const activeOwner = owners.find((o: any) => !o.deleted_at);
        if (!activeOwner) {
          const deletedOwner = owners.find((o: any) => Boolean(o.deleted_at));
          const ownerDesc = deletedOwner ? `${deletedOwner.name} 사장님 (${deletedOwner.username})` : '대표 사장님';
          return NextResponse.json({ 
            success: false, 
            error: `소속 테넌트의 대표(${ownerDesc}) 계정이 현재 정지 상태입니다. 대표 계정부터 먼저 복원해 주세요.` 
          }, { status: 400 });
        }
      }

      const dateStr = new Date().toISOString();
      await updateRows('crm_operators', {
        deleted_at: null,
        deleted_by: null,
        restored_at: dateStr,
        restored_by: auth.username || 'SUPER_ADMIN'
      }, { filters: { id } });
      return NextResponse.json({ success: true, message: '성공적으로 복원되었습니다.' });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: '필수 항목(id, 이름)이 누락되었습니다.' }, { status: 400 });
    }

    // 기존 정보 조회
    const existing = await queryTable('crm_operators', { filters: { id } });
    if (!existing.rows || existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 직원입니다.' }, { status: 404 });
    }
    const currentOp = existing.rows[0];

    // admin 기본 관리자 권한 변경 제한
    if (currentOp.username === 'admin' && newRole && newRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '기본 관리자 계정의 권한 등급은 변경할 수 없습니다.' }, { status: 400 });
    }

    // 사원번호 검증 (admin 계정은 EMP-ADMIN 자동 보정)
    let finalEmpNumber = (employee_number || '').trim();
    if (currentOp.username === 'admin' && !finalEmpNumber) {
      finalEmpNumber = 'EMP-ADMIN';
    } else if (!finalEmpNumber) {
      return NextResponse.json({ success: false, error: '사원번호를 입력해주세요.' }, { status: 400 });
    }

    // 본인 제외 타인과 겹치는지 체크 (소프트 삭제되지 않은 활성 사원 기준)
    const allOpsRes = await queryTable('crm_operators', {});
    const allOps = (allOpsRes.rows || []).filter((op: any) => !op.deleted_at);
    const duplicate = allOps.some((op: any) => op.id !== Number(id) && op.employee_number === finalEmpNumber);
    if (duplicate) {
      return NextResponse.json({ success: false, error: '이미 존재하는 사원번호입니다.' }, { status: 400 });
    }

    const updates: any = {
      name,
      role: newRole || currentOp.role,
      employee_number: finalEmpNumber,
      phone: phone !== undefined ? (phone || '').trim() : currentOp.phone,
      tenant_id: tenant_id !== undefined ? (tenant_id ? tenant_id.trim() : null) : currentOp.tenant_id
    };

    // 비밀번호 변경 시 해싱
    if (password && password.trim() !== '') {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    await updateRows('crm_operators', updates, { filters: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
