export interface MessageTemplate {
  id: number;
  title: string;
  content: string;
}

export interface AutomationRule {
  enabled: boolean;
  templateId: number | null;
}

export interface EventItem {
  id: string;
  label: string;
  desc: string;
}
