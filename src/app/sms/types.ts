export interface Customer {
  id: number;
  name: string;
  phone: string;
  tags: string;
}

export interface AdTemplate {
  id: string;
  name: string;
  header: string;
  footer: string;
  optOut: string;
}

export interface MessageTemplate {
  id: number;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  url: string;
}

export interface Transaction {
  id: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  amount: string;
  orderDate: string;
  status: string;
}

export interface SmsDevice {
  phoneNumber: string;
  name: string;
  isConnected: boolean;
  dailyLimit: number;
  todaySent: number;
}

export interface SendProgress {
  current: number;
  total: number;
}

export interface SpamRisk {
  score: number;
  words: string[];
}
