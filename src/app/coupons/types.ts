export interface CouponRestriction {
  id?: string;
  coupon_id?: string;
  restriction_type: 'EXCLUDE' | 'INCLUDE';
  target_type: 'PRODUCT' | 'CATEGORY';
  target_value: string;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_type: 'amount' | 'percent';
  discount_value: string | number;
  min_order_amount: string | number;
  expires_at: string | null;
  created_at: string;
  status: string;
  restrictions?: CouponRestriction[];
}

export interface CouponForm {
  code: string;
  prefix: string;
  count: string;
  name: string;
  discount_type: string;
  discount_value: string;
  min_order_amount: string;
  expires_at: string;
}

export type IssueType = 'single' | 'bulk';
