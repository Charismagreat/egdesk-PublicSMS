export interface Order {
  id: string;
  order_date: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  quantity?: string | number;
  total_price?: string | number;
  delivery_method: string;
  shipping_address?: string;
  tracking_number?: string;
  attachment_url?: string;
  customer_memo?: string;
  status: string;
}

export interface OrderForm {
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: string;
  totalPrice: string;
  deliveryMethod: string;
  shippingAddress: string;
}
