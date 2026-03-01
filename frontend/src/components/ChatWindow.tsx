import { Fragment, useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hash, Users, Loader2, CheckCircle2, CornerDownRight, Smile, MoreHorizontal, X, UserPlus, Lock } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useReadMessage } from '../hooks/useReadMessage';
import { getMessages, inviteChannelMember, getChannelMyRole } from '../api/channel';
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
  const { messages, connectionStatus, setMessages, prependMessages } = useChatStore();
  const { currentChannelId, channels } = useWorkspaceStore();
  const currentChannel = channels.find((c) => c.id === currentChannelId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showSynced, setShowSynced] = useState(false);
  const prevStatusRef = useRef(connectionStatus);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showChInvite, setShowChInvite] = useState(false);
  const [notMember, setNotMember] = useState(false);
  const [channelRole, setChannelRole] = useState<'OWNER' | 'MEMBER' | null>(null);

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
    setHasMore(true);
    setReplyingTo(null);
    setNotMember(false);
    setChannelRole(null);
    setLoadingInitial(true);

    getChannelMyRole(currentChannelId).then((role) => {
      if (!cancelled) setChannelRole(role);
    });

    getMessages(currentChannelId, { limit: 50 })
      .then((msgs) => {
        if (cancelled) return;
        setMessages(msgs);
        setTimeout(() => scrollToBottom(), 50);
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

  // Auto-scroll on new message if near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) scrollToBottom();
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

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || loadingInitial || loadingOlder || !hasMore || !currentChannelId) return;
    if (container.scrollTop < 100) {
      const firstMsg = messages[0];
      if (!firstMsg) return;
      setLoadingOlder(true);
      const prevHeight = container.scrollHeight;
      getMessages(currentChannelId, { beforeMessageId: firstMsg.id, limit: 20 }).then(
        (older) => {
          if (older.length === 0) {
            setHasMore(false);
          } else {
            prependMessages(older);
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight - prevHeight;
            });
          }
          setLoadingOlder(false);
        },
      );
    }
  }, [loadingInitial, loadingOlder, hasMore, currentChannelId, messages, prependMessages]);

  function handleSend(content: string) {
    const reply = replyingTo;
    setReplyingTo(null);
    onSend(content, reply ?? undefined);
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
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
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
        {loadingOlder && (
          <div className="text-center text-muted text-sm py-3">
            <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
            이전 메시지 불러오는 중...
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const senderChanged = !prev
            || prev.senderUserId !== msg.senderUserId
            || prev.senderName !== msg.senderName;
          const showSender = senderChanged
            || (!!prev && minutesDiff(prev.createdAt, msg.createdAt) >= 5);
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
                className={`group relative hover:bg-elevated/40 transition-colors ${
                  showSender ? 'pt-3' : 'pt-0.5'
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

                  {/* Reply reference */}
                  {msg.replyToId && msg.replyToSenderName && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs text-muted">
                      <CornerDownRight className="w-3 h-3 text-accent" />
                      <span className="font-medium text-accent">{msg.replyToSenderName}</span>
                      <span className="truncate max-w-[200px] opacity-70">{msg.replyToContent}</span>
                    </div>
                  )}

                  <p className="text-[15px] text-primary leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                </div>

                {/* Hover actions */}
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
                  <button
                    className="p-1.5 hover:bg-base rounded-lg transition-colors"
                    title="더보기"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-secondary" />
                  </button>
                </div>
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
