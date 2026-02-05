import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { Workspace } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const res = await axios.get(`${BASE}/api/workspaces`, { headers: authHeaders() });
  return res.data;
}
