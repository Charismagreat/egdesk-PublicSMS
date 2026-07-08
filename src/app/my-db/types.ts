export interface Table {
  name: string;
  displayName: string;
  rowCount: number;
}

export interface ColumnSchema {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface ConsoleResult {
  success: boolean;
  rows?: any[];
  affectedRows?: number | null;
  lastInsertRowid?: number | null;
  error?: string;
}

export interface TuneMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
  image?: string;
  isNewSkill?: boolean;
  timestamp: string;
}

export interface SharedDashboard {
  id: string;
  title: string;
  sqlQuery: string;
  tableName: string;
  displayName: string;
  chartSpecJson: any;
  briefingMarkdown: string | null;
  refreshInterval: 'NONE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  createdAt: string;
}

export interface FriendlyMapping {
  physical: string;
  friendly: string;
  visible: boolean;
  sortOrder: number;
  sortDirection: 'NONE' | 'ASC' | 'DESC';
}
