import { useState, useRef, type KeyboardEvent } from 'react';
import { Paperclip, Smile, AtSign, Send } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  channelName?: string;
}

export default function MessageInput({ onSend, channelName }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }

  return (
    <div className="p-3 pt-2">
      <div className="bg-surface border border-line rounded-xl focus-within:border-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={channelName ? `#${channelName}에 메시지 보내기` : '메시지를 입력하세요...'}
          rows={1}
          className="w-full px-4 py-3 bg-transparent text-[15px] text-primary placeholder:text-muted resize-none outline-none leading-relaxed"
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          {/* Left: tool buttons */}
          <div className="flex gap-0.5">
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
              title="파일 첨부"
            >
              <Paperclip className="w-4 h-4 text-muted" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
              title="이모지"
            >
              <Smile className="w-4 h-4 text-muted" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
              title="멘션"
            >
              <AtSign className="w-4 h-4 text-muted" />
            </button>
          </div>

          {/* Right: send button */}
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            전송
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="mt-1.5 px-1 flex items-center gap-1 text-[11px] text-muted">
        <kbd className="px-1 py-0.5 bg-elevated rounded border border-line text-[10px] font-mono">Enter</kbd>
        <span>전송</span>
        <span className="mx-0.5">·</span>
        <kbd className="px-1 py-0.5 bg-elevated rounded border border-line text-[10px] font-mono">Shift+Enter</kbd>
        <span>줄바꿈</span>
      </div>
    </div>
  );
}
