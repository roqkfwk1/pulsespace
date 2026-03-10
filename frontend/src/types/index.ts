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
  hasUnread?: boolean;
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
  hasUnread?: boolean;
}

export interface Message {
  id: number;
  channelId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  type?: 'CREATED' | 'UPDATED' | 'DELETED';
  editedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  replyToId?: number;
  replyToSenderName?: string;
  replyToContent?: string;
}

export interface WorkspaceMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface OpenTab {
  channelId: number;
  channelName: string;
  color: string;
  icon: string;
}
