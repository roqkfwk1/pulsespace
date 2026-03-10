import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { getWorkspaceMembers, getWorkspaceMyRole } from '../api/workspace';
import type { WorkspaceMember } from '../types';
import WorkspaceMemberManageModal from './WorkspaceMemberManageModal';

const ROLE_LABEL: Record<WorkspaceMember['role'], string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
};

const AVATAR_GRADIENT: Record<WorkspaceMember['role'], string> = {
  OWNER: 'from-teal-500 to-cyan-500',
  ADMIN: 'from-violet-500 to-purple-500',
  MEMBER: 'from-slate-400 to-slate-500',
};

export default function MemberPanel() {
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    let cancelled = false;
    const id = currentWorkspace.id;

    getWorkspaceMembers(id)
      .then((m) => { if (!cancelled) setMembers(m); })
      .catch(() => { if (!cancelled) setMembers([]); });

    getWorkspaceMyRole(id)
      .then((role) => { if (!cancelled) setMyRole(role); })
      .catch(() => { if (!cancelled) setMyRole(null); });

    return () => { cancelled = true; };
  }, [currentWorkspace]);

  return (
    <aside className="w-72 bg-surface border-l border-line flex flex-col shrink-0 h-full">
      <div className="h-12 px-4 flex items-center justify-between border-b border-line">
        <h3 className="text-primary font-semibold text-sm">
          멤버 <span className="text-muted font-normal">({members.length})</span>
        </h3>
        {myRole === 'OWNER' && (
          <button
            onClick={() => setShowManage(true)}
            className="p-1.5 text-muted hover:text-primary hover:bg-elevated rounded-lg transition-colors"
            title="멤버 관리"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-elevated transition-colors"
          >
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AVATAR_GRADIENT[m.role]} flex items-center justify-center text-white text-sm font-semibold`}
              >
                {m.name.charAt(0)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-primary font-medium truncate">{m.name}</p>
              <p className="text-[11px] text-muted">{ROLE_LABEL[m.role]}</p>
            </div>
          </div>
        ))}
      </div>

      {showManage && currentWorkspace && user && (
        <WorkspaceMemberManageModal
          workspaceId={currentWorkspace.id}
          currentUserId={user.id}
          onClose={() => {
            setShowManage(false);
            getWorkspaceMembers(currentWorkspace.id)
              .then(setMembers)
              .catch(() => {});
          }}
        />
      )}
    </aside>
  );
}
