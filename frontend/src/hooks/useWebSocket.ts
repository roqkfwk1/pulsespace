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

  const { addMessage, syncMessages, setConnectionStatus } = useChatStore();
  const { currentChannelId, updateChannelLatestMessage } = useWorkspaceStore();

  // Ref to always capture the latest currentChannelId inside async callbacks
  const currentChannelIdRef = useRef(currentChannelId);
  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  // Connect on mount
  useEffect(() => {
    const client = connectStomp((status) => {
      setConnectionStatus(status);

      if (status === 'CONNECTED') {
        reconnectCountRef.current = 0;

        // (Re)subscribe to the current channel immediately on connect/reconnect
        const chId = currentChannelIdRef.current;
        if (chId) {
          unsubRef.current?.();
          unsubRef.current = subscribeChannel(
            chId,
            (msg: Message) => {
              addMessage(msg);
              updateChannelLatestMessage(msg.channelId, msg.content, msg.createdAt);
            },
            client,
          );
        }

        // Sync missed messages on reconnect
        const { lastReceivedMessageId } = useChatStore.getState();
        if (chId && lastReceivedMessageId) {
          getMessages(chId, { afterMessageId: lastReceivedMessageId, limit: 100 })
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

  // When channel changes and STOMP is already connected, re-subscribe immediately
  useEffect(() => {
    if (!currentChannelId || !clientRef.current?.connected) return;

    unsubRef.current?.();
    unsubRef.current = subscribeChannel(
      currentChannelId,
      (msg: Message) => {
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
