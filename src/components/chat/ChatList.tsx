import React from 'react';
import { MessageSquareText } from 'lucide-react';
import type { ChatConversationSummary } from '@/types/chat.types';

interface ChatListProps {
  conversations: ChatConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  isLoading: boolean;
}

const formatRelativeTime = (isoDate: string): string => {
  const parsed = new Date(isoDate).getTime();

  if (!Number.isFinite(parsed)) {
    return 'Now';
  }

  const diff = Date.now() - parsed;
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(isoDate).toLocaleDateString();
};

const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 shadow-inner">
          <MessageSquareText size={32} />
        </div>
        <p className="font-semibold text-gray-700 text-lg">No conversations yet</p>
        <p className="text-sm mt-2 text-gray-500">Tap "Contact" on a listing to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-2 py-2 space-y-1.5">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        const hasUnread = conversation.unreadCount > 0;
        const previewText = conversation.lastMessage.replace(/\s+/g, ' ').trim();

        // Generate a consistent gradient based on the first character
        const gradientFrom = `hsl(${conversation.counterpartName.charCodeAt(0) % 360}, 70%, 55%)`;
        const gradientTo = `hsl(${(conversation.counterpartName.charCodeAt(0) + 40) % 360}, 70%, 45%)`;

        return (
          <button
            type="button"
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              w-full text-left px-4 py-3 rounded-2xl transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-primary-50 to-primary-100/70 shadow-md border border-primary-200'
                : hasUnread
                  ? 'bg-blue-50/60 hover:bg-blue-100/70 border border-transparent hover:border-blue-200'
                  : 'hover:bg-gray-100/70 border border-transparent hover:border-gray-200'
              }
            `}
            // Active background: primary-50 to primary-100/70
            // Unread background: blue-50/60, hover: blue-100/70
            // Default hover: gray-100/70
          >
            <div className="flex gap-3 items-start">
              {/* Avatar with dynamic gradient */}
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white shadow-md shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                }}
              >
                {conversation.counterpartName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                    {conversation.counterpartName}
                  </p>
                  <span className={`text-xs flex-shrink-0 ${hasUnread ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {previewText}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="inline-flex min-w-5 justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;