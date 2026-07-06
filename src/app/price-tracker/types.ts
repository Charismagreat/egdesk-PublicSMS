/**
 * SCM 가격 추적 AI 공통 타입 정의
 */

export interface CollectorPriceInfo {
  siteName: string;
  price: number;
  currency: string;
  krwPrice: number;
}

export interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  category: "RAW_MATERIAL" | "COMPETITOR_PRODUCT" | string;
  spec: string;
  base_price: number;
  base_price_krw?: number;
  target_margin_rate: number;
  currency_code: string;
  latest_price: number;
  latest_krw_price?: number;
  latest_site_name?: string;
  latest_site_url?: string;
  current_margin_rate: number;
  collectors_count?: number;
  exchange_rate: number;
  rate_change_direction?: "UP" | "DOWN" | "STAY" | "NONE" | string;
  rate_change_percent?: number;
  collectors_prices?: CollectorPriceInfo[];
}

export interface HistoryEntry {
  captured_price: number;
  captured_at: string;
  converted_krw_price?: number;
}

export interface Url {
  url_id: number;
  item_id: number;
  site_name: string;
  target_url: string;
  css_selector: string;
  cron_interval: string;
  last_captured_price?: number;
  last_captured_at?: string;
  history?: HistoryEntry[];
}

export interface AlertRule {
  rule_id?: number;
  item_id: number;
  rule_name: string;
  condition_type: "MARGIN_BREAKDOWN" | "BELOW_LIMIT" | "ABOVE_LIMIT" | string;
  threshold_value: number;
  phone_number: string;
  sms_template: string;
  is_enabled: 0 | 1;
  threshold_unit: "PERCENT" | "CURRENCY" | string;
  threshold_currency: string;
  condition_operator: string;
}

export interface AlertLog {
  log_id: number;
  rule_name: string;
  sent_at?: string;
  fired_at?: string;
  sent_message?: string;
  message_sent?: string;
}

export interface ExchangeRate {
  rate_id: number;
  currency_code: string;
  current_rate: number;
  change_rate: number;
  change_direction?: "UP" | "DOWN" | "STAY" | "NONE" | string;
  last_updated_at?: string;
}

export interface ExchangeRateHistory {
  history_id: number;
  currency_code: string;
  rate_value: number;
  captured_date: string;
}

export interface DaemonInfo {
  status: "RUNNING" | "STOPPED" | string;
  last_run: string;
  pid: string | number;
}

export interface SearchChannel {
  id: number;
  name: string;
  active: boolean;
  isCustom?: boolean;
}

// 폼 입력 인터페이스
export interface ItemForm {
  item_code: string;
  item_name: string;
  category: "RAW_MATERIAL" | "COMPETITOR_PRODUCT" | string;
  spec: string;
  base_price: string;
  target_margin_rate: string;
  currency_code: string;
}

export interface UrlForm {
  site_name: string;
  target_url: string;
  css_selector: string;
  cron_interval: string;
}

export interface AlertForm {
  rule_name: string;
  condition_type: "MARGIN_BREAKDOWN" | "BELOW_LIMIT" | "ABOVE_LIMIT" | string;
  threshold_value: string;
  phone_number: string;
  sms_template: string;
  threshold_unit: "PERCENT" | "CURRENCY" | string;
  threshold_currency: string;
  condition_operator: string;
}

// 차트 호버 정보 인터페이스
export interface RateHoverInfo {
  x: number;
  y: number;
  val: number;
  date: string;
  index: number;
}

export interface ItemHoverInfo {
  x: number;
  y: number;
  price: number;
  date: string;
  index: number;
  converted_krw?: number;
}
