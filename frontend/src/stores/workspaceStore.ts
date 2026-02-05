import { create } from 'zustand';
import type { Workspace, Channel, OpenTab } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  channels: Channel[];
  currentChannelId: number | null;

  // Tab management
  openTabs: OpenTab[];
  activeTabChannelId: number | null;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannelId: (id: number | null) => void;
  updateChannelUnread: (channelId: number, unreadCount: number) => void;
  updateChannelLatestMessage: (channelId: number, message: string, timestamp: string) => void;

  // Tab actions
  openTab: (channel: Channel) => void;
  closeTab: (channelId: number) => void;
  setActiveTab: (channelId: number) => void;
  reorderTabs: (tabs: OpenTab[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  channels: [],
  currentChannelId: null,
  openTabs: [],
  activeTabChannelId: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setChannels: (channels) => set({ channels }),
  setCurrentChannelId: (id) => set({ currentChannelId: id }),
  updateChannelUnread: (channelId, unreadCount) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, unreadCount } : ch
      ),
    })),
  updateChannelLatestMessage: (channelId, message, timestamp) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId
          ? { ...ch, latestMessage: message, latestMessageAt: timestamp }
          : ch
      ),
    })),

  openTab: (channel) => {
    const state = get();
    const exists = state.openTabs.some((t) => t.channelId === channel.id);
    if (!exists) {
      set({
        openTabs: [
          ...state.openTabs,
          {
            channelId: channel.id,
            channelName: channel.name,
            color: channel.color ?? '#14b8a6',
            icon: channel.icon ?? '💬',
          },
        ],
        activeTabChannelId: channel.id,
        currentChannelId: channel.id,
      });
    } else {
      set({ activeTabChannelId: channel.id, currentChannelId: channel.id });
    }
  },

  closeTab: (channelId) => {
    const state = get();
    const newTabs = state.openTabs.filter((t) => t.channelId !== channelId);
    let newActive = state.activeTabChannelId;

    if (state.activeTabChannelId === channelId) {
      const idx = state.openTabs.findIndex((t) => t.channelId === channelId);
      if (newTabs.length > 0) {
        const nextIdx = Math.min(idx, newTabs.length - 1);
        newActive = newTabs[nextIdx].channelId;
      } else {
        newActive = null;
      }
    }

    set({
      openTabs: newTabs,
      activeTabChannelId: newActive,
      currentChannelId: newActive,
    });
  },

  setActiveTab: (channelId) => {
    set({ activeTabChannelId: channelId, currentChannelId: channelId });
  },

  reorderTabs: (tabs) => {
    set({ openTabs: tabs });
  },
}));
