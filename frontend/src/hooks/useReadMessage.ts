import { useEffect, useRef, useCallback } from 'react';
import { readChannel } from '../api/channel';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useChatStore } from '../stores/chatStore';

export function useReadMessage(channelId: number | null) {
  const { updateChannelUnread } = useWorkspaceStore();
  const { messages } = useChatStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const markRead = useCallback(() => {
    if (!channelId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      readChannel(channelId).then(() => {
        updateChannelUnread(channelId, 0);
      });
    }, 1000);
  }, [channelId, updateChannelUnread]);

  // Mark read on channel entry
  useEffect(() => {
    markRead();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [channelId, markRead]);

  // Intersection observer for bottom of message list
  const setBottomRef = useCallback(
    (node: HTMLDivElement | null) => {
      bottomRef.current = node;
      observerRef.current?.disconnect();

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && messages.length > 0) {
            markRead();
          }
        },
        { threshold: 1.0 },
      );
      observerRef.current.observe(node);
    },
    [markRead, messages.length],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { setBottomRef };
}
