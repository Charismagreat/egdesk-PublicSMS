export interface PaymentItem {
  id: string;
  payment_date: string;
  order_id: string | null;
  customer_name: string;
  payment_method: string;
  amount: number | string;
  status: string;
}

export interface PaymentForm {
  customerName: string;
  amount: string;
  paymentMethod: string;
  orderId: string;
}
