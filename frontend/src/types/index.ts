export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Workspace {
  id: number;
  name: string;
  ownerUserId: number;
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

export interface ChannelMember {
  id: number;
  channelId: number;
  userId: number;
  userName: string;
  role: 'OWNER' | 'MEMBER';
  lastReadMessageId?: number;
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface OpenTab {
  channelId: number;
  channelName: string;
  color: string;
  icon: string;
}
