export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Workspace {
  id: number;
  name: string;
  ownerName?: string;
  createdAt: string;
  description?: string;
  memberCount?: number;
  channelCount?: number;
  colorStart?: string;
  colorEnd?: string;
  icon?: string;
}

export interface Channel {
  id: number;
  workspaceId: number;
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  unreadCount?: number;
  latestMessage?: string;
  latestMessageAt?: string;
  color?: string;
  description?: string;
  icon?: string;
}

export interface Message {
  id: number;
  channelId: number;
  senderUserId: number;
  senderName: string;
  content: string;
  createdAt: string;
  replyToId?: number;
  replyToSenderName?: string;
  replyToContent?: string;
}

export interface WorkspaceMember {
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface OpenTab {
  channelId: number;
  channelName: string;
  color: string;
  icon: string;
}
