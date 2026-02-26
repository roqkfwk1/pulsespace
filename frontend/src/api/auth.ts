import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

export function authHeaders() {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
}

interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  name: string;
}

function mapAuthResponse(data: AuthResponse): { token: string; user: User } {
  return {
    token: data.token,
    user: {
      id: data.userId,
      email: data.email,
      name: data.name,
    },
  };
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await axios.post<AuthResponse>(`${BASE}/api/auth/login`, { email, password });
  return mapAuthResponse(res.data);
}

export async function signup(
  email: string,
  password: string,
  name: string
): Promise<{ token: string; user: User }> {
  const res = await axios.post<AuthResponse>(`${BASE}/api/auth/signup`, { email, password, name });
  return mapAuthResponse(res.data);
}
