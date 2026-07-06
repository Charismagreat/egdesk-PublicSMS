export interface UsageSummary {
  api_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

export interface PurposeStat {
  purpose: string;
  calls: number;
  tokens: number;
}

export interface ModelStat {
  model: string;
  calls: number;
  tokens: number;
}

export interface TokenLog {
  id: string;
  model: string;
  purpose: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  user_name: string;
  menu_path: string;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
