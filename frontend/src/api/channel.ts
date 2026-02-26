import axios from 'axios';
import { authHeaders } from './auth';
import type { Channel, Message, ChannelMember } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function getChannels(workspaceId: number): Promise<Channel[]> {
  const res = await axios.get(`${BASE}/api/channels/workspaces/${workspaceId}/channels`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function createChannel(
  workspaceId: number,
  name: string,
  visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  description?: string
): Promise<Channel> {
  const res = await axios.post(
    `${BASE}/api/channels`,
    { workspaceId, name, visibility, description },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getMessages(
  channelId: number,
  opts?: { beforeMessageId?: number; afterMessageId?: number; limit?: number }
): Promise<Message[]> {
  const res = await axios.get(`${BASE}/api/messages/channels/${channelId}/messages`, {
    headers: authHeaders(),
    params: {
      beforeMessageId: opts?.beforeMessageId,
      afterMessageId: opts?.afterMessageId,
      limit: opts?.limit,
    },
  });
  return res.data;
}

export async function readChannel(channelId: number, messageId: number): Promise<void> {
  await axios.patch(
    `${BASE}/api/messages/channels/${channelId}/read`,
    { messageId },
    { headers: authHeaders() }
  );
}

export async function getMembers(channelId: number): Promise<ChannelMember[]> {
  const res = await axios.get(`${BASE}/api/channels/${channelId}/members`, { headers: authHeaders() });
  return res.data;
}
