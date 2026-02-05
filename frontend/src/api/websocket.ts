import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../stores/authStore';
import type { Message } from '../types';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL;

let stompClient: Client | null = null;

export function connectStomp(
  onStatusChange: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void,
): Client | null {
  const token = useAuthStore.getState().token;
  const client = new Client({
    brokerURL: WS_BASE,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => onStatusChange('CONNECTED'),
    onDisconnect: () => onStatusChange('DISCONNECTED'),
    onStompError: () => onStatusChange('DISCONNECTED'),
    onWebSocketClose: () => onStatusChange('RECONNECTING'),
  });

  onStatusChange('CONNECTING');
  client.activate();
  stompClient = client;
  return client;
}

export function disconnectStomp() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}

export function subscribeChannel(
  channelId: number,
  onMessage: (message: Message) => void,
  client?: Client | null,
): () => void {
  if (!client) return () => {};

  const sub = client.subscribe(`/topic/channels/${channelId}`, (frame) => {
    const msg: Message = JSON.parse(frame.body);
    onMessage(msg);
  });

  return () => sub.unsubscribe();
}

export async function sendMessage(channelId: number, content: string, replyTo?: Message): Promise<void> {
  if (stompClient?.connected) {
    stompClient.publish({
      destination: `/app/channels/${channelId}/messages`,
      body: JSON.stringify({
        content,
        ...(replyTo && { replyToId: replyTo.id }),
      }),
    });
  }
}
