export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable } from '@/../egdesk-helpers';

/**
 * 직원용 모바일 대시보드 통계 및 요약 정보 제공 API
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    let username = '';
    let name = '';
    let role = 'SUB_OPERATOR';
    let operatorId: number | null = null;

    if (token) {
      try {
        const payload = decodeJwt(token);
        username = payload.username as string || '';
        role = (payload.role as string || 'SUB_OPERATOR').toUpperCase();
        const opRes = await queryTable('crm_operators', { filters: { username } });
        if (opRes.rows && opRes.rows.length > 0) {
          name = opRes.rows[0].name;
          operatorId = opRes.rows[0].id;
          if (opRes.rows[0].role) {
            role = opRes.rows[0].role.toUpperCase();
          }
        }
      } catch (tokenErr) {
        console.warn('JWT Decode fail in mobile dashboard:', tokenErr);
      }
    }

    // 만약 세션이 없으면 데모 환경 지원을 위해 첫 번째 직원 계정으로 매핑
    if (!username) {
      const allOps = await queryTable('crm_operators', { limit: 1 });
      if (allOps.rows && allOps.rows.length > 0) {
        username = allOps.rows[0].username;
        name = allOps.rows[0].name;
        operatorId = allOps.rows[0].id;
        role = (allOps.rows[0].role || 'SUPER_ADMIN').toUpperCase();
      } else {
        username = 'admin@egdesk.com';
        name = '최고관리자';
        role = 'SUPER_ADMIN';
        operatorId = 1;
      }
    }

    // 한국 시간대 기준 날짜 구하기 (YYYY-MM-DD)
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7); // YYYY-MM

    // 1. 오늘 출근 시각 및 이달 근무일수 / 누적 근무시간 집계
    let todayClockIn: string | null = null;
    let todayClockOut: string | null = null;
    let monthlyDays = 0;
    let monthlyHours = 0;
    try {
      const todayAttRes = await queryTable('crm_attendance', {
        filters: { operator_id: String(operatorId), work_date: today }
      });
      if (todayAttRes.rows && todayAttRes.rows.length > 0) {
        todayClockIn = todayAttRes.rows[0].clock_in || null;
        todayClockOut = todayAttRes.rows[0].clock_out || null;
      }

      const allAttRes = await queryTable('crm_attendance', {
        filters: { operator_id: String(operatorId) }
      });
      const monthlyRows = (allAttRes.rows || []).filter((r: any) => 
        r.work_date && r.work_date.startsWith(thisMonth)
      );
      monthlyDays = monthlyRows.filter((r: any) => r.clock_in).length;
      monthlyHours = monthlyRows.reduce((sum: number, r: any) => sum + (Number(r.working_hours) || 0), 0);
    } catch (e) {
      console.warn('Failed to query attendance for mobile dashboard:', e);
    }

    // 2. 내 잔여 연차 조회
    let remainingLeaves = 15.0;
    try {
      const balRes = await queryTable('crm_operator_leave_balances', {
        filters: { operator_id: String(operatorId) }
      });
      if (balRes.rows && balRes.rows.length > 0) {
        remainingLeaves = Number(balRes.rows[0].remaining) ?? 15.0;
      }
    } catch (e) {
      console.warn('Failed to query leave balance for mobile dashboard:', e);
    }

    // 3. 할 일 목록 조회 (해야할 일 / 한 일) 및 권한 격리 적용
    let todoTasks: any[] = [];
    let doneTasks: any[] = [];
    try {
      const taskRes = await queryTable('crm_snaptasks', {});
      const allTasks = (taskRes.rows || []).filter((t: any) => !t.deleted_at);

      // 보안 격리 필터
      const myTasks = allTasks.filter((t: any) => {
        if (role === 'SUPER_ADMIN') return true;
        return t.created_by === username || t.updated_by === username;
      });

      // ACTIVE -> 해야할 일
      todoTasks = myTasks.filter((t: any) => t.status === 'ACTIVE');
      // COMPLETED -> 한 일
      doneTasks = myTasks.filter((t: any) => t.status === 'COMPLETED');
    } catch (e) {
      console.warn('Failed to query snaptasks for mobile dashboard:', e);
    }

    // 4. 오늘 결재 승인 / 반려 건수 집계
    let todayApprovedCount = 0;
    let todayRejectedCount = 0;
    try {
      // 지출 승인/반려 내역
      const expenseRes = await queryTable('crm_expenses', {});
      const todayExpenses = (expenseRes.rows || []).filter((exp: any) => {
        if (exp.deleted_at) return false;
        const isToday = exp.updated_at && exp.updated_at.startsWith(today);
        if (!isToday) return false;
        if (role !== 'SUPER_ADMIN' && exp.updated_by !== username) return false;
        return exp.approval_status === 'APPROVED' || exp.approval_status === 'REJECTED';
      });

      // 휴가 승인/반려 내역
      const leaveRes = await queryTable('crm_annual_leaves', {});
      const todayLeaves = (leaveRes.rows || []).filter((lv: any) => {
        if (lv.deleted_at) return false;
        const isToday = lv.updated_at && lv.updated_at.startsWith(today);
        if (!isToday) return false;
        if (role !== 'SUPER_ADMIN' && String(lv.operator_id) !== String(operatorId)) return false;
        return lv.status === 'APPROVED' || lv.status === 'REJECTED';
      });

      todayApprovedCount = todayExpenses.filter((e: any) => e.approval_status === 'APPROVED').length + 
                           todayLeaves.filter((l: any) => l.status === 'APPROVED').length;
      todayRejectedCount = todayExpenses.filter((e: any) => e.approval_status === 'REJECTED').length + 
                           todayLeaves.filter((l: any) => l.status === 'REJECTED').length;
    } catch (e) {
      console.warn('Failed to query approvals for mobile dashboard:', e);
    }

    return NextResponse.json({
      success: true,
      currentUser: {
        id: operatorId,
        username,
        name,
        role
      },
      dashboard: {
        attendance: {
          clockIn: todayClockIn,
          clockOut: todayClockOut,
          monthlyDays,
          monthlyHours
        },
        leave: {
          remainingDays: remainingLeaves
        },
        todo: todoTasks,
        done: doneTasks,
        approval: {
          approvedCount: todayApprovedCount,
          rejectedCount: todayRejectedCount
        }
      }
    });

  } catch (err: any) {
    console.error('Mobile dashboard API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
