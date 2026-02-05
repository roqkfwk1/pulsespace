import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { connectStomp, disconnectStomp, subscribeChannel, sendMessage } from '../api/websocket';
import { getMessages } from '../api/channel';
import { useChatStore } from '../stores/chatStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Message } from '../types';

export function useWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const reconnectCountRef = useRef(0);
  const maxReconnect = 5;

  const { addMessage, syncMessages, setConnectionStatus, lastReceivedMessageId } = useChatStore();
  const { currentChannelId, updateChannelLatestMessage } = useWorkspaceStore();

  // Connect on mount
  useEffect(() => {
    const client = connectStomp((status) => {
      setConnectionStatus(status);

      if (status === 'CONNECTED') {
        reconnectCountRef.current = 0;
        // Sync missed messages on reconnect
        if (currentChannelId && lastReceivedMessageId) {
          getMessages(currentChannelId, { afterMessageId: lastReceivedMessageId, limit: 100 })
            .then(syncMessages)
            .catch(() => {});
        }
      }

      if (status === 'RECONNECTING') {
        reconnectCountRef.current += 1;
        if (reconnectCountRef.current > maxReconnect) {
          setConnectionStatus('DISCONNECTED');
        }
      }
    });
    clientRef.current = client;

    return () => {
      disconnectStomp();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to current channel
  useEffect(() => {
    if (!currentChannelId) return;

    unsubRef.current?.();
    unsubRef.current = subscribeChannel(
      currentChannelId,
      (msg) => {
        addMessage(msg);
        updateChannelLatestMessage(msg.channelId, msg.content, msg.createdAt);
      },
      clientRef.current,
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId]);

  const send = useCallback(
    async (content: string, replyTo?: Message) => {
      if (!currentChannelId) return;
      await sendMessage(currentChannelId, content, replyTo);
    },
    [currentChannelId],
  );

  return { send };
}
