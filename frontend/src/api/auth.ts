import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

export function authHeaders() {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  userId: number;
  email: string;
  name: string;
}

interface RefreshResponse {
  token: string;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function mapAuthResponse(data: AuthResponse): { token: string; refreshToken: string; user: User } {
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: {
      id: data.userId,
      email: data.email,
      name: data.name,
    },
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: User }> {
  const res = await axios.post<AuthResponse>(`${BASE}/api/auth/login`, { email, password });
  return mapAuthResponse(res.data);
}

export async function signup(
  email: string,
  password: string,
  name: string
): Promise<{ token: string; refreshToken: string; user: User }> {
  const res = await axios.post<AuthResponse>(`${BASE}/api/auth/signup`, { email, password, name });
  return mapAuthResponse(res.data);
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await axios.post(`${BASE}/api/auth/logout`, { refreshToken });
}

// ── 401 자동 토큰 갱신 인터셉터 ──────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // refresh 엔드포인트 자체 401 → 무한루프 방지
    if (originalRequest.url?.includes('/api/auth/refresh')) {
      return Promise.reject(error);
    }

    // 이미 재시도한 요청 → 그냥 실패
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // refresh 진행 중이면 큐에 대기
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return axios(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const state = useAuthStore.getState();

    if (!state.refreshToken || state.refreshToken === 'undefined') {
      isRefreshing = false;
      processQueue(new Error('No refresh token'), null);
      state.logout();
      return Promise.reject(error);
    }

    try {
      const res = await axios.post<RefreshResponse>(`${BASE}/api/auth/refresh`, {
        refreshToken: state.refreshToken,
      });
      const { token: newToken } = res.data;
      state.setAccessToken(newToken);
      processQueue(null, newToken);
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return axios(originalRequest);
    } catch (err: unknown) {
      console.error('Token refresh failed:', err);
      processQueue(err, null);
      useAuthStore.getState().logout();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
