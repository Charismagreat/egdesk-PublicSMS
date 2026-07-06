// 네이버 블로그 마케팅 모듈에서 사용되는 공통 TypeScript 인터페이스 정의

// 마케팅 대상이 되는 연동 상품 인터페이스
export interface Product {
  id: string;
  name: string;
  price: string;
  main_image_url: string;
  url: string;
  description?: string;
  brand?: string;
  specs?: string;
}

// 네이버 블로그 포스팅 발행 및 예약 내역 인터페이스
export interface NaverPost {
  id: number;
  product_id: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED';
  title: string;
  content: string;
  target_keywords: string;
  image_url: string;
  sub_image_url: string;
  scheduled_at: string;
  posted_at: string | null;
  error_message: string | null;
  views_count: number;
  likes_count: number;
  product?: Product | null;
}

// 100% 무인 AI 오토파일럿 데몬의 스케줄링 설정 인터페이스
export interface AutopilotSettings {
  id: number;
  is_autopilot: number;
  autopilot_interval: string;
  autopilot_time: string;
  tone_style: string;
  naver_blog_id: string;
  api_client_id: string;
  api_client_secret: string;
}

// AI Keyword Lab에서 도출하는 페르소나별 키워드 및 경쟁 분석 정보 인터페이스
export interface KeywordItem {
  keyword: string;
  competition: 'LOW' | 'MEDIUM' | 'HIGH'; // 🟢, 🟡, 🔴
  volume: string;
  reason: string;
}
