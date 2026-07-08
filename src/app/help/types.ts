// FAQ 카테고리 타입 정의
export type FAQCategory = "sms" | "rpa" | "point" | "coupon" | "order" | "price" | "hr";

// FAQ 데이터 아이템 구조 인터페이스 정의
export interface FAQItem {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
}

// 주제별 카테고리 구성 인터페이스 정의
export interface CategoryConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}
