// 이지태스크 (Snaptasks) 공통 타입 정의

export interface SnapTask {
  id: string;
  title: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  partner_id: string | null;
  partner_company_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  id: number;
  task_id: string;
  content_text: string;
  file_url: string | null;
  file_type: "IMAGE" | "PDF" | "AUDIO" | "LINK" | "TEXT";
  ai_analysis: string;
  created_at: string;
}

export interface ActionLog {
  id: number;
  task_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

export interface Partner {
  id: string;
  company_name: string;
  business_number: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export interface PartnerContact {
  id: string;
  partner_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  card_image_url: string | null;
  is_primary: number; // 1이면 대표 담당자
  created_at: string;
}
