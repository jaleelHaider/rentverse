import { apiJsonRequest, fileToBase64 } from '@/api/clients';
import type {
  ChatConversationSummary,
  ChatMessageItem,
  StartListingConversationInput,
} from '@rentverse/shared';

export const getOrCreateListingConversation = async (
  input: StartListingConversationInput
): Promise<{ id: string }> => {
  return apiJsonRequest<{ id: string }>('/chat/conversations', {
    method: 'POST',
    auth: true,
    body: {
      listingId: input.listingId,
      sellerId: input.sellerId,
    },
  });
};

export const fetchUserConversations = async (
  userId: string
): Promise<ChatConversationSummary[]> => {
  void userId;
  return apiJsonRequest<ChatConversationSummary[]>('/chat/conversations', {
    method: 'GET',
    auth: true,
  });
};

export const fetchConversationMessages = async (
  conversationId: string
): Promise<ChatMessageItem[]> => {
  return apiJsonRequest<ChatMessageItem[]>(`/chat/conversations/${conversationId}/messages`, {
    method: 'GET',
    auth: true,
  });
};

export const sendConversationMessage = async (input: {
  conversationId: string;
  senderId: string;
  content: string;
  listingContextId?: string;
  files?: File[];
}): Promise<ChatMessageItem> => {
  const attachments = input.files?.length
    ? await Promise.all(input.files.map((file) => fileToBase64(file)))
    : [];

  return apiJsonRequest<ChatMessageItem>('/chat/messages', {
    method: 'POST',
    auth: true,
    body: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      listingContextId: input.listingContextId,
      attachments,
    },
  });
};

export const markConversationMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  void userId;
  await apiJsonRequest<{ ok: boolean }>(`/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    auth: true,
  });
};

export const fetchUnreadNotificationCount = async (userId: string): Promise<number> => {
  void userId;
  const data = await apiJsonRequest<{ count: number }>('/chat/unread/notifications', {
    method: 'GET',
    auth: true,
  });

  return data.count || 0;
};

export const fetchUnreadChatCount = async (userId: string): Promise<number> => {
  void userId;
  const data = await apiJsonRequest<{ count: number }>('/chat/unread/messages', {
    method: 'GET',
    auth: true,
  });

  return data.count || 0;
};
