export interface ColumnMapping {
  physical: string;
  friendly: string;
}

export interface SharedViewData {
  friendlyTableName: string;
  allowCsvDownload: boolean;
  columnMappings: ColumnMapping[];
  rows: any[];
  total: number;
}

export interface ShareViewPageProps {
  params: Promise<{ hash: string }>;
}
