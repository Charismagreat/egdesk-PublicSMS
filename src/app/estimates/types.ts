export interface Estimate {
  id: string;
  type: "INBOUND" | "OUTBOUND";
  direction_status: "REQUESTED" | "DRAFT" | "SENT" | "RECEIVED";
  partner_name: string;
  partner_phone: string;
  partner_manager?: string;
  total_amount: number;
  file_url?: string;
  ai_parsed: number;
  created_at: string;
  first_item_name?: string;
  item_count?: number;
  tags?: string;
  sales_order_number?: string;
  purchase_order_number?: string;
  is_pending_delete?: boolean;
}

export interface PurchaseOrder {
  id: string;
  estimate_id: string;
  vendor_name: string;
  vendor_phone: string;
  status: "PENDING_INBOUND" | "INBOUND_COMPLETED";
  total_amount: number;
  created_at: string;
  completed_at?: string;
  is_pending_delete?: boolean;
}

export interface SalesOrder {
  id: string;
  estimate_id: string;
  customer_name: string;
  customer_phone: string;
  status: "REGISTERED" | "CONFIRMED";
  total_amount: number;
  created_at: string;
  client_order_no?: string;
  delivery_date?: string;
  is_pending_delete?: boolean;
}

export interface Partner {
  id: string;
  type: "VENDOR" | "BUYER";
  company_name: string;
  vip_level: string;
  phone: string;
}

export interface EstimateItem {
  id?: number;
  product_id?: string;
  item_code?: string;
  product_name: string;
  spec?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  delivery_date?: string;
}
