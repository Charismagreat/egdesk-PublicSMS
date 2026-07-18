export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  main_image_url?: string;
  category?: string;
}

export interface SelectedEstimateItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface CheckStatusMsg {
  type: 'success' | 'error' | 'info';
  text: string;
}
