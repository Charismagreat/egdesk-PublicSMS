export interface StoreProduct {
  id: number | string;
  name: string;
  description?: string;
  price: string; // '상담후결정' 또는 '15,000' 등 포맷팅된 문자열
  brand?: string;
  spec?: string;
  inventory_spec?: string;
  unit?: string;
  inventory_unit?: string;
  category?: string;
  menu_category?: string;
  main_image_url?: string;
  detail_image_url?: string;
  available_methods?: string; // 콤마로 구분된 수령방식 (예: "배달,배송")
  valid_item_code?: string; // 💡 자사 재고 기준 고유 품목코드 (바코드 또는 폴백코드)
  itemCode?: string;
  inventory_barcode?: string;
}

export interface OrderForm {
  customerName: string;
  customerPhone: string;
  quantity: number;
  deliveryMethod: string;
  shippingAddress: string;
  customerMemo: string;
  isTaxRequested?: boolean;
  businessNumber?: string;
  companyName?: string;
  representativeName?: string;
  taxEmail?: string;
}

export interface AppliedCoupon {
  id: number;
  code: string;
  name: string;
  discountAmount: number;
}

export type VoiceStep = 'IDLE' | 'LISTENING_PRODUCT' | 'CONFIRMING_PRODUCT' | 'LISTENING_DETAILS';
