// 재고 관리 AI 공통 타입 정의

export interface InventoryItem {
  id: number;
  type: 'material' | 'product';
  name: string;
  category: string;
  price: number;
  partner?: string;
  stock: number;
  safeStock: number;
  location?: string;
  description?: string;
  tags?: string; // 콤마로 구분된 커스텀 멀티 태그
  createdAt: string;
  spec?: string; // 규격
  unitType?: string; // 단위 구분 (count | weight | box)
  unitValue?: string; // 상세 단위 (개, g, kg 등)
  boxContains?: string; // 박스당 입수량
  barcode?: string; // 바코드 식별 번호
}

export interface InventoryLog {
  id: number;
  itemId: number;
  itemName: string;
  itemType: 'material' | 'product';
  itemBarcode?: string;
  changeType: 'in' | 'out' | 'adjust';
  quantity: number;
  price: number;
  operator: string;
  note?: string;
  createdAt: string;
}

export interface ScanLog {
  id: string;
  time: string;
  name: string;
  type: string;
  beforeStock: number;
  afterStock: number;
  success: boolean;
  barcode: string;
  errorMsg?: string;
}

export interface ItemFormState {
  type: 'material' | 'product';
  name: string;
  category: string;
  price: string;
  partner: string;
  stock: string;
  safeStock: string;
  location: string;
  barcode: string;
  description: string;
  spec: string;
  unitType: string;
  unitValue: string;
  boxContains: string;
}

