import apiClient, { getErrorMessage } from './client';
import type {
  ChatConversationSummary,
  ChatMessageItem,
  StartListingConversationInput,
} from '@rentverse/shared';

export const getOrCreateListingConversation = async (
  input: StartListingConversationInput
): Promise<{ id: string }> => {
  try {
    const response = await apiClient.post<{ id: string }>('/chat/conversations', {
      listingId: input.listingId,
      sellerId: input.sellerId,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const fetchUserConversations = async (): Promise<ChatConversationSummary[]> => {
  try {
    const response = await apiClient.get<{ conversations: ChatConversationSummary[] }>('/chat/conversations');
    // The backend might return an array directly or an object with a conversations array
    return Array.isArray(response.data) ? response.data : (response.data.conversations || []);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const fetchConversationMessages = async (
  conversationId: string
): Promise<ChatMessageItem[]> => {
  try {
    const response = await apiClient.get<ChatMessageItem[]>(`/chat/conversations/${conversationId}/messages`);
    // Handle wrapped response if necessary
    return Array.isArray(response.data) ? response.data : ((response.data as any).messages || []);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const sendConversationMessage = async (input: {
  conversationId: string;
  senderId: string;
  content: string;
  listingContextId?: string;
}): Promise<ChatMessageItem> => {
  try {
    const response = await apiClient.post<ChatMessageItem>('/chat/messages', {
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      listingContextId: input.listingContextId,
      attachments: [],
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const markConversationMessagesAsRead = async (
  conversationId: string
): Promise<void> => {
  try {
    await apiClient.post<{ ok: boolean }>(`/chat/conversations/${conversationId}/read`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const fetchUnreadNotificationCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<{ count: number }>('/chat/unread/notifications');
    return response.data.count || 0;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};

export const fetchUnreadChatCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<{ count: number }>('/chat/unread/messages');
    return response.data.count || 0;
  } catch (error) {
    console.error('Error fetching unread chat count:', error);
    return 0;
  }
};
