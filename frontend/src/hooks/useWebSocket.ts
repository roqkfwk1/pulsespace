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

  const { addMessage, syncMessages, setConnectionStatus, updateMessage } = useChatStore();
  const { currentChannelId, updateChannelLatestMessage, updateChannelUnread, updateChannelHasUnread, updateWorkspaceHasUnread, channels } = useWorkspaceStore();

  // Ref to always capture the latest currentChannelId inside async callbacks
  const currentChannelIdRef = useRef(currentChannelId);
  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  const channelsRef = useRef(channels);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  // Subscriptions for all channels in the current workspace (background unread tracking)
  const allChannelUnsubsRef = useRef<Map<number, () => void>>(new Map());

  function handleBackgroundMessage(channelId: number, msg: Message) {
    if (msg.type && msg.type !== 'CREATED') return;
    const { channels, currentWorkspace } = useWorkspaceStore.getState();
    const ch = channels.find((c) => c.id === channelId);
    updateChannelUnread(channelId, (ch?.unreadCount ?? 0) + 1);
    updateChannelHasUnread(channelId, true);
    updateChannelLatestMessage(channelId, msg.content, msg.createdAt);
    if (currentWorkspace) {
      updateWorkspaceHasUnread(currentWorkspace.id, true);
    }
  }

  function syncAllChannelSubscriptions(client: Client) {
    const activeId = currentChannelIdRef.current;

    // Unsubscribe channels no longer in the list or now active
    for (const [chId, unsub] of allChannelUnsubsRef.current) {
      if (chId === activeId || !channelsRef.current.some((c) => c.id === chId)) {
        unsub();
        allChannelUnsubsRef.current.delete(chId);
      }
    }

    // Subscribe all non-active channels where user is a member
    for (const ch of channelsRef.current) {
      if (ch.id === activeId) continue;
      if (!ch.member) continue;
      if (!allChannelUnsubsRef.current.has(ch.id)) {
        const unsub = subscribeChannel(
          ch.id,
          (msg) => handleBackgroundMessage(ch.id, msg),
          client,
        );
        allChannelUnsubsRef.current.set(ch.id, unsub);
      }
    }
  }

  function handleMessage(msg: Message) {
    if (msg.type === 'UPDATED') {
      updateMessage(msg.id, msg);
    } else if (msg.type === 'DELETED') {
      updateMessage(msg.id, { isDeleted: true, deletedAt: msg.deletedAt });
    } else {
      addMessage(msg);
      updateChannelLatestMessage(msg.channelId, msg.content, msg.createdAt);
    }
  }

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
          unsubRef.current = subscribeChannel(chId, handleMessage, client);
        }

        // Subscribe all workspace channels for unread tracking
        syncAllChannelSubscriptions(client);

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
      allChannelUnsubsRef.current.forEach((unsub) => unsub());
      allChannelUnsubsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When channel changes and STOMP is already connected, re-subscribe immediately
  useEffect(() => {
    if (!currentChannelId || !clientRef.current?.connected) return;

    unsubRef.current?.();
    unsubRef.current = subscribeChannel(currentChannelId, handleMessage, clientRef.current);

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId]);

  // Sync all-channel subscriptions when workspace channels change or active channel changes
  useEffect(() => {
    if (!clientRef.current?.connected) return;
    syncAllChannelSubscriptions(clientRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, currentChannelId]);

  const send = useCallback(
    async (content: string, replyTo?: Message) => {
      if (!currentChannelId) return;
      await sendMessage(currentChannelId, content, replyTo);
    },
    [currentChannelId],
  );

  return { send };
}
