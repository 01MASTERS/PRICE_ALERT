import axios from 'axios';
import type { Alert, CreateAlertReq, UpdateAlertReq } from '../types/alert';

interface ApiAlert {
  id: number;
  product_url: string;
  product_name?: string | null;
  target_price: number;
  current_price?: number | null;
  interval_minutes: number;
  schedule_mode?: 'period' | 'custom_times';
  custom_times?: string[] | null;
  notified: boolean;
  created_at: string;
  last_checked_at?: string | null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

const mapAlert = (alert: ApiAlert): Alert => ({
  id: String(alert.id),
  productUrl: alert.product_url,
  productName: alert.product_name,
  targetPrice: alert.target_price,
  currentPrice: alert.current_price,
  intervalMinutes: alert.interval_minutes,
  scheduleMode: alert.schedule_mode || 'period',
  customTimes: alert.custom_times,
  notified: alert.notified,
  createdAt: alert.created_at,
  lastCheckedAt: alert.last_checked_at,
});

export const fetchAlerts = async (): Promise<Alert[]> => {
  const { data } = await api.get<ApiAlert[]>('/alerts');
  return data.map(mapAlert);
};

export const createAlert = async (payload: CreateAlertReq): Promise<Alert> => {
  const { data } = await api.post<ApiAlert>('/alerts', {
    product_url: payload.productUrl,
    target_price: payload.targetPrice,
    interval_minutes: payload.intervalMinutes,
    schedule_mode: payload.scheduleMode,
    custom_times: payload.scheduleMode === 'custom_times' ? payload.customTimes : undefined,
  });
  return mapAlert(data);
};

export const updateAlert = async (id: string, payload: UpdateAlertReq): Promise<Alert> => {
  const { data } = await api.put<ApiAlert>(`/alerts/${id}`, {
    product_url: payload.productUrl,
    target_price: payload.targetPrice,
    interval_minutes: payload.intervalMinutes,
    schedule_mode: payload.scheduleMode,
    custom_times: payload.scheduleMode === 'custom_times' ? payload.customTimes : undefined,
  });
  return mapAlert(data);
};

export const deleteAlert = async (id: string): Promise<void> => {
  await api.delete(`/alerts/${id}`);
};
