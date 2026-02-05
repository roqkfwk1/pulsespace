import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Hash, Lock, Search, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Channel } from '../types';

export default function ChannelSidebar() {
  const { wsId } = useParams<{ wsId: string }>();
  const { channels, openTabs, openTab } = useWorkspaceStore();
  const [search, setSearch] = useState('');

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

  return (
    <aside className="w-60 bg-surface border-r border-line flex flex-col shrink-0 h-full">
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
            />
          ))}
        </div>
      )}

      {/* All channels */}
      <div className="flex-1 overflow-y-auto">
        <Disclosure defaultOpen>
          {({ open }) => (
            <>
              <DisclosureButton className="flex items-center gap-1.5 w-full px-4 py-1.5 hover:bg-elevated transition-colors">
                <ChevronRight className={`w-3 h-3 text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  채널
                </span>
                <span className="text-[10px] text-muted ml-auto mr-1">{allChannels.length}</span>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 rounded text-muted hover:text-primary hover:bg-elevated transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </DisclosureButton>

              <DisclosurePanel className="px-2 pb-2 space-y-0.5">
                {allChannels.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isOpen={isTabOpen(ch.id)}
                    onSelect={() => handleSelect(ch)}
                  />
                ))}
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </div>
    </aside>
  );
}

function ChannelItem({ channel, isOpen, onSelect }: { channel: Channel; isOpen: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
        transition-all duration-150
        ${isOpen
          ? 'bg-accent-light text-accent'
          : 'text-secondary hover:bg-elevated hover:text-primary'
        }
      `}
    >
      {/* Emoji icon */}
      <span className="text-sm shrink-0 w-5 text-center">{channel.icon ?? '💬'}</span>

      {/* Visibility icon */}
      {channel.visibility === 'PRIVATE'
        ? <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />
        : <Hash className="w-3.5 h-3.5 shrink-0 opacity-60" />
      }

      {/* Name */}
      <span className="flex-1 text-sm truncate">{channel.name}</span>

      {/* Unread badge */}
      {!!channel.unreadCount && channel.unreadCount > 0 && !isOpen && (
        <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full shrink-0 min-w-[18px] text-center">
          {channel.unreadCount}
        </span>
      )}
    </button>
  );
}
