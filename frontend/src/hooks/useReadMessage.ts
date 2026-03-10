import { useEffect, useRef, useCallback } from 'react';
import { readChannel } from '../api/channel';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useChatStore } from '../stores/chatStore';

export function useReadMessage(channelId: number | null) {
  const { updateChannelUnread, updateChannelHasUnread } = useWorkspaceStore();
  const lastReadIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // 채널 진입 후 메시지 최초 로드 시 읽음 처리 완료 여부
  const initialReadDoneRef = useRef(false);

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
        updateChannelHasUnread(channelId, false);
      });
    }, 1000);
  }, [channelId, updateChannelUnread, updateChannelHasUnread]);

  // 채널 진입 시 1회 호출 (이 시점에 메시지가 아직 없을 수 있으므로 실패해도 무방)
  useEffect(() => {
    lastReadIdRef.current = null;
    initialReadDoneRef.current = false;
    markRead();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [channelId, markRead]);

  // 채널 진입 후 메시지가 비동기로 로드될 때를 대비한 구독
  // setMessages([]) → getMessages() → setMessages(msgs) 순서로 호출되므로
  // 메시지가 처음 도착하는 시점에 초기 읽음 처리를 보장
  useEffect(() => {
    if (!channelId) return;
    const unsubscribe = useChatStore.subscribe((state) => {
      if (initialReadDoneRef.current) return;
      if (state.messages.length > 0) {
        initialReadDoneRef.current = true;
        markRead();
      }
    });
    return unsubscribe;
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
