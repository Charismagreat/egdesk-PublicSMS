export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../../egdesk-helpers';

/**
 * GET: 특정 연월(YYYY-MM)과 직원별 실제 근태 연동형 실시간 급여 정산
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('year_month') || new Date().toISOString().slice(0, 7); // 예: "2026-05"

    // 1. 직원 마스터 및 계약 조건 로드
    const employeesRes = await queryTable('crm_operators', { filters: { is_active: '1' } });
    const employees = employeesRes.rows || [];

    const contractsRes = await queryTable('crm_operator_contract_settings');
    const contracts = contractsRes.rows || [];

    // 2. 당월 전사 근태 대장 로드 ( work_date가 "2026-05%" 패턴인 것 추출 )
    const attendanceRes = await queryTable('crm_attendance');
    const allAttendance = attendanceRes.rows || [];
    const monthlyAttendance = allAttendance.filter((a: any) => a.work_date && a.work_date.startsWith(yearMonth));

    // 3. 해당 월의 총 주차 수 계산 (예: 31일이면 31/7 = 4.428주)
    const [year, month] = yearMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const weeksInMonth = totalDaysInMonth / 7; // 주차 가중치 (대략 4.28주 ~ 4.43주)

    // 4. 직원별 당월 실제 근태 기반 급여 연산 매핑
    const payrollDetails = employees.map((emp: any) => {
      // 해당 직원의 계약 정보 매칭 (없으면 기본값 매핑)
      const contract = contracts.find((c: any) => String(c.operator_id) === String(emp.id)) || {
        hourly_wage: 10000,
        weekly_hours: 40,
        allow_weekly_holiday_paid: 1,
        work_days: '월,화,수,목,금',
        contract_memo: '미정'
      };

      // 해당 직원의 당월 총 출근 및 누적 실 근무시간 집계
      const empAttList = monthlyAttendance.filter((a: any) => String(a.operator_id) === String(emp.id));
      const totalWorkDays = empAttList.filter((a: any) => a.clock_in && a.status !== 'LEAVE').length;
      const totalLeaveDays = empAttList.filter((a: any) => a.status === 'LEAVE').length;
      
      const totalHours = empAttList.reduce((sum: number, cur: any) => sum + (parseFloat(cur.working_hours) || 0), 0);

      // 주당 평균 실 근무시간 연산
      const avgWeeklyHours = totalHours / weeksInMonth;

      // 주휴수당 적격 여부 판정 (주휴수당 설정이 켜져 있고, 주당 실 근무시간이 15시간 이상인 경우 적용)
      const isEligibleForWeeklyHolidayPay = contract.allow_weekly_holiday_paid === 1 && avgWeeklyHours >= 15.0;

      // 주휴수당 계산 공식: (주간실근무시간 / 40) * 8 * 시급 (최대 40시간 한도 법정 규정 준용)
      const cappedWeeklyHours = Math.min(40.0, avgWeeklyHours);
      const weeklyHolidayPay = isEligibleForWeeklyHolidayPay
        ? (cappedWeeklyHours / 40.0) * 8.0 * contract.hourly_wage
        : 0;

      // 당월 총 주휴수당 누계액
      const totalWeeklyHolidayPay = Math.round(weeklyHolidayPay * weeksInMonth);

      // 기본급: 실 근무 누적 시간 * 시급
      const baseSalary = Math.round(totalHours * contract.hourly_wage);

      // 최종 정산 지급 총액
      const totalSalary = baseSalary + totalWeeklyHolidayPay;

      return {
        operator_id: emp.id,
        name: emp.name,
        role: emp.role,
        employee_number: emp.employee_number,
        department: emp.department || '미정',
        hourly_wage: contract.hourly_wage,
        weekly_hours: contract.weekly_hours,
        allow_weekly_holiday_paid: contract.allow_weekly_holiday_paid,
        total_work_days: totalWorkDays,
        total_leave_days: totalLeaveDays,
        total_hours: Math.round(totalHours * 10) / 10,
        avg_weekly_hours: Math.round(avgWeeklyHours * 10) / 10,
        is_holiday_paid_eligible: isEligibleForWeeklyHolidayPay,
        weekly_holiday_pay_unit: Math.round(weeklyHolidayPay),
        total_holiday_pay: totalWeeklyHolidayPay,
        base_salary: baseSalary,
        total_payroll: totalSalary
      };
    });

    return NextResponse.json({
      success: true,
      yearMonth,
      weeksInMonth: Math.round(weeksInMonth * 100) / 100,
      payroll: payrollDetails
    });

  } catch (error: any) {
    console.error('Payroll Calculation API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
