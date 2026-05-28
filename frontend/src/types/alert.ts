export interface Alert {
  id: string;
  productUrl: string;
  productName?: string | null;
  targetPrice: number;
  currentPrice?: number | null;
  intervalMinutes: number;
  notified: boolean;
  createdAt: string;
  lastCheckedAt?: string | null;
}

export interface CreateAlertReq {
  productUrl: string;
  targetPrice: number;
  intervalMinutes: number;
}
