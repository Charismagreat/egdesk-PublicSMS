export interface SnapTask {
  id: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
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
  file_type: 'IMAGE' | 'PDF' | 'AUDIO' | 'LINK' | 'TEXT';
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
