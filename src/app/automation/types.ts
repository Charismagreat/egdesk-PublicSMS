export interface MessageTemplate {
  id: number;
  title: string;
  content: string;
}

export interface OperatorItem {
  id: string | number;
  name: string;
  phone?: string;
  department?: string;
  role?: string;
}

export interface AutomationRule {
  enabled: boolean;
  templateId: number | null;
  targetType?: 'ADMIN' | 'ALL_OPERATORS' | 'OPERATORS' | 'OPERATOR' | 'CUSTOM' | 'PARTNER'; // 수신처 구분
  targetPhone?: string; // 직접 입력 번호 (단일 또는 콤마 구분)
  targetPhones?: string[]; // 다중 번호 배열
  targetOperatorId?: string; // 단일 직원 ID (하위 호환)
  targetOperatorIds?: string[]; // 복수 직원 ID 배열
}

export interface EventItem {
  id: string;
  label: string;
  desc: string;
  category?: 'INTERNAL' | 'EXTERNAL' | 'ALL';
}


