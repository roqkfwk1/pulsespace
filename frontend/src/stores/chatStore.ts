import { create } from 'zustand';
import type { Message, ConnectionStatus } from '../types';

interface ChatState {
  messages: Message[];
  lastReceivedMessageId: number | null;
  connectionStatus: ConnectionStatus;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  syncMessages: (newMessages: Message[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  prependMessages: (older: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  lastReceivedMessageId: null,
  connectionStatus: 'DISCONNECTED',
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return {
        messages: [...state.messages, message],
        lastReceivedMessageId: message.id,
      };
    }),
  setMessages: (messages) =>
    set({
      messages,
      lastReceivedMessageId: messages.length > 0 ? messages[messages.length - 1].id : null,
    }),
  syncMessages: (newMessages) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const unique = newMessages.filter((m) => !existingIds.has(m.id));
      const merged = [...state.messages, ...unique].sort((a, b) => a.id - b.id);
      return {
        messages: merged,
        lastReceivedMessageId: merged.length > 0 ? merged[merged.length - 1].id : null,
      };
    }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  prependMessages: (older) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const unique = older.filter((m) => !existingIds.has(m.id));
      return { messages: [...unique, ...state.messages] };
    }),
}));
