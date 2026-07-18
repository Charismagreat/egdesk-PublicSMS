export interface Customer {
  id: string;
  name: string;
  phone: string;
  tags?: string;
}

export interface CaptureForm {
  customerName: string;
  customerPhone: string;
  productName: string; // 상담 메모 (상품/내용)
  status: string;      // 접수 상태 처리 (접수완료 / 견적요청)
}
