// 자금 흐름 예측 및 원가 시뮬레이션 관련 타입 정의

export interface CashflowPoint {
  date: string;
  expectedIn: number;
  expectedOut: number;
  balanceNormal: number;
  balanceOptimistic: number;
  balancePessimistic: number;
}

export interface ProductMargin {
  productId: string;
  productName: string;
  rawMaterialCost: number;
  laborCost: number;
  expenseCost: number;
  sellingPrice: number;
  costTotal: number;
  profit: number;
  marginRate: number;
}

export interface ForecastTransaction {
  id: string;
  date: string;
  type: "IN" | "OUT";
  title: string;
  partnerName: string;
  amount: number;
  isOverdue: boolean;
  contact: string;
}

export interface CashflowSimulatorData {
  currentBalance: number;
  cashflowForecast: CashflowPoint[];
  productMargins: ProductMargin[];
  forecastList: ForecastTransaction[];
}
