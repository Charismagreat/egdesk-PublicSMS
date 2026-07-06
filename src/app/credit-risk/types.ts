export interface CreditRiskStats {
  id: string;
  companyName: string;
  managerName: string;
  managerPhone: string;
  totalSales: number;
  overdueAmount: number;
  overdueDays: number;
  creditRating: "A" | "B" | "C" | "D" | "E" | "F";
  defaultProbability: number;
  riskLevel: "CRITICAL" | "WARNING" | "SAFE";
  lastAction: string;
  actionDate: string;
  virtualAccount: string;
}

export interface CreditSummary {
  averageDso: number;
  overdueTotal: number;
  averageCreditScore: number;
  riskFactors: string[];
}

export interface OverdueAgingDetail {
  categories: string[];
  amounts: number[];
}

export interface ToastState {
  message: string;
  type: "success" | "error" | "warning";
}
