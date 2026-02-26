import axios from 'axios';
import { authHeaders } from './auth';
import type { Workspace } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function getWorkspaces(): Promise<Workspace[]> {
  const res = await axios.get(`${BASE}/api/workspaces`, { headers: authHeaders() });
  return res.data;
}

export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  const res = await axios.post(
    `${BASE}/api/workspaces`,
    { name, description },
    { headers: authHeaders() }
  );
  return res.data;
}
