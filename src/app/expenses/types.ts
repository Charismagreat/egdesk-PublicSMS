// 지출 관리 AI 모듈 공통 TypeScript 타입 정의
// 한국어로 작성된 주석 유지

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  attachment_url?: string;
  ai_analysis?: string;
  memo?: string;
  actual_expense_date?: string | null;
  deduction_amount?: number;
  transfer_fee?: number;
  created_at: string;
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD'; // 결재 승인 상태
  approval_memo?: string; // 결재 사유 메모
  card_approval_no?: string | null; // 카드 승인번호
}

export interface ExpenseSettings {
  monthly_budget: number;
  is_alert_enabled: number;
  alert_threshold_percent: number;
  alert_sms_template: string;
  alert_phone: string;
}

export interface ExpenseStats {
  currentMonth: string;
  currentMonthTotal: number;
  monthlyBudget: number;
  budgetConsumptionRate: number;
  categoryStats: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface DbExpenseCategory {
  id: string;
  main_category: string;
  mid_category: string;
  sub_category: string;
  created_at: string;
}

export interface DbExpenseTag {
  id: string;
  name: string;
  scope?: string;
  created_at: string;
}
