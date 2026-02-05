import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash, Plus, Zap } from 'lucide-react';
import { getWorkspaces } from '../api/workspace';
import { getChannels } from '../api/channel';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Workspace, Channel } from '../types';
import TopNavBar from '../components/TopNavBar';

export default function WorkspaceSelectPage() {
  const [workspaces, setLocalWs] = useState<Workspace[]>([]);
  const [channelMap, setChannelMap] = useState<Record<number, Channel[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setCurrentWorkspace, setWorkspaces: setStoreWs } = useWorkspaceStore();

  useEffect(() => {
    getWorkspaces().then(async (ws) => {
      setLocalWs(ws);
      setStoreWs(ws);

      const entries = await Promise.all(
        ws.map(async (w) => {
          const chs = await getChannels(w.id);
          return [w.id, chs] as const;
        })
      );
      setChannelMap(Object.fromEntries(entries));
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(ws: Workspace) {
    setCurrentWorkspace(ws);
    navigate(`/workspaces/${ws.id}`);
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

              return (
                <motion.button
                  key={ws.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => select(ws)}
                  className="group bg-surface border border-line rounded-2xl overflow-hidden hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-200 text-left"
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
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-primary mb-0.5 group-hover:text-accent transition-colors truncate">
                          {ws.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{ws.channelCount ?? '–'}개 채널</span>
                          <span>·</span>
                          <span>{ws.memberCount ?? '–'}명</span>
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
                </motion.button>
              );
            })}

            {/* New workspace card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: workspaces.length * 0.08 }}
              className="bg-surface border-2 border-dashed border-line rounded-2xl p-5 hover:border-accent/50 hover:bg-elevated/50 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-base font-semibold text-primary">새 워크스페이스</span>
              <span className="text-xs text-muted mt-1">팀을 위한 새로운 공간</span>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
