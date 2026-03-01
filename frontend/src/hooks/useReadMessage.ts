import { useEffect, useRef, useCallback } from 'react';
import { readChannel } from '../api/channel';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useChatStore } from '../stores/chatStore';

export function useReadMessage(channelId: number | null) {
  const { updateChannelUnread } = useWorkspaceStore();
  const lastReadIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const markRead = useCallback(() => {
    if (!channelId) return;
    const messages = useChatStore.getState().messages;
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.id === lastReadIdRef.current) return;

    // 낙관적 업데이트: 타이머 실행 전에 기록하여 동일 메시지로 재진입 방지
    lastReadIdRef.current = lastMessage.id;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      readChannel(channelId, lastMessage.id).then(() => {
        updateChannelUnread(channelId, 0);
      });
    }, 1000);
  }, [channelId, updateChannelUnread]);

  // 채널 진입 시 1회 호출
  useEffect(() => {
    lastReadIdRef.current = null;
    markRead();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [channelId, markRead]);

  // 스크롤 하단 IntersectionObserver — setBottomRef 안정적으로 유지
  const setBottomRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            markRead();
          }
        },
        { threshold: 1.0 },
      );
      observerRef.current.observe(node);
    },
    [markRead],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { setBottomRef };
}
