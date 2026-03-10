import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Lock, Search, ChevronRight, Sparkles, Plus, Loader2, Trash2 } from 'lucide-react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { createChannel, getChannels, deleteChannel } from '../api/channel';
import { getWorkspaceMyRole } from '../api/workspace';
import type { Channel } from '../types';
import Modal from './Modal';

export default function ChannelSidebar() {
  const { wsId } = useParams<{ wsId: string }>();
  const navigate = useNavigate();
  const { channels, openTabs, openTab, setChannels, currentWorkspace, removeChannel, goHome } = useWorkspaceStore();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wsRole, setWsRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);

  useEffect(() => {
    if (!wsId) return;
    let cancelled = false;
    getWorkspaceMyRole(Number(wsId)).then((r) => { if (!cancelled) setWsRole(r); }).catch(() => { if (!cancelled) setWsRole(null); });
    return () => { cancelled = true; };
  }, [wsId]);

  async function handleChannelCreated() {
    setShowCreateModal(false);
    if (wsId) {
      const updatedChannels = await getChannels(Number(wsId));
      setChannels(updatedChannels);
    }
  }

  function handleChannelDeleted(channelId: number) {
    removeChannel(channelId);
    setDeleteTarget(null);
  }

  // "AI recommended" = channels sorted by unread + recency
  const frequentChannels = useMemo(() => {
    return [...channels]
      .sort((a, b) => {
        const scoreA = (a.unreadCount ?? 0) * 10 + (a.latestMessageAt ? new Date(a.latestMessageAt).getTime() : 0) / 1e12;
        const scoreB = (b.unreadCount ?? 0) * 10 + (b.latestMessageAt ? new Date(b.latestMessageAt).getTime() : 0) / 1e12;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [channels]);

  // All channels sorted by latest message
  const allChannels = useMemo(() => {
    const sorted = [...channels].sort((a, b) => {
      const ta = a.latestMessageAt ?? '';
      const tb = b.latestMessageAt ?? '';
      return tb.localeCompare(ta);
    });
    if (!search.trim()) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [channels, search]);

  const isTabOpen = (id: number) => openTabs.some((t) => t.channelId === id);

  function handleSelect(channel: Channel) {
    openTab(channel);
    if (wsId) {
      window.history.replaceState(null, '', `/workspaces/${wsId}/channels/${channel.id}`);
    }
  }

  const workspaceId = wsId ? Number(wsId) : null;
  const canDeleteChannel = wsRole === 'OWNER' || wsRole === 'ADMIN';

  function handleGoHome() {
    goHome();
    if (wsId) navigate(`/workspaces/${wsId}`);
  }

  return (
    <aside className="w-60 bg-surface border-r border-line flex flex-col shrink-0 h-full">
      {/* Workspace header: 전체 클릭 시 홈으로 이동 */}
      {currentWorkspace && (
        <button
          onClick={handleGoHome}
          className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-elevated transition-colors border-b border-line shrink-0 text-left w-full"
          title="워크스페이스 홈으로"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${currentWorkspace.colorStart ?? '#14b8a6'}, ${currentWorkspace.colorEnd ?? '#06b6d4'})`,
            }}
          >
            {currentWorkspace.icon ? (
              <span className="text-sm leading-none">{currentWorkspace.icon}</span>
            ) : (
              <span className="text-xs font-bold text-white">{currentWorkspace.name.charAt(0)}</span>
            )}
          </div>
          <span className="text-sm font-semibold text-primary truncate">{currentWorkspace.name}</span>
        </button>
      )}

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="채널 검색..."
            className="w-full pl-8 pr-3 py-1.5 bg-base text-primary placeholder:text-muted rounded-lg text-sm outline-none border border-line focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Frequent channels (AI recommended) */}
      {!search && (
        <div className="px-3 mb-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              자주 사용
            </h3>
            <Sparkles className="w-3 h-3 text-accent" />
          </div>
          {frequentChannels.map((ch) => (
            <ChannelItem
              key={ch.id}
              channel={ch}
              isOpen={isTabOpen(ch.id)}
              onSelect={() => handleSelect(ch)}
              canDelete={canDeleteChannel}
              onDeleteRequest={() => setDeleteTarget(ch)}
            />
          ))}
        </div>
      )}

      {/* All channels */}
      <div className="flex-1 overflow-y-auto">
        <Disclosure defaultOpen>
          {({ open }) => (
            <>
              <div className="flex items-center w-full hover:bg-elevated transition-colors">
                <DisclosureButton className="flex items-center gap-1.5 flex-1 px-4 py-1.5">
                  <ChevronRight className={`w-3 h-3 text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    채널
                  </span>
                  <span className="text-[10px] text-muted ml-auto">{allChannels.length}</span>
                </DisclosureButton>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-0.5 mr-3 rounded text-muted hover:text-primary transition-colors"
                  title="채널 추가"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <DisclosurePanel className="px-2 pb-2 space-y-0.5">
                {allChannels.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isOpen={isTabOpen(ch.id)}
                    onSelect={() => handleSelect(ch)}
                    canDelete={canDeleteChannel}
                    onDeleteRequest={() => setDeleteTarget(ch)}
                  />
                ))}
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </div>

      {/* Create Channel Modal */}
      {workspaceId && (
        <CreateChannelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workspaceId={workspaceId}
          onCreated={handleChannelCreated}
        />
      )}

      {/* Delete Channel Modal */}
      {deleteTarget && (
        <DeleteChannelModal
          channel={deleteTarget}
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => handleChannelDeleted(deleteTarget.id)}
        />
      )}
    </aside>
  );
}

function CreateChannelModal({
  isOpen,
  onClose,
  workspaceId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setLoading(true);
    try {
      await createChannel(workspaceId, name.trim(), visibility, description.trim() || undefined);
      setName('');
      setDescription('');
      setVisibility('PUBLIC');
      onCreated();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || '채널 생성에 실패했습니다.');
      } else {
        setError('채널 생성에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 채널 만들기">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 border border-danger/30 bg-danger/10 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            채널 이름 <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="일반"
              className="w-full pl-9 pr-3.5 py-2.5 bg-base border border-line rounded-xl text-primary placeholder:text-muted focus:border-accent focus:outline-none transition-colors text-[15px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">공개 설정</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility('PUBLIC')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                visibility === 'PUBLIC'
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-line bg-base text-secondary hover:border-accent/50'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span className="text-sm font-medium">공개</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('PRIVATE')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                visibility === 'PRIVATE'
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-line bg-base text-secondary hover:border-accent/50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">비공개</span>
            </button>
          </div>
          <p className="text-xs text-muted mt-1.5">
            {visibility === 'PUBLIC'
              ? '모든 워크스페이스 멤버가 참여할 수 있습니다.'
              : '초대된 멤버만 참여할 수 있습니다.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            설명 <span className="text-muted">(선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="채널에 대한 간단한 설명"
            rows={2}
            className="w-full px-3.5 py-2.5 bg-base border border-line rounded-xl text-primary placeholder:text-muted focus:border-accent focus:outline-none transition-colors text-[15px] resize-none"
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
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '생성 중...' : '만들기'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteChannelModal({
  channel,
  isOpen,
  onClose,
  onDeleted,
}: {
  channel: Channel;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    setLoading(true);
    try {
      await deleteChannel(channel.id);
      onDeleted();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || '채널 삭제에 실패했습니다.');
      } else {
        setError('채널 삭제에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="채널 삭제">
      <div className="space-y-4">
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <p className="text-sm text-danger font-medium mb-1">이 작업은 되돌릴 수 없습니다.</p>
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">"{channel.name}"</span> 채널과 모든 메시지가
            영구적으로 삭제됩니다.
          </p>
        </div>

        {error && (
          <div className="p-3 border border-danger/30 bg-danger/10 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-danger text-white font-medium rounded-xl hover:bg-danger/80 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChannelItem({
  channel,
  isOpen,
  onSelect,
  canDelete,
  onDeleteRequest,
}: {
  channel: Channel;
  isOpen: boolean;
  onSelect: () => void;
  canDelete?: boolean;
  onDeleteRequest?: () => void;
}) {
  return (
    <div className="relative group/channel">
      <button
        onClick={onSelect}
        className={`
          w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
          transition-all duration-150
          ${isOpen
            ? 'bg-accent-light text-accent'
            : 'text-secondary hover:bg-elevated hover:text-primary'
          }
          ${canDelete ? 'pr-7' : ''}
        `}
      >
        {/* Emoji icon */}
        <span className="text-sm shrink-0 w-5 text-center">{channel.icon ?? '💬'}</span>

        {/* Visibility icon */}
        {channel.visibility === 'PRIVATE'
          ? <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />
          : <Hash className="w-3.5 h-3.5 shrink-0 opacity-60" />
        }

        {/* Unread dot */}
        {channel.hasUnread && !isOpen && (
          <span className="text-white text-[8px] shrink-0 leading-none">●</span>
        )}

        {/* Name */}
        <span className={`flex-1 text-sm truncate ${channel.hasUnread && !isOpen ? 'text-white font-semibold' : ''}`}>
          {channel.name}
        </span>

        {/* Unread badge */}
        {!!channel.unreadCount && channel.unreadCount > 0 && !isOpen && (
          <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full shrink-0 min-w-[18px] text-center">
            {channel.unreadCount}
          </span>
        )}
      </button>

      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest?.(); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/channel:opacity-100 hover:bg-danger/10 text-muted hover:text-danger transition-all"
          title="채널 삭제"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
