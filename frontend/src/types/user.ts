export interface User {
  id: number;
  username: string;
  telegram_chat_id?: string | null;
  telegram_connected_at?: string | null;
  apify_token?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginReq {
  username: string;
  password: string;
}

export interface RegisterReq {
  username: string;
  password: string;
}

export interface SettingsReq {
  telegram_chat_id?: string | null;
  apify_token?: string | null;
}
