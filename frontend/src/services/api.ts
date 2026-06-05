import axios from 'axios';
import type { Alert, CreateAlertReq, UpdateAlertReq } from '../types/alert';
import type { AuthResponse, LoginReq, RegisterReq, SettingsReq, User } from '../types/user';

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
  active?: boolean;
  created_at: string;
  last_checked_at?: string | null;
  next_check_at?: string | null;
}

const isNgrok = (import.meta.env.VITE_API_URL || '').includes('ngrok');

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: isNgrok ? { 'ngrok-skip-browser-warning': '1' } : undefined,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('price_alert_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
  active: alert.active ?? true,
  createdAt: alert.created_at,
  lastCheckedAt: alert.last_checked_at,
  nextCheckAt: alert.next_check_at,
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

export const checkUsername = async (username: string): Promise<{ available: boolean }> => {
  const { data } = await api.get<{ available: boolean }>(`/check-username?username=${encodeURIComponent(username)}`);
  return data;
};

export const login = async (payload: LoginReq): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/login', payload);
  return data;
};

export const register = async (payload: RegisterReq): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/register', payload);
  return data;
};

export const fetchMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/me');
  return data;
};

export const updateSettings = async (payload: SettingsReq): Promise<User> => {
  const { data } = await api.put<User>('/me/settings', payload);
  return data;
};

export const deleteAccount = async (): Promise<void> => {
  await api.delete('/account');
};

export const getTelegramLinkToken = async (): Promise<{ token: string; bot_url: string }> => {
  const { data } = await api.get<{ token: string; bot_url: string }>('/telegram/link-token');
  return data;
};

export const disconnectTelegram = async (): Promise<User> => {
  const { data } = await api.post<User>('/telegram/disconnect');
  return data;
};

export const toggleAlert = async (id: string): Promise<Alert> => {
  const { data } = await api.patch<ApiAlert>(`/alerts/${id}/toggle`);
  return mapAlert(data);
};

export const verifyApifyToken = async (token: string): Promise<{ valid: boolean; username?: string }> => {
  const { data } = await api.post<{ valid: boolean; username?: string }>('/verify-apify-token', { token });
  return data;
};
