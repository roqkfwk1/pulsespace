import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { getMembers } from '../api/channel';
import type { ChannelMember } from '../types';

export default function MemberPanel() {
  const { currentChannelId } = useWorkspaceStore();
  const [members, setMembers] = useState<ChannelMember[]>([]);

  useEffect(() => {
    if (!currentChannelId) return;
    getMembers(currentChannelId).then(setMembers);
  }, [currentChannelId]);

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
            key={m.id}
            className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                {m.userName.charAt(0)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-primary font-medium truncate">{m.userName}</p>
              <p className="text-[11px] text-muted">
                {m.role === 'OWNER' ? '관리자' : '멤버'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
