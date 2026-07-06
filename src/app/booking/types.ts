export interface BookingProduct {
  id: string;
  name: string;
  description?: string;
  price: string;
  main_image_url?: string;
  category: string;
  menu_category?: string;
}

export interface BookingForm {
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
}

export interface AppliedCoupon {
  code: string;
  name: string;
  discountAmount: number;
}
