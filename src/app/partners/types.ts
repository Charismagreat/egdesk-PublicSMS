export interface Partner {
  id: string;
  type: string;
  company_name: string;
  business_number: string;
  representative: string;
  phone: string;
  fax?: string;
  manager_name: string;
  manager_phone: string;
  manager_position?: string;
  manager_email?: string;
  email: string;
  address: string;
  vip_level: 'NORMAL' | 'VIP';
  credit_limit: number;
  memo: string;
  created_at: string;
  total_performance?: number;
  pending_count?: number;
}

export interface PartnerForm {
  type: string;
  company_name: string;
  business_number: string;
  representative: string;
  phone: string;
  fax: string;
  manager_name: string;
  manager_phone: string;
  manager_position: string;
  manager_email: string;
  email: string;
  address: string;
  vip_level: 'NORMAL' | 'VIP';
  credit_limit: number;
  memo: string;
}

export interface OcrResult {
  success: boolean;
  status: 'NEW_PARTNER' | 'ALREADY_REGISTERED' | 'UPDATE_PARTNER';
  existingId?: string;
  data: {
    businessNumber?: string;
    companyName?: string;
    representative?: string;
    address?: string;
    phone?: string;
    fax?: string;
    managerName?: string;
  };
  checksum: {
    isValid: boolean;
    message: string;
  };
  nts: {
    status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED' | 'NOT_FOUND' | 'ERROR';
    statusText: string;
    taxType?: string;
  };
  diff?: {
    companyName: { old: string; new: string; changed: boolean };
    representative: { old: string; new: string; changed: boolean };
    address: { old: string; new: string; changed: boolean };
  };
}

export interface DetailHistory {
  purchaseOrders: any[];
  salesOrders: any[];
  contacts?: any[];
}
