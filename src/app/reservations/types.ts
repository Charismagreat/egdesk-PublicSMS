export interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  status: string;
  created_at?: string;
}

export interface ReservationForm {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
}
