import axios from 'axios';
import { authHeaders } from './auth';
import type { Channel, Message } from '../types';

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
  // 백엔드가 내림차순으로 반환하는 경우 오름차순(오래된 → 최신)으로 정렬
  return (res.data as Message[]).sort((a, b) => a.id - b.id);
}

export async function readChannel(channelId: number, messageId: number): Promise<void> {
  await axios.patch(
    `${BASE}/api/messages/channels/${channelId}/read`,
    { messageId },
    { headers: authHeaders() }
  );
}

export async function inviteChannelMember(channelId: number, email: string): Promise<void> {
  await axios.post(
    `${BASE}/api/channels/${channelId}/members`,
    { email },
    { headers: authHeaders() }
  );
}

/** 403이면 null 반환 (채널 멤버가 아님) */
export async function getChannelMyRole(channelId: number): Promise<'OWNER' | 'MEMBER' | null> {
  try {
    const res = await axios.get(`${BASE}/api/channels/${channelId}/my-role`, {
      headers: authHeaders(),
    });
    return res.data.role ?? res.data;
  } catch {
    return null;
  }
}
