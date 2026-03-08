import React from 'react';
import { Check, CheckCheck, Paperclip } from 'lucide-react';
import type { ChatMessageItem } from '@/types/chat.types';
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
  message: ChatMessageItem;
  isOwn: boolean;
}

const formatMessageTime = (isoDate: string): string => {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const extractListingContext = (content: string): { text: string; listingTitle: string | null; listingPath: string | null } => {
  const contextRegex = /\n\nProduct:\s(.+?)\s\((\/listing\/[^\s)]+)\)\s*$/;
  const match = content.match(contextRegex);

  if (!match) {
    return { text: content, listingTitle: null, listingPath: null };
  }

  return {
    text: content.replace(contextRegex, '').trim(),
    listingTitle: match[1],
    listingPath: match[2],
  };
};

const extractAttachments = (content: string): { text: string; attachments: Array<{ name: string; url: string }> } => {
  const attachmentRegex = /^Attachment:\s(.+?)\s\((https?:\/\/[^\s)]+)\)$/gm;
  const attachments: Array<{ name: string; url: string }> = [];

  let match = attachmentRegex.exec(content);
  while (match) {
    attachments.push({ name: match[1], url: match[2] });
    match = attachmentRegex.exec(content);
  }

  const text = content.replace(attachmentRegex, '').replace(/\n{3,}/g, '\n\n').trim();

  return { text, attachments };
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const { text: withoutListing, listingTitle, listingPath } = extractListingContext(message.content);
  const { text, attachments } = extractAttachments(withoutListing);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div
        className={`max-w-[75%] rounded-2xl px-2 py-1.5 shadow-md transition-all duration-200 ${
          isOwn
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-br-sm hover:shadow-lg'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm hover:shadow-md'
        }`}
        // Own message gradient: primary-600 to primary-700
        // Other message: white with border
      >
        {/* Message text */}
        {text && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        )}

        {/* Listing context card */}
        {listingPath && listingTitle && (
          <div
            className={`mt-2 rounded-xl px-4 py-2.5 text-sm border ${
              isOwn
                ? 'border-primary-500 bg-primary-500/20 backdrop-blur-sm'
                : 'border-primary-200 bg-primary-50'
            }`}
          >
            <p className={`text-xs mb-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>Regarding product</p>
            <Link
              to={listingPath}
              className={`font-medium hover:underline ${
                isOwn ? 'text-white' : 'text-primary-700 hover:text-primary-800'
              }`}
            >
              {listingTitle}
            </Link>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {attachments.map((attachment) => (
              <a
                key={`${attachment.url}-${attachment.name}`}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 text-xs underline-offset-2 hover:underline transition ${
                  isOwn ? 'text-white/90 hover:text-white' : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                <Paperclip size={12} />
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        {/* Timestamp and read receipt */}
        <div
          className={`mt-0.5 min-h-[16px] flex items-center gap-1 text-[11px] leading-none ${
            isOwn ? 'justify-end text-blue-100 pr-0.5 pb-[1px]' : 'justify-start text-gray-400'
          }`}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn &&
            (message.readAt ? (
              <CheckCheck size={12} className="text-blue-200 shrink-0 overflow-visible" />
            ) : (
              <Check size={12} className="text-blue-200/70 shrink-0 overflow-visible" />
            ))}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;