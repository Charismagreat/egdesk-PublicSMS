// 인스타그램 마케팅 AI 시스템 공통 타입 정의

/**
 * 마케팅 대상 상품 정보 인터페이스
 */
export interface Product {
  id: string;
  name: string;
  price: string;
  brand?: string;
  description?: string;
  main_image_url: string;
  url: string;
}

/**
 * 인스타그램 게시물 포스팅 인터페이스
 */
export interface InstagramPost {
  id: number | string;
  product_id: string | null;
  status: "DRAFT" | "SCHEDULED" | "POSTED" | "FAILED" | string;
  content: string;
  image_url: string;
  imageUrl?: string;
  imagePath?: string;
  caption?: string;
  text?: string;
  title?: string;
  product_name?: string;
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
  ig_user_id?: string;
}

/**
 * EGDesk MCP 인스타그램 연동 계정 인터페이스
 */
export interface McpInstagramConnection {
  id: string;
  name: string;
  username: string;
  handle: string | null;
  hasPassword?: boolean;
  hasAccessToken?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * EGDesk MCP 인스타그램 실물 발행 및 성과 이력 인터페이스
 */
export interface McpInstagramHistoryEntry {
  id: string;
  source: 'schedule' | 'debug' | 'manual';
  status: 'success' | 'failure';
  connectionId?: string | null;
  connectionName?: string | null;
  username?: string | null;
  title?: string | null;
  caption?: string | null;
  imagePath?: string | null;
  postUrl?: string | null;
  likes?: number | null;
  comments?: number | null;
  views?: number | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt: string;
}

