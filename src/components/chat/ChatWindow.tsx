import React from 'react';
import { Paperclip, SendHorizonal, Smile, X, MessagesSquare } from 'lucide-react';
import type { ChatConversationSummary, ChatMessageItem } from '@/types/chat.types';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  conversation: ChatConversationSummary | null;
  currentUserId: string;
  messages: ChatMessageItem[];
  draftMessage: string;
  isSending: boolean;
  pendingFiles: File[];
  onDraftChange: (value: string) => void;
  onPickFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onAddEmoji: (emoji: string) => void;
  onSendMessage: () => Promise<void>;
}

const EMOJIS = ['😀', '😂', '😍', '😎', '🤝', '👍', '🔥', '🎉', '🙏', '💬', '📦', '✅'];

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUserId,
  messages,
  draftMessage,
  isSending,
  pendingFiles,
  onDraftChange,
  onPickFiles,
  onRemoveFile,
  onAddEmoji,
  onSendMessage,
}) => {
  const messageContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = React.useState(false);

  React.useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }

    // Smooth scroll to bottom on new messages
    messageContainerRef.current.scrollTo({
      top: messageContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const formatLastSeen = (isoDate: string | null): string => {
    if (!isoDate) {
      return 'Last seen recently';
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return 'Last seen recently';
    }

    return `Last seen ${parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const statusLabel = conversation
    ? conversation.counterpartOnline
      ? 'Online'
      : formatLastSeen(conversation.counterpartLastSeen)
    : '';

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await onSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-600">
            <MessagesSquare size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Your inbox is ready</h3>
          <p className="text-gray-500">Select a chat from the left panel to continue the conversation.</p>
        </div>
      </div>
    );
  }

  // Avatar gradient based on counterpart name
  const gradientFrom = `hsl(${conversation.counterpartName.charCodeAt(0) % 360}, 70%, 55%)`;
  const gradientTo = `hsl(${(conversation.counterpartName.charCodeAt(0) + 40) % 360}, 70%, 45%)`;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200/70 px-6 py-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            }}
          >
            {conversation.counterpartName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-lg">{conversation.counterpartName}</p>
            <p className={`text-sm flex items-center gap-1.5 ${conversation.counterpartOnline ? 'text-green-600' : 'text-gray-500'}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${conversation.counterpartOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {statusLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messageContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-3 scroll-smooth">
        {messages.length ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
            />
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs">Say hello to start the conversation.</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200/70 bg-white/80 backdrop-blur-sm p-4 sticky bottom-0">
        {/* File previews */}
        {pendingFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-200 px-4 py-2 text-sm text-primary-700 shadow-sm"
              >
                <span className="max-w-[180px] truncate font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="text-primary-500 hover:text-primary-700 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {isEmojiOpen && (
          <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg flex flex-wrap gap-1.5">
            {EMOJIS.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => {
                  onAddEmoji(emoji);
                  setIsEmojiOpen(false);
                }}
                className="h-10 w-10 rounded-xl hover:bg-gray-100 text-xl transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => {
              onPickFiles(event.target.files);
              event.currentTarget.value = '';
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 w-12 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-primary-600 hover:border-primary-300 transition-all inline-flex items-center justify-center shadow-sm"
            aria-label="Attach files"
          >
            <Paperclip size={20} />
          </button>
          <button
            type="button"
            onClick={() => setIsEmojiOpen((prev) => !prev)}
            className={`h-12 w-12 rounded-xl border transition-all inline-flex items-center justify-center shadow-sm ${
              isEmojiOpen
                ? 'bg-primary-50 border-primary-300 text-primary-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-primary-600'
            }`}
            aria-label="Open emoji picker"
          >
            <Smile size={20} />
          </button>
          <textarea
            value={draftMessage}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 p-3.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all resize-none outline-none text-gray-800 placeholder-gray-400"
          />
          <button
            type="button"
            disabled={isSending || (!draftMessage.trim() && pendingFiles.length === 0)}
            onClick={() => {
              void onSendMessage();
            }}
            className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-600 disabled:hover:to-primary-700 transition-all shadow-md inline-flex items-center justify-center"
            aria-label="Send message"
          >
            <SendHorizonal size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;