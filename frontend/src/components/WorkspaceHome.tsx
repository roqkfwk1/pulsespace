import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Hash, UserPlus } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { getWorkspaceMyRole, getWorkspaceMembers } from '../api/workspace';
import { getChannels } from '../api/channel';
import InviteWorkspaceMemberModal from './InviteWorkspaceMemberModal';

export default function WorkspaceHome() {
  const { currentWorkspace } = useWorkspaceStore();
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [channelCount, setChannelCount] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    const id = currentWorkspace.id;
    let cancelled = false;
    getWorkspaceMyRole(id).then((r) => { if (!cancelled) setRole(r); }).catch(() => { if (!cancelled) setRole(null); });
    getWorkspaceMembers(id).then((members) => { if (!cancelled) setMemberCount(members.length); }).catch(() => { if (!cancelled) setMemberCount(null); });
    getChannels(id).then((channels) => { if (!cancelled) setChannelCount(channels.length); }).catch(() => { if (!cancelled) setChannelCount(null); });
    return () => { cancelled = true; };
  }, [currentWorkspace]);

  if (!currentWorkspace) return null;

  const canInvite = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-base p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* Workspace icon */}
        <div
          className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl text-3xl"
          style={{
            background: `linear-gradient(135deg, ${currentWorkspace.colorStart ?? '#14b8a6'}, ${currentWorkspace.colorEnd ?? '#06b6d4'})`,
          }}
        >
          {currentWorkspace.icon ? (
            <span>{currentWorkspace.icon}</span>
          ) : (
            <span className="text-2xl font-bold text-white">{currentWorkspace.name.charAt(0)}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-primary mb-2">{currentWorkspace.name}</h1>

        {currentWorkspace.description && (
          <p className="text-secondary mb-4 text-sm leading-relaxed">{currentWorkspace.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mb-8 text-muted">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">{memberCount ?? '...'}명</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            <span className="text-sm">{channelCount ?? '...'}개 채널</span>
          </div>
        </div>

        <p className="text-muted text-sm">좌측 사이드바에서 채널을 선택하여 대화를 시작하세요</p>

        {canInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            멤버 초대
          </button>
        )}
      </motion.div>

      <InviteWorkspaceMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
      />
    </div>
  );
}
