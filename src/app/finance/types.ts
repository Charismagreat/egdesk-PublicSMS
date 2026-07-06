export interface Account {
  id: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: string;
  lastTxDate?: string;
  lastTxTime?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  time?: string;
  amount: number;
  balance?: number;
  type: "deposit" | "withdrawal" | "입금" | "출금";
  description: string;
  category?: string;
  bankName?: string;
  accountNumber?: string;
  memo?: string; // 태그 및 메모 용도
}

export interface CardTransaction {
  id: string;
  date: string;
  time?: string;
  amount: number;
  merchantName: string;
  cardNumber: string;
  cardCompanyName: string;
  status: string; // 승인, 취소 등
  category?: string;
  receiptUrl?: string;
  approvalNumber?: string;
  memo?: string;
  applied_rule_id?: string;
  applied_rule_text?: string;
}

export interface HometaxInvoice {
  id: string;
  issueDate: string;
  supplierName: string;
  buyerName: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemName?: string;
  invoiceType: "sales" | "purchase" | "매출" | "매입";
  taxType?: string;
  memo?: string;
}

export interface HometaxCash {
  id: string;
  transactionDate: string;
  franchiseName: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  approvalNumber: string;
  purpose?: string; // 소득공제, 지출증빙
  memo?: string;
}

export interface DbExpenseCategory {
  id: string;
  main_category: string;
  mid_category: string;
  sub_category: string;
  created_at: string;
}

export interface DbExpenseTag {
  id: string;
  name: string;
  scope?: string;
  created_at: string;
}

export interface SyncLog {
  id: string;
  operationType: string;
  status: "success" | "failed" | string;
  startedAt: string;
  completedAt?: string;
  recordsCount?: number;
  errorMessage?: string;
}

export interface MatchingItem {
  id: string;
  sourceTable: "tax" | "exempt";
  dbId: number;
  invoiceType: "sales" | "purchase";
  issueDate: string;
  supplierName: string;
  supplierBusinessNumber: string;
  buyerName: string;
  buyerBusinessNumber: string;
  totalAmount: number;
  supplyAmount: number;
  taxAmount: number;
  itemName?: string;
  memo?: string;
  bankTx?: {
    id: string;
    date: string;
    time?: string;
    bankId: string;
    bankName: string;
    accountNumber: string;
    amount: number;
    counterparty: string;
    description: string;
  } | null;
}

