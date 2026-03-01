import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { getWorkspaceMembers } from '../api/workspace';
import type { WorkspaceMember } from '../types';

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
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    let cancelled = false;
    getWorkspaceMembers(currentWorkspace.id).then((m) => { if (!cancelled) setMembers(m); }).catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [currentWorkspace]);

  return (
    <aside className="w-72 bg-surface border-l border-line flex flex-col shrink-0">
      <div className="h-12 px-4 flex items-center border-b border-line">
        <h3 className="text-primary font-semibold text-sm">
          멤버 <span className="text-muted font-normal">({members.length})</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {members.map((m) => (
          <div
            key={m.email}
            className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
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
    </aside>
  );
}
