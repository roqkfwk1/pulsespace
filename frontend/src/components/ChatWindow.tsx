import { Fragment, useEffect, useLayoutEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hash, Users, Loader2, CheckCircle2, CornerDownRight, Smile, MoreHorizontal, Pencil, Trash2, X, UserPlus, Lock, ArrowDown } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useReadMessage } from '../hooks/useReadMessage';
import { getMessages, inviteChannelMember, getChannelMyRole, editMessage, deleteMessage } from '../api/channel';
import { formatTime, formatDate, getKSTDateStr, isToday, minutesDiff } from '../utils/format';
import MessageInput from './MessageInput';
import Modal from './Modal';
import type { Message } from '../types';

interface Props {
  onSend: (content: string, replyTo?: Message) => void;
  onToggleMembers: () => void;
  showMembers: boolean;
}

export default function ChatWindow({ onSend, onToggleMembers, showMembers }: Props) {
  const { messages, connectionStatus, setMessages, updateMessage, prependMessages } = useChatStore();
  const { currentChannelId, channels } = useWorkspaceStore();
  const currentChannel = channels.find((c) => c.id === currentChannelId);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const loadingMoreRef = useRef(false);
  const scrollAnchorRef = useRef<number | null>(null);
  const initialScrollPendingRef = useRef(false);
  const pendingScrollToBottomRef = useRef(false);
  const lastMsgIdRef = useRef<number | null>(null);
  const [showSynced, setShowSynced] = useState(false);
  const prevStatusRef = useRef(connectionStatus);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [showChInvite, setShowChInvite] = useState(false);
  const [notMember, setNotMember] = useState(false);
  const [channelRole, setChannelRole] = useState<'OWNER' | 'MEMBER' | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setBottomRef } = useReadMessage(currentChannelId);

  // 렌더마다 인라인 함수가 재생성되면 IntersectionObserver가 매번 재연결됨 → useCallback으로 안정화
  const endRefCallback = useCallback((el: HTMLDivElement | null) => {
    messagesEndRef.current = el;
    setBottomRef(el);
  }, [setBottomRef]);

  // Load initial messages when channel changes
  useEffect(() => {
    if (!currentChannelId) return;
    let cancelled = false;

    setMessages([]);
    setReplyingTo(null);
    setEditingMessageId(null);
    setDeletingMessageId(null);
    setNotMember(false);
    setChannelRole(null);
    setHasMore(true);
    setShowNewMsgBtn(false);
    lastMsgIdRef.current = null;
    pendingScrollToBottomRef.current = false;
    initialScrollPendingRef.current = false;
    setLoadingInitial(true);

    getChannelMyRole(currentChannelId).then((role) => {
      if (!cancelled) setChannelRole(role);
    });

    getMessages(currentChannelId, { limit: 50 })
      .then((msgs) => {
        if (cancelled) return;
        initialScrollPendingRef.current = true;
        setMessages(msgs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 400 || status === 403) {
          setNotMember(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId]);

  // 새 메시지 수신 시 스크롤 처리 + 새 메시지 버튼
  useEffect(() => {
    if (messages.length === 0) { lastMsgIdRef.current = null; return; }
    const container = scrollContainerRef.current;
    if (!container) return;

    const lastMsg = messages[messages.length - 1];
    // prepend 케이스: 마지막 메시지가 바뀌지 않았으면 무시
    if (lastMsg.id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = lastMsg.id;

    // 초기 로드는 useLayoutEffect가 처리
    if (initialScrollPendingRef.current) return;

    // 내가 보낸 메시지면 무조건 맨 아래로
    if (pendingScrollToBottomRef.current) {
      pendingScrollToBottomRef.current = false;
      setShowNewMsgBtn(false);
      scrollToBottom();
      return;
    }

    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) {
      setShowNewMsgBtn(false);
      scrollToBottom();
    } else {
      setShowNewMsgBtn(true);
    }
  }, [messages.length]);

  // Synced banner
  useEffect(() => {
    if (prevStatusRef.current !== 'CONNECTED' && connectionStatus === 'CONNECTED' && messages.length > 0) {
      setShowSynced(true);
      const t = setTimeout(() => setShowSynced(false), 2000);
      prevStatusRef.current = connectionStatus;
      return () => clearTimeout(t);
    }
    prevStatusRef.current = connectionStatus;
  }, [connectionStatus, messages.length]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // 초기 진입 스크롤 + prepend 후 스크롤 위치 복원
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (initialScrollPendingRef.current && messages.length > 0) {
      // 채널 진입 시 즉시 맨 아래로
      container.scrollTop = container.scrollHeight;
      initialScrollPendingRef.current = false;
      lastMsgIdRef.current = messages[messages.length - 1].id;
      return;
    }

    if (scrollAnchorRef.current !== null) {
      // 이전 메시지 prepend 후 스크롤 위치 유지
      container.scrollTop = container.scrollHeight - scrollAnchorRef.current;
      scrollAnchorRef.current = null;
    }
  }, [messages]);

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore || !currentChannelId || messages.length === 0) return;
    const oldestId = messages[0].id;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const older = await getMessages(currentChannelId, { cursorId: oldestId });
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        const container = scrollContainerRef.current;
        if (container) scrollAnchorRef.current = container.scrollHeight;
        prependMessages(older);
      }
    } catch {
      // silently fail
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!loadingMoreRef.current && container.scrollTop < 100) void loadMore();
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom && showNewMsgBtn) setShowNewMsgBtn(false);
  }

  function scrollToMessage(messageId: number) {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedMessageId(messageId);
    highlightTimerRef.current = setTimeout(() => setHighlightedMessageId(null), 1500);
  }

  function handleSend(content: string) {
    onSend(content, replyingTo ?? undefined);
    setReplyingTo(null);
    pendingScrollToBottomRef.current = true;
  }

  async function handleEditSave(messageId: number, content: string) {
    try {
      const updated = await editMessage(messageId, content);
      updateMessage(messageId, { content, editedAt: updated.editedAt ?? new Date().toISOString() });
      setEditingMessageId(null);
    } catch {
      setEditingMessageId(null);
    }
  }

  async function handleDelete(messageId: number) {
    try {
      await deleteMessage(messageId);
      updateMessage(messageId, { isDeleted: true, deletedAt: new Date().toISOString() });
    } catch {
      // silently fail
    }
  }

  const canInvite = channelRole === 'OWNER';

  return (
    <div className="flex-1 flex flex-col bg-base min-w-0">
      {/* Header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-line bg-surface shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: currentChannel?.color ?? '#14b8a6' }}
          >
            {currentChannel?.icon ? (
              <span className="text-sm">{currentChannel.icon}</span>
            ) : (
              <Hash className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-primary font-semibold text-sm leading-tight">{currentChannel?.name}</h3>
            {currentChannel?.description && (
              <p className="text-[11px] text-muted leading-tight">{currentChannel.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canInvite && (
            <button
              onClick={() => setShowChInvite(true)}
              className="p-1.5 text-secondary hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
              title="채널에 멤버 초대"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleMembers}
            className={`p-1.5 rounded-lg transition-colors ${
              showMembers ? 'bg-accent text-white' : 'text-secondary hover:bg-elevated'
            }`}
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Connection banners */}
      <AnimatePresence>
        {connectionStatus === 'RECONNECTING' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-warning text-white text-center text-sm py-2 font-medium z-20"
          >
            <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
            재연결 중...
          </motion.div>
        )}
        {connectionStatus === 'DISCONNECTED' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-danger text-white text-center text-sm py-2 font-medium z-20"
          >
            연결이 끊어졌습니다
          </motion.div>
        )}
        {showSynced && connectionStatus === 'CONNECTED' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-success text-white text-center text-sm py-2 font-medium z-20"
          >
            <CheckCircle2 className="inline w-4 h-4 mr-2" />
            동기화 완료
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 relative">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto"
      >
        {notMember ? (
          <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted" />
            </div>
            <div className="text-center">
              <p className="text-primary font-semibold">채널 멤버가 아닙니다</p>
              <p className="text-sm text-muted mt-1">이 채널에 참여하려면 초대를 받아야 합니다</p>
            </div>
          </div>
        ) : (
          <>
        {loadingInitial && (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        )}
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        )}
        {!loadingMore && !hasMore && messages.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted">채널의 시작입니다</span>
            <div className="flex-1 h-px bg-line" />
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const senderChanged = !prev
            || prev.senderId !== msg.senderId
            || prev.senderName !== msg.senderName;
          const showSender = senderChanged
            || (!!prev && minutesDiff(prev.createdAt, msg.createdAt) >= 5)
            || !!msg.replyToId;
          const showDateSeparator =
            (i === 0 && !isToday(msg.createdAt)) ||
            (prev !== null && getKSTDateStr(msg.createdAt) !== getKSTDateStr(prev.createdAt));

          return (
            <Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-xs text-muted">{formatDate(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
              )}
              <div
                id={`message-${msg.id}`}
                className={`group relative transition-colors duration-300 ${
                  showSender ? 'pt-3' : 'pt-0.5'
                } ${
                  highlightedMessageId === msg.id
                    ? 'bg-accent/10'
                    : 'hover:bg-elevated/40'
                }`}
              >
              <div className="flex items-start gap-3 px-4">
                {/* Avatar or hover timestamp */}
                <div className="w-9 shrink-0">
                  {showSender ? (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {msg.senderName.charAt(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted block text-right pt-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {showSender && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-[15px] text-primary">{msg.senderName}</span>
                      <span className="text-xs text-muted">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}

                  {/* Reply reference - 미니 아바타 + 이름 + 내용 한 줄 */}
                  {msg.replyToId && (
                    <div
                      className="flex items-center gap-1.5 mb-1.5 max-w-[85%] cursor-pointer group/quote"
                      onClick={() => scrollToMessage(msg.replyToId!)}
                    >
                      <div className="w-0.5 self-stretch bg-secondary rounded-full shrink-0 group-hover/quote:bg-accent transition-colors" />
                      {(() => {
                        const originalMsg = messages.find((m) => m.id === msg.replyToId);
                        const name = originalMsg?.senderName ?? msg.replyToSenderName;

                        if (!name && !originalMsg) {
                          return (
                            <span className="text-xs text-muted italic">
                              원본 메시지를 찾을 수 없습니다.
                            </span>
                          );
                        }

                        const isDeleted = originalMsg?.isDeleted;
                        const content = isDeleted
                          ? '삭제된 메시지입니다.'
                          : (originalMsg?.content ?? msg.replyToContent ?? '');

                        return (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-4 h-4 rounded shrink-0 bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white leading-none">
                                {name!.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-secondary shrink-0 group-hover/quote:text-primary transition-colors">
                              {name}
                            </span>
                            <span className={`text-xs text-muted truncate ${isDeleted ? 'italic' : ''}`}>
                              {content}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {msg.isDeleted ? (
                    <p className="text-[15px] text-muted italic leading-relaxed">
                      이 메시지는 삭제되었습니다.
                    </p>
                  ) : editingMessageId === msg.id ? (
                    <InlineEditInput
                      initialContent={msg.content}
                      onSave={(content) => handleEditSave(msg.id, content)}
                      onCancel={() => setEditingMessageId(null)}
                    />
                  ) : (
                    <p className="text-[15px] text-primary leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                      {msg.editedAt && <span className="text-[11px] text-muted ml-1">(수정됨)</span>}
                    </p>
                  )}
                </div>

                {/* Hover actions */}
                {!msg.isDeleted && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0 pt-1">
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1.5 hover:bg-base rounded-lg transition-colors"
                    title="답장"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-secondary" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-base rounded-lg transition-colors"
                    title="이모지 반응"
                  >
                    <Smile className="w-3.5 h-3.5 text-secondary" />
                  </button>
                  {msg.senderId === currentUserId && (
                    <MessageMenu
                      onEdit={() => setEditingMessageId(msg.id)}
                      onDelete={() => setDeletingMessageId(msg.id)}
                    />
                  )}
                </div>
                )}
              </div>

              {/* Inline reply input */}
              <AnimatePresence>
                {replyingTo?.id === msg.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <InlineReplyInput
                      replyTo={msg}
                      onSend={(content) => {
                        onSend(content, msg);
                        setReplyingTo(null);
                      }}
                      onCancel={() => setReplyingTo(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </Fragment>
          );
        })}

        <div ref={endRefCallback} />
          </>
        )}
      </div>

      {/* New message button */}
      <AnimatePresence>
        {showNewMsgBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={() => { scrollToBottom(); setShowNewMsgBtn(false); }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-white text-sm font-medium rounded-full shadow-lg z-30 hover:bg-accent-hover transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            새 메시지
          </motion.button>
        )}
      </AnimatePresence>
      </div>

      {/* Reply indicator in main input */}
      {!notMember && replyingTo && (
        <div className="px-4 pt-2 flex items-center gap-2 text-xs text-muted bg-base border-t border-line">
          <CornerDownRight className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">
            <span className="font-medium text-accent">{replyingTo.senderName}</span>
            님에게 답장: {replyingTo.content}
          </span>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-0.5 hover:bg-elevated rounded shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      {!notMember && <MessageInput onSend={handleSend} channelName={currentChannel?.name} />}

      {/* Channel Invite Modal */}
      <InviteChannelMemberModal
        isOpen={showChInvite}
        onClose={() => setShowChInvite(false)}
        channelId={currentChannelId}
        channelName={currentChannel?.name}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deletingMessageId !== null}
        onClose={() => setDeletingMessageId(null)}
        onConfirm={() => {
          if (deletingMessageId !== null) handleDelete(deletingMessageId);
        }}
      />
    </div>
  );
}

function InviteChannelMemberModal({
  isOpen,
  onClose,
  channelId,
  channelName,
}: {
  isOpen: boolean;
  onClose: () => void;
  channelId: number | null;
  channelName?: string;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!channelId || !email.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await inviteChannelMember(channelId, email.trim());
      setSuccess('멤버를 초대했습니다');
      setEmail('');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? '초대에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`#${channelName ?? '채널'}에 멤버 초대`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 border border-danger/30 bg-danger/10 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 border border-success/30 bg-success/10 rounded-xl text-success text-sm">
            {success}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            이메일 주소 <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            required
            placeholder="user@example.com"
            className="w-full px-3.5 py-2.5 bg-base border border-line rounded-xl text-primary placeholder:text-muted focus:border-accent focus:outline-none transition-colors text-[15px]"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '초대 중...' : '초대'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MessageMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 hover:bg-base rounded-lg transition-colors"
        title="더보기"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-secondary" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-28 bg-surface border border-line rounded-xl shadow-lg z-50 overflow-hidden py-1">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-elevated transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            수정
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-elevated transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="메시지 삭제">
      <p className="text-secondary text-sm mb-6">이 메시지를 삭제하시겠습니까?<br />삭제된 메시지는 복구할 수 없습니다.</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-secondary hover:text-primary transition-colors"
        >
          취소
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="px-4 py-2 bg-danger text-white font-medium rounded-xl hover:bg-danger/90 transition-colors"
        >
          삭제
        </button>
      </div>
    </Modal>
  );
}

function InlineEditInput({
  initialContent,
  onSave,
  onCancel,
}: {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialContent);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) onSave(text.trim());
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div className="border border-accent/50 rounded-xl p-2 bg-surface">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-[15px] text-primary placeholder:text-muted resize-none outline-none leading-relaxed"
        rows={2}
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-muted">
          <kbd className="px-1 py-0.5 bg-elevated rounded text-[10px]">Enter</kbd> 저장
          <span className="mx-1">·</span>
          <kbd className="px-1 py-0.5 bg-elevated rounded text-[10px]">Esc</kbd> 취소
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-secondary hover:text-primary transition-colors rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => { if (text.trim()) onSave(text.trim()); }}
            disabled={!text.trim()}
            className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-30"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineReplyInput({
  replyTo,
  onSend,
  onCancel,
}: {
  replyTo: Message;
  onSend: (content: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text.trim());
        setText('');
      }
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div className="mt-1 ml-16 mr-4 mb-2 bg-surface border border-accent/30 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-2 text-xs text-muted">
        <CornerDownRight className="w-3 h-3 text-accent" />
        <span className="font-medium text-accent">{replyTo.senderName}</span>
        <span>님에게 답장</span>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-[15px] text-primary placeholder:text-muted resize-none outline-none leading-relaxed"
        placeholder="답장 입력... (Enter로 전송, Esc로 취소)"
        rows={2}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted">
          <kbd className="px-1 py-0.5 bg-elevated rounded text-[10px]">Enter</kbd> 전송
          <span className="mx-1">·</span>
          <kbd className="px-1 py-0.5 bg-elevated rounded text-[10px]">Esc</kbd> 취소
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-secondary hover:text-primary transition-colors rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (text.trim()) {
                onSend(text.trim());
                setText('');
              }
            }}
            disabled={!text.trim()}
            className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-30"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
