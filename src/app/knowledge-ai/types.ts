// 지식 관리 AI (Knowledge-AI) 공통 타입 정의

export interface DocumentApproval {
  document_id: string;
  approver_id: string;
  step_number: number;
  step_type: string;
  status: string;
  comments: string;
  processed_at: string | null;
}

export interface KnowledgeDocument {
  document_id: string;
  title: string;
  doc_type: string;
  file_path: string | null;
  thumbnail_path: string | null;
  creator_id: string;
  dept_code: string;
  security_level: "A" | "B" | "C";
  content: string;
  metadata_json: string;
  status: "DRAFT" | "PENDING" | "APPROVED_AUTO" | "APPROVED_MANUAL" | "REJECTED";
  autopilot_score: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
  approvals?: DocumentApproval[];
}

export interface AssetType {
  id: string;
  type_name: string;
  created_at: string;
  created_by: string;
}

export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  tableData?: Array<Record<string, string>>;
  docLink?: string;
}
