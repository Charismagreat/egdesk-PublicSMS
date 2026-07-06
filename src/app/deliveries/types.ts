export interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  courier: string;
  tracking_number?: string;
  status: string;
  order_id?: string;
  created_at?: string;
}

export interface DeliveryForm {
  customerName: string;
  customerPhone: string;
  address: string;
  courier: string;
  trackingNumber: string;
}
