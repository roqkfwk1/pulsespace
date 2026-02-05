import axios from 'axios';
import type { User } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await axios.post(`${BASE}/api/auth/login`, { email, password });
  return res.data;
}
