import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellRing, MessageCircleMore, MessagesSquare, Search, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import {
  fetchConversationMessages,
  fetchUserConversations,
  getOrCreateListingConversation,
  markConversationMessagesAsRead,
  sendConversationMessage,
} from '@/api/endpoints/chat';
import type { ChatConversationSummary, ChatMessageItem } from '@/types/chat.types';

const Inbox: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const panelContainerRef = React.useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'online'>('all');
  const [pageError, setPageError] = useState<string | null>(null);

  const clearListingContextParams = useCallback(() => {
    if (!searchParams.has('listingContext') && !searchParams.has('listing') && !searchParams.has('seller')) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('listingContext');
    nextParams.delete('listing');
    nextParams.delete('seller');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingConversations(true);
    setPageError(null);

    try {
      const nextConversations = await fetchUserConversations(currentUser.id);
      setConversations(nextConversations);

      const chatFromQuery = searchParams.get('chat');
      if (chatFromQuery && nextConversations.some((conversation) => conversation.id === chatFromQuery)) {
        setActiveConversationId(chatFromQuery);
        return;
      }

      setActiveConversationId((prev) => {
        if (prev && nextConversations.some((conversation) => conversation.id === prev)) {
          return prev;
        }
        return nextConversations[0]?.id || null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load inbox.';
      setPageError(message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser, searchParams]);

  const loadMessagesForConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUser) return;

      setIsLoadingMessages(true);
      setPageError(null);

      try {
        const nextMessages = await fetchConversationMessages(conversationId);
        setMessages(nextMessages);
        await markConversationMessagesAsRead(conversationId, currentUser.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load messages.';
        setPageError(message);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!currentUser) return;

    const listingId = searchParams.get('listing');
    const sellerId = searchParams.get('seller');

    if (!listingId || !sellerId || currentUser.id === sellerId) {
      return;
    }

    let cancelled = false;

    const ensureConversation = async () => {
      try {
        const conversation = await getOrCreateListingConversation({
          listingId,
          sellerId,
          buyerId: currentUser.id,
        });

        if (cancelled) return;

        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('chat', conversation.id);
        nextParams.set('listingContext', listingId);
        nextParams.delete('listing');
        nextParams.delete('seller');

        setSearchParams(nextParams, { replace: true });
        setActiveConversationId(conversation.id);
        await loadConversations();
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : 'Unable to open chat for this listing right now.';
        setPageError(message);
      }
    };

    void ensureConversation();

    return () => {
      cancelled = true;
    };
  }, [currentUser, loadConversations, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (searchParams.get('chat') !== activeConversationId) {
      nextParams.set('chat', activeConversationId);
      setSearchParams(nextParams, { replace: true });
    }

    void loadMessagesForConversation(activeConversationId);
  }, [activeConversationId, loadMessagesForConversation, searchParams, setSearchParams]);

  useEffect(() => {
    if (!currentUser) return;

    const inboxChannel = supabase
      .channel(`inbox-user-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        () => {
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(inboxChannel);
    };
  }, [currentUser, loadConversations]);

  useEffect(() => {
    if (!activeConversationId) return;

    const activeConversationChannel = supabase
      .channel(`conversation-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          void loadMessagesForConversation(activeConversationId);
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(activeConversationChannel);
    };
  }, [activeConversationId, loadConversations, loadMessagesForConversation]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const visibleConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesQuery =
        !query ||
        conversation.counterpartName.toLowerCase().includes(query) ||
        conversation.listing.title.toLowerCase().includes(query) ||
        conversation.lastMessage.toLowerCase().includes(query);

      if (!matchesQuery) {
        return false;
      }

      if (listFilter === 'unread') {
        return conversation.unreadCount > 0;
      }

      if (listFilter === 'online') {
        return conversation.counterpartOnline;
      }

      return true;
    });
  }, [conversations, listFilter, searchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations]
  );

  const onlineCount = useMemo(
    () => conversations.filter((conversation) => conversation.counterpartOnline).length,
    [conversations]
  );

  const handleSendMessage = useCallback(async () => {
    if (!activeConversationId || !currentUser) {
      return;
    }

    const nextMessage = draftMessage.trim();
    if (!nextMessage && pendingFiles.length === 0) {
      return;
    }

    setIsSending(true);
    setPageError(null);

    try {
      const listingContextId = searchParams.get('listingContext') || undefined;
      const attachmentLines: string[] = [];

      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${currentUser.id}/${activeConversationId}/${Date.now()}-${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

          if (uploadError) {
            throw new Error(uploadError.message || `Failed to upload ${file.name}`);
          }

          const publicUrl = supabase.storage.from('chat-attachments').getPublicUrl(storagePath).data.publicUrl;
          attachmentLines.push(`Attachment: ${file.name} (${publicUrl})`);
        }
      }

      const composedMessage = [nextMessage, ...attachmentLines].filter(Boolean).join('\n\n');

      const inserted = await sendConversationMessage({
        conversationId: activeConversationId,
        senderId: currentUser.id,
        content: composedMessage,
        listingContextId,
      });

      setMessages((prev) => [...prev, inserted]);
      setDraftMessage('');
      setPendingFiles([]);
      clearListingContextParams();
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message.';
      setPageError(message);
    } finally {
      setIsSending(false);
    }
  }, [
    activeConversationId,
    clearListingContextParams,
    currentUser,
    draftMessage,
    loadConversations,
    pendingFiles,
    searchParams,
  ]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      clearListingContextParams();
    },
    [clearListingContextParams]
  );

  const handlePickFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handleAddEmoji = useCallback((emoji: string) => {
    setDraftMessage((prev) => `${prev}${emoji}`);
  }, []);

  const alignPanelsInView = useCallback(() => {
    const panelContainer = panelContainerRef.current;

    if (!panelContainer) {
      return;
    }

    const rect = panelContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topGap = 20;
    const bottomGap = 20;

    const isFullyVisible = rect.top >= topGap && rect.bottom <= viewportHeight - bottomGap;

    if (isFullyVisible) {
      return;
    }

    // Bias the panel upward so a bit more top content stays visible.
    const topOffset = Math.max(140, viewportHeight * 0.1);
    const targetTop = window.scrollY + rect.top - topOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, []);

  const handlePanelInteraction = useCallback(() => {
    requestAnimationFrame(() => {
      alignPanelsInView();
    });
  }, [alignPanelsInView]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_42%,_#eef2ff_100%)] py-8">
      <div className="container-custom">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800 flex items-center gap-3 tracking-tight">
              <MessagesSquare className="text-primary-600" size={36} />
              Inbox
            </h1>
            <p className="text-gray-600 mt-1.5 text-base">Conversations with buyers and sellers across your listings.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/90 px-3 py-1.5 text-sm text-gray-700 shadow-sm">
              <Users size={15} className="text-primary-600" />
              <span>{conversations.length} chats</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-sm text-amber-700 shadow-sm">
              <BellRing size={15} />
              <span>{totalUnread} unread</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-sm text-emerald-700 shadow-sm">
              <MessageCircleMore size={15} />
              <span>{onlineCount} online</span>
            </div>
          </div>
        </div>

        {pageError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur-sm px-5 py-4 text-sm text-red-700 shadow-sm">
            {pageError}
          </div>
        ) : null}

        <div ref={panelContainerRef} className="grid md:grid-cols-[380px_1fr] gap-5 h-[78vh] min-h-0">
          <aside
            className="rounded-3xl border border-gray-200/70 bg-white/75 backdrop-blur-sm shadow-xl h-full min-h-0 flex flex-col overflow-hidden"
            onMouseDownCapture={handlePanelInteraction}
            onFocusCapture={handlePanelInteraction}
          >
            <div className="p-5 border-b border-gray-200/70 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    listFilter === 'all'
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('unread')}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    listFilter === 'unread'
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Unread
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('online')}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    listFilter === 'online'
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Online
                </button>
              </div>

              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all duration-200 outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
            </div>

            <ChatList
              conversations={visibleConversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoadingConversations}
            />
          </aside>

          <section
            className="rounded-3xl border border-gray-200/70 bg-white/80 backdrop-blur-sm shadow-xl h-full min-h-0 overflow-hidden"
            onMouseDownCapture={handlePanelInteraction}
            onFocusCapture={handlePanelInteraction}
          >
            {isLoadingMessages && activeConversation ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Loading chat...</span>
                </div>
              </div>
            ) : (
              <ChatWindow
                conversation={activeConversation}
                currentUserId={currentUser.id}
                messages={messages}
                draftMessage={draftMessage}
                isSending={isSending}
                pendingFiles={pendingFiles}
                onDraftChange={setDraftMessage}
                onPickFiles={handlePickFiles}
                onRemoveFile={handleRemoveFile}
                onAddEmoji={handleAddEmoji}
                onSendMessage={handleSendMessage}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Inbox;