import axios from 'axios';
import { authHeaders } from './auth';
import type { Workspace, WorkspaceMember } from '../types';

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

export async function inviteWorkspaceMember(workspaceId: number, email: string): Promise<void> {
  await axios.post(
    `${BASE}/api/workspaces/${workspaceId}/members`,
    { email },
    { headers: authHeaders() }
  );
}

export async function getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
  const res = await axios.get(`${BASE}/api/workspaces/${workspaceId}/members`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getWorkspaceMyRole(workspaceId: number): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> {
  const res = await axios.get(`${BASE}/api/workspaces/${workspaceId}/my-role`, {
    headers: authHeaders(),
  });
  return res.data.role ?? res.data;
}
