export interface Product {
  id: string;
  name: string;
  price: string;
  brand?: string;
  spec?: string;
  unit?: string;
  inventory_spec?: string;
  inventory_unit?: string;
  url: string;
  description: string;
  main_image_url: string;
  detail_image_url: string;
  category: string;
  menu_category: string;
  is_coupon_excludable?: number;
  available_methods?: string;
  inventory_item_id?: number | string | null;
  itemCode?: string;
  stock?: number;
  status?: string;
}

// 상품 추가 및 수정용 폼 데이터 인터페이스
export interface ProductForm {
  name: string;
  price: string;
  brand: string;
  spec: string;
  unit: string;
  url: string;
  description: string;
  main_image_url: string;
  detail_image_url: string;
  category: string;
  menu_category: string;
  isPriceTbd: boolean;
  available_methods: string[];
}

// 썸네일 이미지 마우스 호버 트래킹 인터페이스
export interface HoverImage {
  url: string;
  x: number;
  y: number;
}
