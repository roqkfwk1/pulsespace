import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../stores/authStore';
import type { Message } from '../types';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL as string;

let stompClient: Client | null = null;

export function connectStomp(
  onStatusChange: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void,
): Client | null {
  const token = useAuthStore.getState().token ?? localStorage.getItem('token');

  const client = new Client({
    brokerURL: WS_BASE,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => onStatusChange('CONNECTED'),
    onDisconnect: () => onStatusChange('DISCONNECTED'),
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers.message);
      onStatusChange('DISCONNECTED');
    },
    onWebSocketClose: () => onStatusChange('RECONNECTING'),
    onWebSocketError: (event) => {
      console.error('WebSocket error:', event);
      onStatusChange('DISCONNECTED');
    },
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
  // Guard: only subscribe if client is actually connected
  if (!client?.connected) return () => {};

  const sub = client.subscribe(`/topic/channels/${channelId}`, (frame) => {
    const msg: Message = JSON.parse(frame.body);
    onMessage(msg);
  });

  return () => sub.unsubscribe();
}

export async function sendMessage(channelId: number, content: string, replyTo?: Message): Promise<void> {
  if (stompClient?.connected) {
    stompClient.publish({
      destination: '/app/messages',
      body: JSON.stringify({
        channelId: Number(channelId),
        content,
        replyToId: replyTo?.id ?? null,
      }),
    });
  }
}
