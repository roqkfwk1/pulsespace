import { useEffect, useState } from 'react';
import { X, Shield, Loader2 } from 'lucide-react';
import { getWorkspaceMembers, getWorkspaceMyRole, updateMemberRole } from '../api/workspace';
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

const ROLE_BADGE: Record<WorkspaceMember['role'], string> = {
  OWNER: 'bg-teal-500/15 text-teal-500',
  ADMIN: 'bg-violet-500/15 text-violet-500',
  MEMBER: 'bg-elevated text-muted',
};

interface Props {
  workspaceId: number;
  currentUserId: number;
  onClose: () => void;
}

export default function WorkspaceMemberManageModal({
  workspaceId,
  currentUserId,
  onClose,
}: Props) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // userId → pending role (unsaved changes)
  const [pendingRoles, setPendingRoles] = useState<Record<number, 'ADMIN' | 'MEMBER'>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getWorkspaceMembers(workspaceId),
      getWorkspaceMyRole(workspaceId),
    ])
      .then(([m, role]) => {
        if (!cancelled) {
          setMembers(m);
          setMyRole(role);
        }
      })
      .catch(() => {
        if (!cancelled) setError('멤버 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  function handleRoleSelect(userId: number, role: 'ADMIN' | 'MEMBER', originalRole: WorkspaceMember['role']) {
    if (role === originalRole) {
      // Revert to original — remove from pending
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } else {
      setPendingRoles((prev) => ({ ...prev, [userId]: role }));
    }
  }

  async function handleSave() {
    const entries = Object.entries(pendingRoles);
    if (entries.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        entries.map(([userId, role]) =>
          updateMemberRole(workspaceId, Number(userId), role)
        )
      );
      setPendingRoles({});
      const updated = await getWorkspaceMembers(workspaceId);
      setMembers(updated);
      onClose();
    } catch {
      setError('권한 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = Object.keys(pendingRoles).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-surface rounded-2xl border border-line shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <h2 className="text-primary font-semibold text-sm">멤버 관리</h2>
            {!loading && (
              <span className="text-muted font-normal text-sm">({members.length})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary hover:bg-elevated rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="text-danger text-xs px-5 pt-3 pb-1">{error}</p>
        )}

        {/* Member list */}
        {!loading && (
          <>
            <div className="max-h-[420px] overflow-y-auto p-3 space-y-0.5">
              {members.map((m) => {
                const isSelf = m.userId === currentUserId;
                const isOwner = m.role === 'OWNER';
                const canChange = myRole === 'OWNER' && !isSelf && !isOwner;
                const pendingRole = pendingRoles[m.userId];
                const displayRole = pendingRole ?? m.role;
                const hasPending = pendingRole !== undefined;

                return (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-elevated transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENT[m.role]} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
                    >
                      {m.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-primary font-medium truncate">{m.name}</p>
                        {isSelf && <span className="text-[10px] text-muted shrink-0">(나)</span>}
                      </div>
                      <p className="text-[11px] text-muted truncate">{m.email}</p>
                    </div>

                    {/* Role selector or badge */}
                    {canChange ? (
                      <select
                        value={displayRole}
                        onChange={(e) =>
                          handleRoleSelect(m.userId, e.target.value as 'ADMIN' | 'MEMBER', m.role)
                        }
                        className={`text-xs bg-elevated border rounded-lg px-2 py-1.5 text-primary focus:outline-none focus:border-accent cursor-pointer shrink-0 transition-colors ${
                          hasPending ? 'border-accent' : 'border-line'
                        }`}
                      >
                        <option value="ADMIN">관리자</option>
                        <option value="MEMBER">멤버</option>
                      </select>
                    ) : (
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0 ${ROLE_BADGE[m.role]}`}
                      >
                        {ROLE_LABEL[m.role]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save footer — only shown to OWNER */}
            {myRole === 'OWNER' && (
              <div className="px-4 py-3 border-t border-line flex items-center justify-end gap-3">
                {error && (
                  <p className="text-danger text-xs flex-1">{error}</p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pendingCount === 0 || saving}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {pendingCount > 0 ? `저장 (${pendingCount}건)` : '저장'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
