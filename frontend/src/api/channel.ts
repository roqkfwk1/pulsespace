import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { Channel, Message, ChannelMember } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
}

export async function getChannels(workspaceId: number): Promise<Channel[]> {
  const res = await axios.get(`${BASE}/api/workspaces/${workspaceId}/channels`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getMessages(
  channelId: number,
  opts?: { beforeMessageId?: number; afterMessageId?: number; limit?: number }
): Promise<Message[]> {
  const res = await axios.get(`${BASE}/api/channels/${channelId}/messages`, {
    headers: authHeaders(),
    params: {
      beforeMessageId: opts?.beforeMessageId,
      afterMessageId: opts?.afterMessageId,
      limit: opts?.limit,
    },
  });
  return res.data;
}

export async function readChannel(channelId: number): Promise<void> {
  await axios.post(`${BASE}/api/channels/${channelId}/read`, null, {
    headers: authHeaders(),
  });
}

export async function getMembers(channelId: number): Promise<ChannelMember[]> {
  const res = await axios.get(`${BASE}/api/channels/${channelId}/members`, { headers: authHeaders() });
  return res.data;
}
