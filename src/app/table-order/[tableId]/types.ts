// 테이블 주문 메뉴 상품 인터페이스
export interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  menu_category?: string;
  description?: string;
  main_image_url?: string;
}

// 장바구니 수량 관리 딕셔너리 인터페이스
export interface CartState {
  [productId: string]: number;
}

// 적용된 쿠폰 정보 인터페이스
export interface AppliedCoupon {
  code: string;
  name: string;
  discountAmount: number;
}
