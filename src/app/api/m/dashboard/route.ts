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
    let operatorId: number | string | null = null;
    let tenantId = 'default';

    if (token) {
      try {
        const payload = decodeJwt(token);
        username = (payload.username as string) || '';
        role = ((payload.role as string) || 'SUB_OPERATOR').toUpperCase();
        tenantId = (payload.tenant_id as string) || 'default';
        name = (payload.name as string) || username || '운영자';
        operatorId = (payload.id as any) || null;

        const opFilters: any = { username };
        if (tenantId) {
          opFilters.tenant_id = tenantId;
        }
        const opRes = await queryTable('crm_operators', { filters: opFilters });
        if (opRes.rows && opRes.rows.length > 0) {
          name = opRes.rows[0].name || name;
          operatorId = opRes.rows[0].id || operatorId;
          if (opRes.rows[0].role) {
            role = opRes.rows[0].role.toUpperCase();
          }
        }
      } catch (tokenErr) {
        console.warn('JWT Decode fail in mobile dashboard:', tokenErr);
      }
    }

    if (!username) {
      return NextResponse.json({
        success: false,
        error: '로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요.'
      }, { status: 401 });
    }

    // 한국 시간대 기준 날짜 구하기 (YYYY-MM-DD)
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7); // YYYY-MM

    // 1. 오늘 출근 시각 및 이달 근무일수 / 누적 근무시간 집계 (테넌트 격리)
    let todayClockIn: string | null = null;
    let todayClockOut: string | null = null;
    let monthlyDays = 0;
    let monthlyHours = 0;
    try {
      const todayAttRes = await queryTable('crm_attendance', {
        filters: { operator_id: String(operatorId), work_date: today, tenant_id: tenantId }
      });
      if (todayAttRes.rows && todayAttRes.rows.length > 0) {
        todayClockIn = todayAttRes.rows[0].clock_in || null;
        todayClockOut = todayAttRes.rows[0].clock_out || null;
      }

      const allAttRes = await queryTable('crm_attendance', {
        filters: { operator_id: String(operatorId), tenant_id: tenantId }
      });
      const monthlyRows = (allAttRes.rows || []).filter((r: any) => 
        r.work_date && r.work_date.startsWith(thisMonth)
      );
      monthlyDays = monthlyRows.filter((r: any) => r.clock_in).length;
      monthlyHours = monthlyRows.reduce((sum: number, r: any) => sum + (Number(r.working_hours) || 0), 0);
    } catch (e) {
      console.warn('Failed to query attendance for mobile dashboard:', e);
    }

    // 2. 내 잔여 연차 조회 (테넌트 격리)
    let remainingLeaves = 15.0;
    try {
      const balRes = await queryTable('crm_operator_leave_balances', {
        filters: { operator_id: String(operatorId), tenant_id: tenantId }
      });
      if (balRes.rows && balRes.rows.length > 0) {
        remainingLeaves = Number(balRes.rows[0].remaining) ?? 15.0;
      }
    } catch (e) {
      console.warn('Failed to query leave balance for mobile dashboard:', e);
    }

    // 3. 할 일 목록 조회 (해야할 일 / 한 일) 및 권한/테넌트 격리 적용
    let todoTasks: any[] = [];
    let doneTasks: any[] = [];
    try {
      const isSystemAdminCard = (title: string = '') => {
        if (!title) return false;
        return (
          title.includes('이지봇 자율 대행 작동 지침 누락') ||
          title.includes('AI API 쿼터') ||
          title.includes('AI API 헬스') ||
          title.includes('긴급 AI 관제') ||
          title.includes('작동 지침 누락 경보') ||
          title.includes('관제 경보')
        );
      };

      const taskRes = await queryTable('crm_snaptasks', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
      const snaptasks = (taskRes.rows || []).filter((t: any) => !t.deleted_at && !isSystemAdminCard(t.title));

      // 모바일 현장 상신 및 거버넌스 할 일 레코드 병합 (crm_governance_logs)
      const govRes = await queryTable('crm_governance_logs', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
      const govLogs = (govRes.rows || []).filter((g: any) => !g.deleted_at && (g.doc_type === 'mobile_request' || g.doc_type === 'mobile_req') && !isSystemAdminCard(g.doc_title));

      const govTasks = govLogs.map((g: any) => ({
        id: g.id || g.doc_id,
        title: g.doc_title || '현장 작업 요청',
        description: g.reason || '',
        status: (g.status === 'APPROVED' || g.status === 'RESOLVED' || g.status === 'DONE') ? 'DONE' : 'ACTIVE',
        due_date: g.due_date || null,
        created_at: g.created_at,
        created_by: g.operator || 'system',
        updated_by: g.operator || 'system',
        assignee_name: g.operator || '담당자',
        attachments: g.attachments ? (typeof g.attachments === 'string' ? JSON.parse(g.attachments) : g.attachments) : []
      }));

      // 중복 제거 및 전체 통합 태스크 목록
      const existingIds = new Set(snaptasks.map((t: any) => t.id));
      const combinedTasks = [...snaptasks];
      govTasks.forEach((gt: any) => {
        if (!existingIds.has(gt.id)) {
          combinedTasks.push(gt);
        }
      });

      // 테넌트 내 보안 격리 필터 (관리자는 테넌트 전체, 일반 직원은 본인 담당 태스크만)
      const myTasks = combinedTasks.filter((t: any) => {
        if (role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN' || role === 'TENANT_ADMIN' || role === 'PRESIDENT') return true;
        return t.created_by === username || t.updated_by === username || t.assignee_name === username || t.assignee_name === name;
      });

      // ACTIVE -> 해야할 일
      todoTasks = myTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'COMPLETED');
      // DONE -> 한 일
      doneTasks = myTasks.filter((t: any) => t.status === 'DONE' || t.status === 'COMPLETED');
    } catch (e) {
      console.warn('Failed to query tasks for mobile dashboard:', e);
    }

    // 4. 오늘 결재 승인 / 반려 건수 집계 (테넌트 격리)
    let todayApprovedCount = 0;
    let todayRejectedCount = 0;
    try {
      // 지출 승인/반려 내역
      const expenseRes = await queryTable('crm_expenses', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
      const todayExpenses = (expenseRes.rows || []).filter((exp: any) => {
        if (exp.deleted_at) return false;
        const isToday = exp.updated_at && exp.updated_at.startsWith(today);
        if (!isToday) return false;
        if (role !== 'SUPER_ADMIN' && role !== 'TENANT_ADMIN' && role !== 'PRESIDENT' && exp.updated_by !== username) return false;
        return exp.approval_status === 'APPROVED' || exp.approval_status === 'REJECTED';
      });

      // 휴가 승인/반려 내역
      const leaveRes = await queryTable('crm_annual_leaves', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
      const todayLeaves = (leaveRes.rows || []).filter((lv: any) => {
        if (lv.deleted_at) return false;
        const isToday = lv.updated_at && lv.updated_at.startsWith(today);
        if (!isToday) return false;
        if (role !== 'SUPER_ADMIN' && role !== 'TENANT_ADMIN' && role !== 'PRESIDENT' && String(lv.operator_id) !== String(operatorId)) return false;
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
        role,
        tenant_id: tenantId
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
