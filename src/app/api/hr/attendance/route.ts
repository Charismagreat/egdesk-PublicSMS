export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  createTable,
  queryTable,
  insertRows,
  updateRows,
  getTableSchema,
  executeSQL
} from '../../../../../egdesk-helpers';

/**
  * 🛡️ HR 데이터베이스 자율 마이그레이션 (Self-Healing Auto-Migration)
  */
async function initHrDatabase() {
  try {
    // 테이블 존재 여부 확인 차원 쿼리 (실패하면 테이블이 없는 것)
    await queryTable('crm_attendance', { limit: 1 }).catch(async () => {
      console.log('HR 근태 관련 테이블이 발견되지 않아 자율 생성을 시작합니다...');
      
      // 1. crm_attendance 테이블 신설
      await createTable('직원 근태 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'work_date', type: 'TEXT', notNull: true },
        { name: 'clock_in', type: 'TEXT' },
        { name: 'clock_out', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true }, // NORMAL, LATE, EARLY_LEAVE, ABSENT, LEAVE
        { name: 'working_hours', type: 'REAL', defaultValue: 0 },
        { name: 'memo', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_attendance',
        uniqueKeyColumns: ['id']
      });

      // 2. crm_annual_leaves 테이블 신설
      await createTable('직원 연차 신청 결재 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'leave_type', type: 'TEXT', notNull: true }, // ANNUAL, HALF, SICK, SPECIAL
        { name: 'start_date', type: 'TEXT', notNull: true },
        { name: 'end_date', type: 'TEXT', notNull: true },
        { name: 'days_spent', type: 'REAL', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true }, // PENDING, APPROVED, REJECTED
        { name: 'reason', type: 'TEXT' },
        { name: 'reject_reason', type: 'TEXT' },
        { name: 'approver_id', type: 'TEXT' },
        { name: 'medical_certificate_path', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_annual_leaves',
        uniqueKeyColumns: ['id']
      });

      // 3. crm_operator_leave_balances 테이블 신설
      await createTable('직원별 연차 잔액 관리', [
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'total_allowed', type: 'REAL', defaultValue: 15 },
        { name: 'used', type: 'REAL', defaultValue: 0 },
        { name: 'remaining', type: 'REAL', defaultValue: 15 },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_operator_leave_balances',
        uniqueKeyColumns: ['operator_id']
      });

      // 4. crm_company_events 테이블 신설
      await createTable('전사 회사 일정 공유 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'start_date', type: 'TEXT', notNull: true },
        { name: 'end_date', type: 'TEXT', notNull: true },
        { name: 'event_type', type: 'TEXT', notNull: true }, // COMPANY_EVENT, HOLIDAY, DEPT_EVENT
        { name: 'description', type: 'TEXT' },
        { name: 'created_by', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_company_events',
        uniqueKeyColumns: ['id']
      });

      // 5. 기존 운영자 연차Balances 백필 적재 (Backfill)
      const operatorsRes = await queryTable('crm_operators');
      const ops = operatorsRes.rows || [];
      if (ops.length > 0) {
        const balanceRows = ops.map((op: any) => ({
          operator_id: op.id,
          total_allowed: 15.0,
          used: 0.0,
          remaining: 15.0,
          tenant_id: op.tenant_id || 'default',
          updated_at: new Date().toISOString()
        }));
        await insertRows('crm_operator_leave_balances', balanceRows).catch(e => console.error(e));
        console.log(`✓ 직원 ${ops.length}명 연차 balances 기본 백필 완료`);
      }

      // 6. 데모용 회사 일정 데이터 2건 적재
      const demoEvents = [
        {
          id: 'demo-event-1',
          title: '전사 정기 워크숍 🚌',
          start_date: '2026-06-12',
          end_date: '2026-06-13',
          event_type: 'COMPANY_EVENT',
          description: '전사 화합을 위한 가평 정기 워크숍입니다.',
          created_by: 'system',
          tenant_id: 'default',
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-event-2',
          title: '주요 프로젝트 납품 마감일 🚨',
          start_date: '2026-06-15',
          end_date: '2026-06-15',
          event_type: 'COMPANY_EVENT',
          description: 'B2B 거래처 최종 납품 기한일입니다.',
          created_by: 'system',
          tenant_id: 'default',
          created_at: new Date().toISOString()
        }
      ];
      await insertRows('crm_company_events', demoEvents).catch(e => console.error(e));
      console.log('✓ 데모 회사 공유 일정 데이터 적재 성공');
    });

    // crm_annual_leaves 테이블 medical_certificate_path 컬럼 추가 자율 마이그레이션 (자가치유)
    try {
      const schemaInfo = await getTableSchema('crm_annual_leaves');
      const columns = schemaInfo.columns || [];
      const colNames = columns.map((c: any) => c.name);
      
      if (!colNames.includes('medical_certificate_path')) {
        await executeSQL("ALTER TABLE crm_annual_leaves ADD COLUMN medical_certificate_path TEXT;");
        console.log('✓ In-app migration: added medical_certificate_path to crm_annual_leaves via executeSQL');
      }
    } catch (err: any) {
      console.error('⚠️ HR In-app migration error:', err.message);
    }

    // crm_operators 테이블 work_start_time, work_end_time 컬럼 추가 자율 마이그레이션 (자가치유)
    try {
      const opSchemaInfo = await getTableSchema('crm_operators');
      const opColumns = opSchemaInfo.columns || [];
      const opColNames = opColumns.map((c: any) => c.name);
      
      if (!opColNames.includes('work_start_time')) {
        await executeSQL("ALTER TABLE crm_operators ADD COLUMN work_start_time TEXT DEFAULT '09:00:00';");
        console.log('✓ In-app migration: added work_start_time to crm_operators via executeSQL');
      }
      if (!opColNames.includes('work_end_time')) {
        await executeSQL("ALTER TABLE crm_operators ADD COLUMN work_end_time TEXT DEFAULT '18:00:00';");
        console.log('✓ In-app migration: added work_end_time to crm_operators via executeSQL');
      }
    } catch (err: any) {
      console.error('⚠️ Operators In-app migration error:', err.message);
    }
  } catch (err) {
    console.error('HR 데이터베이스 자율 마이그레이션 처리 실패:', err);
  }
}

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
    // SYSTEM_ADMIN, TENANT_ADMIN, SUPER_ADMIN 및 일반 사원/임직원 전원 허용
    const isAuthorized = role === 'SYSTEM_ADMIN' || role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR' || role === 'EMPLOYEE' || role === 'MEMBER' || !!username;
    return { isAuthorized, role, name, username, tenantId };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

/**
 * 전사 근태 리스트 및 오늘 자의 실시간 근태 현황 조회
 */
export async function GET(req: Request) {
  try {
    // 1. DB 자가 치유 가드 기동
    await initHrDatabase();

    const { searchParams } = new URL(req.url);
    const workDate = searchParams.get('work_date') || new Date().toISOString().split('T')[0];

    const { isAuthorized, role: userRole, name: loggedName, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 1. 직원 마스터 목록 스캔 (소프트 삭제 배제, 테넌트 격리, SYSTEM_ADMIN 차단)
    const queryFilters: any = { is_active: '1' };
    if (loggedUsername !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }
    const operatorsRes = await queryTable('crm_operators', { filters: queryFilters });
    const employees = (operatorsRes.rows || []).filter((emp: any) => {
      if (emp.deleted_at) return false;
      // 최상위 시스템 운영자(SYSTEM_ADMIN, admin 계정)는 직원 명부 및 급여 계산에서 완벽히 배제
      if (emp.role === 'SYSTEM_ADMIN' || emp.username === 'admin') return false;
      return true;
    });

    // 2. 당일 전원 근태 정보 스캔 (소프트 삭제 배제, 테넌트 격리)
    const attFilters: any = { work_date: workDate };
    if (loggedUsername !== 'admin') {
      attFilters.tenant_id = tenantId;
    }
    const attendanceRes = await queryTable('crm_attendance', { filters: attFilters });
    const attendanceList = (attendanceRes.rows || []).filter((a: any) => !a.deleted_at);

    // 3. 직원별 연차 현황 스캔 (소프트 삭제 배제, 테넌트 격리)
    const balFilters: any = {};
    if (loggedUsername !== 'admin') {
      balFilters.tenant_id = tenantId;
    }
    const balancesRes = await queryTable('crm_operator_leave_balances', { filters: balFilters });
    const balancesList = (balancesRes.rows || []).filter((b: any) => !b.deleted_at);

    // 4. 전사 공유 일정 스캔 (소프트 삭제 배제, 테넌트 격리)
    const eventFilters: any = {};
    if (loggedUsername !== 'admin') {
      eventFilters.tenant_id = tenantId;
    }
    const eventsRes = await queryTable('crm_company_events', { filters: eventFilters });
    const companyEvents = (eventsRes.rows || []).filter((e: any) => !e.deleted_at);

    // 5. 캘린더 종합 조회를 위해 전체 연차 내역(APPROVED 상태인 것) 스캔 (소프트 삭제 배제, 테넌트 격리)
    const leaveFilters: any = { status: 'APPROVED' };
    if (loggedUsername !== 'admin') {
      leaveFilters.tenant_id = tenantId;
    }
    const approvedLeavesRes = await queryTable('crm_annual_leaves', { filters: leaveFilters });
    const approvedLeaves = (approvedLeavesRes.rows || []).filter((l: any) => !l.deleted_at);

    // 6. 전체 근태 내역 스캔 (캘린더 매핑용) (소프트 삭제 배제, 테넌트 격리)
    const allAttFilters: any = {};
    if (loggedUsername !== 'admin') {
      allAttFilters.tenant_id = tenantId;
    }
    const allAttendanceRes = await queryTable('crm_attendance', { filters: allAttFilters });
    const allAttendance = (allAttendanceRes.rows || []).filter((a: any) => !a.deleted_at);

    // 직원 정보와 근태 상태 바인딩
    const mappedEmployees = employees.map((emp: any) => {
      const att = attendanceList.find((a: any) => String(a.operator_id) === String(emp.id));
      const bal = balancesList.find((b: any) => String(b.operator_id) === String(emp.id));

      return {
        id: emp.id,
        name: emp.name,
        username: emp.username,
        role: emp.role,
        employee_number: emp.employee_number,
        clock_in: att ? att.clock_in : null,
        clock_out: att ? att.clock_out : null,
        status: att ? att.status : 'ABSENT', // 기록 없으면 결근
        working_hours: att ? att.working_hours : 0,
        memo: att ? att.memo : '',
        total_allowed: bal ? bal.total_allowed : 15,
        remaining_leaves: bal ? bal.remaining : 15
      };
    });

    return NextResponse.json({
      success: true,
      employees: mappedEmployees,
      companyEvents,
      approvedLeaves,
      allAttendance,
      currentUser: { id: loggedUsername, name: loggedName, role: userRole }
    });

  } catch (error: any) {
    console.error('Attendance GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 원터치 출퇴근 타임스탬프 (스탬프 찍기)
 */
export async function POST(req: Request) {
  try {
    await initHrDatabase();

    const { action, memo } = await req.json(); // action: 'CLOCK_IN' or 'CLOCK_OUT'

    const { isAuthorized, tenantId, name: operatorName, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const payload = decodeJwt(token!);
    const operatorId = payload.id as string;

    const now = new Date();
    const workDate = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"

    // 💡 [신규] 해당 직원의 기준 출근/퇴근 설정 시각 동적 조회
    let workStartTime = '09:00:00';
    let workEndTime = '18:00:00';
    try {
      const opRes = await queryTable('crm_operators', { filters: { id: operatorId } });
      const opInfo = opRes.rows?.[0];
      if (opInfo) {
        if (opInfo.work_start_time) workStartTime = opInfo.work_start_time;
        if (opInfo.work_end_time) workEndTime = opInfo.work_end_time;
      }
    } catch (e) {
      console.warn("사원 기준 출퇴근시간 로드 실패, 기본값 폴백:", e);
    }

    // 당일 기존 근태 기록이 있는지 스캔 (테넌트 격리)
    const existingFilters: any = { operator_id: operatorId, work_date: workDate };
    existingFilters.tenant_id = tenantId;
    const existingRes = await queryTable('crm_attendance', { filters: existingFilters });
    const records = existingRes.rows || [];

    if (action === 'CLOCK_IN') {
      if (records.length > 0 && records[0].clock_in) {
        return NextResponse.json({ success: false, error: '이미 오늘의 출근 스탬프가 찍혀 있습니다.' }, { status: 400 });
      }

      // 출근 시간 판별 기준 (사원 설정 기준 시각 동적 적용)
      const isLate = timeStr > workStartTime;
      const status = isLate ? 'LATE' : 'NORMAL';

      const newRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        operator_id: operatorId,
        work_date: workDate,
        clock_in: timeStr,
        clock_out: null,
        status,
        working_hours: 0,
        memo: memo || (isLate ? '지각 출근 기록' : '정상 출근'),
        tenant_id: tenantId,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await insertRows('crm_attendance', [newRecord]);

      return NextResponse.json({
        success: true,
        message: `${operatorName}님, ${isLate ? '⚠️ 지각' : '🟢 정상'} 출근 완료 되었습니다. (${timeStr})`,
        record: newRecord
      });
    }

    if (action === 'CLOCK_OUT') {
      if (records.length === 0) {
        return NextResponse.json({ success: false, error: '출근 스탬프를 먼저 찍어주세요.' }, { status: 400 });
      }

      const attRecord = records[0];
      if (attRecord.clock_out) {
        return NextResponse.json({ success: false, error: '이미 오늘의 퇴근 스탬프가 기록되어 있습니다.' }, { status: 400 });
      }

      // 실제 근무 시간(H) 동적 계산
      let workingHours = 8;
      if (attRecord.clock_in) {
        const [inH, inM, inS] = attRecord.clock_in.split(':').map(Number);
        const [outH, outM, outS] = timeStr.split(':').map(Number);
        const diffMs = (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS);
        workingHours = Math.max(0, Math.round((diffMs / 3600) * 10) / 10); // 소수점 첫째자리
      }

      // 조퇴 판별 기준 (사원 설정 퇴근 시각 이전 퇴근 시 동적 적용)
      let currentStatus = attRecord.status;
      if (timeStr < workEndTime && currentStatus === 'NORMAL') {
        currentStatus = 'EARLY_LEAVE';
      }

      const updates = {
        clock_out: timeStr,
        status: currentStatus,
        working_hours: workingHours,
        updated_at: now.toISOString()
      };

      const updateFilters: any = { id: attRecord.id };
      updateFilters.tenant_id = tenantId;
      await updateRows('crm_attendance', updates, { filters: updateFilters });

      return NextResponse.json({
        success: true,
        message: `${operatorName}님, 퇴근 스탬프가 찍혔습니다. 고생하셨습니다! (${timeStr}, 총 ${workingHours}시간 근무)`,
        record: { ...attRecord, ...updates }
      });
    }

    return NextResponse.json({ success: false, error: '잘못된 액션 명령입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Attendance POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
