export interface StoreProduct {
  id: number;
  name: string;
  description?: string;
  price: string; // '상담후결정' 또는 '15,000' 등 포맷팅된 문자열
  category?: string;
  menu_category?: string;
  main_image_url?: string;
  detail_image_url?: string;
  available_methods?: string; // 콤마로 구분된 수령방식 (예: "배달,배송")
}

export interface OrderForm {
  customerName: string;
  customerPhone: string;
  quantity: number;
  deliveryMethod: string;
  shippingAddress: string;
  customerMemo: string;
}

export interface AppliedCoupon {
  id: number;
  code: string;
  name: string;
  discountAmount: number;
}

export type VoiceStep = 'IDLE' | 'LISTENING_PRODUCT' | 'CONFIRMING_PRODUCT' | 'LISTENING_DETAILS';
