import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserConversations,
  fetchConversationMessages,
  getOrCreateListingConversation,
  sendConversationMessage,
  markConversationMessagesAsRead,
  fetchUnreadChatCount,
} from '../api/chat.api';

export function useConversations() {
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => fetchUserConversations(),
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => fetchConversationMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds for real-time feel
  });
}

export function useUnreadChatCount() {
  return useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: () => fetchUnreadChatCount(),
    refetchInterval: 10000,
  });
}

export function useStartConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: getOrCreateListingConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendConversationMessage,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useMarkMessagesAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markConversationMessagesAsRead,
    onSuccess: (_, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
    },
  });
}
