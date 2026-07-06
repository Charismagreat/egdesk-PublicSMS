export interface MessageLog {
  id: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}

export interface SenderDevice {
  cleanMessage: string;
  deviceId: string;
}
