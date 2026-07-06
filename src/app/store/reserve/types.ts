export interface ReserveForm {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  desc: string;
}
