import { X, Plus, Hash } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { OpenTab } from '../types';

interface Props {
  onAddTab: () => void;
}

export default function ChannelTabBar({ onAddTab }: Props) {
  const { openTabs, activeTabChannelId, setActiveTab, closeTab, channels, reorderTabs } = useWorkspaceStore();

  return (
    <div className="h-10 bg-base border-b border-line flex items-end px-2 overflow-x-auto hide-scrollbar shrink-0">
      <Reorder.Group
        axis="x"
        values={openTabs}
        onReorder={reorderTabs}
        className="flex items-end gap-0.5"
        as="div"
      >
        {openTabs.map((tab) => (
          <TabItem
            key={tab.channelId}
            tab={tab}
            isActive={activeTabChannelId === tab.channelId}
            unread={channels.find((c) => c.id === tab.channelId)?.unreadCount ?? 0}
            canClose={openTabs.length > 1}
            onActivate={() => setActiveTab(tab.channelId)}
            onClose={() => closeTab(tab.channelId)}
          />
        ))}
      </Reorder.Group>

      {/* Add tab */}
      <button
        onClick={onAddTab}
        className="p-1.5 text-muted hover:text-primary hover:bg-elevated rounded-lg transition-colors shrink-0 mb-0.5 ml-0.5"
        title="채널 열기"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  unread,
  canClose,
  onActivate,
  onClose,
}: {
  tab: OpenTab;
  isActive: boolean;
  unread: number;
  canClose: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  return (
    <Reorder.Item
      value={tab}
      as="div"
      whileDrag={{ scale: 1.03, zIndex: 10 }}
      className="shrink-0"
    >
      <motion.button
        onClick={onActivate}
        className={`
          group relative flex items-center gap-1.5
          px-3 py-1.5 rounded-t-lg min-w-0
          transition-colors duration-150
          ${isActive
            ? 'bg-surface text-primary'
            : 'text-secondary hover:text-primary hover:bg-elevated/50'
          }
        `}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.1 }}
      >
        {/* Active top indicator */}
        {isActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="absolute top-0 left-2 right-2 h-0.5 rounded-b bg-gradient-to-r from-teal-500 to-cyan-500"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}

        {/* Channel emoji icon */}
        <span className="text-sm shrink-0">{tab.icon}</span>

        {/* Hash + channel name */}
        <Hash className="w-3 h-3 shrink-0 opacity-50" />
        <span className={`text-[13px] truncate max-w-[100px] ${isActive ? 'font-medium' : ''}`}>
          {tab.channelName}
        </span>

        {/* Unread badge */}
        {unread > 0 && !isActive && (
          <span className="w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {unread > 9 ? '9+' : unread}
          </span>
        )}

        {/* Close button */}
        {canClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-line rounded transition-opacity shrink-0 ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.button>
    </Reorder.Item>
  );
}
