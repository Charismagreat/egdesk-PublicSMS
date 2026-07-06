export interface SharedDashboard {
  id: string;
  title: string;
  chart_spec_json: string | any;
  briefing_markdown: string | null;
  refresh_interval: string;
  last_refreshed_at: string | null;
  created_at: string;
}
