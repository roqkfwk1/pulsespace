import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash, Plus, Zap, Loader2, Trash2 } from 'lucide-react';
import { getWorkspaces, createWorkspace, getWorkspaceMembers, getWorkspaceMyRole, deleteWorkspace } from '../api/workspace';
import { getChannels } from '../api/channel';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Workspace, Channel } from '../types';
import TopNavBar from '../components/TopNavBar';
import Modal from '../components/Modal';

export default function WorkspaceSelectPage() {
  const [workspaces, setLocalWs] = useState<Workspace[]>([]);
  const [channelMap, setChannelMap] = useState<Record<number, Channel[]>>({});
  const [memberCountMap, setMemberCountMap] = useState<Record<number, number>>({});
  const [roleMap, setRoleMap] = useState<Record<number, 'OWNER' | 'ADMIN' | 'MEMBER'>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const navigate = useNavigate();
  const { setCurrentWorkspace, setWorkspaces: setStoreWs } = useWorkspaceStore();

  async function refreshWorkspaces() {
    const ws = await getWorkspaces();
    setLocalWs(ws);
    setStoreWs(ws);

    const results = await Promise.all(
      ws.map(async (w) => {
        const [chs, members, role] = await Promise.all([
          getChannels(w.id),
          getWorkspaceMembers(w.id),
          getWorkspaceMyRole(w.id),
        ]);
        return { id: w.id, chs, memberCount: members.length, role };
      })
    );
    setChannelMap(Object.fromEntries(results.map((r) => [r.id, r.chs])));
    setMemberCountMap(Object.fromEntries(results.map((r) => [r.id, r.memberCount])));
    setRoleMap(Object.fromEntries(results.map((r) => [r.id, r.role])));
  }

  useEffect(() => {
    refreshWorkspaces().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(ws: Workspace) {
    setCurrentWorkspace(ws);
    navigate(`/workspaces/${ws.id}`);
  }

  function handleWorkspaceDeleted(wsId: number) {
    setLocalWs((prev) => prev.filter((w) => w.id !== wsId));
    setStoreWs(workspaces.filter((w) => w.id !== wsId));
    setChannelMap((prev) => { const n = { ...prev }; delete n[wsId]; return n; });
    setMemberCountMap((prev) => { const n = { ...prev }; delete n[wsId]; return n; });
    setRoleMap((prev) => { const n = { ...prev }; delete n[wsId]; return n; });
    setDeleteTarget(null);
  }

  function getRecentChannels(wsId: number) {
    const channels = channelMap[wsId] ?? [];
    return channels
      .sort((a, b) => (b.latestMessageAt ?? '').localeCompare(a.latestMessageAt ?? ''))
      .slice(0, 3);
  }

  function getTotalUnread(wsId: number) {
    const channels = channelMap[wsId] ?? [];
    return channels.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  }

  return (
    <div className="min-h-screen bg-base">
      <TopNavBar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Page header with logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary">워크스페이스</h1>
          </div>
          <p className="text-secondary ml-12">참여 중인 워크스페이스를 선택하세요</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-6 border border-line animate-pulse">
                <div className="h-1.5 rounded-full bg-elevated mb-6" />
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-elevated" />
                  <div className="flex-1">
                    <div className="h-6 bg-elevated rounded w-32 mb-2" />
                    <div className="h-4 bg-elevated rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws, i) => {
              const recentChannels = getRecentChannels(ws.id);
              const totalUnread = getTotalUnread(ws.id);
              const canDelete = roleMap[ws.id] === 'OWNER';

              return (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => select(ws)}
                  className="group bg-surface border border-line rounded-2xl overflow-hidden hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-200 text-left cursor-pointer"
                >
                  {/* Color bar */}
                  <div
                    className="h-1.5"
                    style={{
                      background: `linear-gradient(90deg, ${ws.colorStart ?? '#14b8a6'}, ${ws.colorEnd ?? '#06b6d4'})`,
                    }}
                  />

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start gap-3.5 mb-4">
                      {/* Icon */}
                      <div className="relative shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${ws.colorStart ?? '#14b8a6'}, ${ws.colorEnd ?? '#06b6d4'})`,
                          }}
                        >
                          {ws.icon ? (
                            <span className="text-2xl">{ws.icon}</span>
                          ) : (
                            <span className="text-lg font-bold text-white">{ws.name.charAt(0)}</span>
                          )}
                        </div>
                        {ws.hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-danger rounded-full border-2 border-surface" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors truncate flex-1">
                            {ws.name}
                          </h3>
                          {canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-all shrink-0"
                              title="워크스페이스 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{(channelMap[ws.id]?.length ?? ws.channelCount ?? 0)}개 채널</span>
                          <span>·</span>
                          <span>{(memberCountMap[ws.id] ?? ws.memberCount ?? 0)}명</span>
                        </div>
                        {ws.description && (
                          <p className="text-xs text-secondary mt-1 truncate">{ws.description}</p>
                        )}
                      </div>

                      {/* Unread badge */}
                      {totalUnread > 0 && (
                        <div className="px-2 py-0.5 bg-danger rounded-full text-[11px] text-white font-bold shrink-0">
                          {totalUnread}
                        </div>
                      )}
                    </div>

                    {/* Recent channels preview */}
                    {recentChannels.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">최근 활동</p>
                        {recentChannels.map((ch) => (
                          <div key={ch.id} className="flex items-center gap-1.5 text-sm">
                            <span className="text-xs shrink-0">{ch.icon ?? '💬'}</span>
                            <Hash className="w-3 h-3 text-muted shrink-0" />
                            <span className="text-secondary truncate text-xs">{ch.name}</span>
                            {!!ch.unreadCount && ch.unreadCount > 0 && (
                              <span className="text-[10px] text-danger font-bold ml-auto shrink-0">
                                {ch.unreadCount}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* New workspace card */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: workspaces.length * 0.08 }}
              onClick={() => setShowCreateModal(true)}
              className="bg-surface border-2 border-dashed border-line rounded-2xl p-5 hover:border-accent/50 hover:bg-elevated/50 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-base font-semibold text-primary">새 워크스페이스</span>
              <span className="text-xs text-muted mt-1">팀을 위한 새로운 공간</span>
            </motion.button>
          </div>
        )}

        {/* Create Workspace Modal */}
        <CreateWorkspaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refreshWorkspaces();
          }}
        />

        {/* Delete Workspace Modal */}
        {deleteTarget && (
          <DeleteWorkspaceModal
            workspace={deleteTarget}
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => handleWorkspaceDeleted(deleteTarget.id)}
          />
        )}
      </main>
    </div>
  );
}

function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setLoading(true);
    try {
      await createWorkspace(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onCreated();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || '워크스페이스 생성에 실패했습니다.');
      } else {
        setError('워크스페이스 생성에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 워크스페이스 만들기">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 border border-danger/30 bg-danger/10 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            워크스페이스 이름 <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="예: 개발팀"
            className="w-full px-3.5 py-2.5 bg-base border border-line rounded-xl text-primary placeholder:text-muted focus:border-accent focus:outline-none transition-colors text-[15px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            설명 <span className="text-muted">(선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="워크스페이스에 대한 간단한 설명"
            rows={3}
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

function DeleteWorkspaceModal({
  workspace,
  isOpen,
  onClose,
  onDeleted,
}: {
  workspace: Workspace;
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
      await deleteWorkspace(workspace.id);
      onDeleted();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || '워크스페이스 삭제에 실패했습니다.');
      } else {
        setError('워크스페이스 삭제에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="워크스페이스 삭제">
      <div className="space-y-4">
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <p className="text-sm text-danger font-medium mb-1">이 작업은 되돌릴 수 없습니다.</p>
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">"{workspace.name}"</span> 워크스페이스를 삭제하면
            모든 채널과 메시지가 영구적으로 삭제됩니다.
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
