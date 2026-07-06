export interface Customer {
  id: number;
  name: string;
  phone: string;
  tags: string;
  created_at: string;
  address?: string;
  shipping_address?: string;
  recipient_name?: string;
  recipient_phone?: string;
  point_balance?: number;
}

export interface CustomerHistoryStats {
  totalOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalAmount: number;
}

export interface CustomerHistory {
  orders: any[];
  transactions: any[];
  deliveries: any[];
  stats: CustomerHistoryStats;
}

export interface PointHistoryItem {
  id: number;
  customer_id: number;
  amount: number;
  balance_after: number;
  transaction_type: 'EARN' | 'USE' | 'ADJUST';
  description: string;
  created_at: string;
}

export interface NewCustomerInput {
  name: string;
  phone: string;
  tags: string;
  memo: string;
  address: string;
  shipping_address: string;
  recipient_name: string;
  recipient_phone: string;
}
