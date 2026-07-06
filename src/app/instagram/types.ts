// 인스타그램 마케팅 AI 시스템 공통 타입 정의

/**
 * 마케팅 대상 상품 정보 인터페이스
 */
export interface Product {
  id: string;
  name: string;
  price: string;
  main_image_url: string;
  url: string;
}

/**
 * 인스타그램 게시물 포스팅 인터페이스
 */
export interface InstagramPost {
  id: number;
  product_id: string | null;
  status: "DRAFT" | "SCHEDULED" | "POSTED" | "FAILED";
  content: string;
  image_url: string;
  scheduled_at: string;
  posted_at: string | null;
  error_message: string | null;
  likes_count: number;
  comments_count: number;
  product?: Product | null;
}

/**
 * 오토파일럿 자동 발행 환경설정 인터페이스
 */
export interface AutopilotSettings {
  id: number;
  is_autopilot: number;
  autopilot_interval: string;
  autopilot_time: string;
  tone_style: string;
  instagram_username: string;
  access_token: string;
}
