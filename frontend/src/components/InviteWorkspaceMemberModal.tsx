import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { inviteWorkspaceMember } from '../api/workspace';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  workspaceName: string;
}

export default function InviteWorkspaceMemberModal({ isOpen, onClose, workspaceId, workspaceName }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await inviteWorkspaceMember(workspaceId, email.trim());
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

  function handleClose() {
    setEmail('');
    setError('');
    setSuccess('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${workspaceName}에 멤버 초대`}>
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
            onClick={handleClose}
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
