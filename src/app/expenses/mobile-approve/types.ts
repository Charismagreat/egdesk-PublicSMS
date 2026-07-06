import { Expense } from '@/hooks/useExpenses';

// Expense 타입을 확장하여 결재 관리 전용 필드 추가
export interface MobileExpense extends Expense {
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD';
  approval_memo?: string;
}

// 자동완성 추천 아이템 인터페이스
export interface SuggestItem {
  label: string;
  value: string;
  type: 'partner' | 'staff' | 'department' | 'project';
}

// 실시간 지출 분석 조회 기간 타입
export type StatsRange = 'all' | 'today' | 'week' | 'month' | '3month';
