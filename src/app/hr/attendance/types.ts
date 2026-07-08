// HR 근태 관리 AI 공통 TypeScript 타입 정의 파일

// 직원 (Employee) 정보 인터페이스
export interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
  employee_number?: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'LEAVE';
  working_hours: number;
  memo: string;
  total_allowed: number;
  remaining_leaves: number;
}

// 회사 일정 (CompanyEvent) 인터페이스
export interface CompanyEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: string; // 'COMPANY_EVENT' | 'HOLIDAY' | 'DEPT_EVENT' | 'DEADLINE' | 'LEGAL' | 'EDUCATION' 등 동적 확장 가능
  description: string;
}

// 연차/휴가 신청서 (LeaveRequest) 인터페이스
export interface LeaveRequest {
  id: string;
  operator_id: string;
  employee_name: string;
  employee_number?: string;
  leave_type: 'ANNUAL' | 'HALF' | 'SICK' | 'SPECIAL';
  start_date: string;
  end_date: string;
  days_spent: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  reject_reason: string | null;
  approver_name: string | null;
  medical_certificate_path?: string;
  created_at: string;
}

// 근로 계약 조건 (Contract) 인터페이스
export interface Contract {
  id?: string;
  operator_id: string;
  hourly_wage: number;
  weekly_hours: number;
  allow_weekly_holiday_paid: number; // 1: 적용, 0: 미적용
  work_days: string;
  contract_memo: string;
}

// 실시간 급여 정산 (Payroll) 결과 인터페이스
export interface Payroll {
  operator_id: string;
  name: string;
  username: string;
  role: string;
  employee_number?: string;
  hourly_wage: number;
  weekly_hours: number;
  allow_weekly_holiday_paid: number;
  work_days: string;
  total_worked_hours: number;
  base_salary: number;
  weekly_holiday_allowance: number;
  overtime_allowance: number;
  meal_allowance: number;
  deduction_amount: number;
  net_salary: number;
}

// 임직원 상세 인적사항 프로필 인터페이스
export interface EmployeeProfile {
  operator_id: string;
  name?: string;
  employee_number?: string;
  department: string;
  hire_date: string;
  commute_area: string;
  skills: string;
  backup_operator_id: string;
}

// AI 업무 공백 분석 보고서 이력 (BriefingHistory) 인터페이스
export interface BriefingHistory {
  id: string;
  target_year_month: string;
  risk_score: number;
  alert_title: string;
  alert_message: string;
  briefing_text: string;
  created_at: string;
}

// 일정 유형 마스터 (EventType) 인터페이스
export interface EventType {
  type_key: string;
  type_name: string;
  color_theme: 'Indigo' | 'Rose' | 'Amber' | 'Purple' | 'Emerald' | 'Cyan' | 'Lime' | 'Teal' | 'Pink' | 'Slate';
}
