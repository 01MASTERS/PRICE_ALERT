export type ScheduleMode = 'period' | 'custom_times';

export interface Alert {
  id: string;
  productUrl: string;
  productName?: string | null;
  targetPrice: number;
  currentPrice?: number | null;
  intervalMinutes: number;
  scheduleMode: ScheduleMode;
  customTimes?: string[] | null;
  notified: boolean;
  active: boolean;
  createdAt: string;
  lastCheckedAt?: string | null;
  nextCheckAt?: string | null;
}

export interface CreateAlertReq {
  productUrl: string;
  targetPrice: number;
  intervalMinutes: number;
  scheduleMode: ScheduleMode;
  customTimes?: string[];
}

export type UpdateAlertReq = CreateAlertReq;
