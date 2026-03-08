import { supabase } from '@/lib/supabase';
import type {
  ChatConversationSummary,
  ChatMessageItem,
  StartListingConversationInput,
} from '@/types/chat.types';

interface ListingImageRow {
  public_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ListingRefRow {
  id: string;
  title: string;
  owner_name?: string | null;
  listing_images: ListingImageRow[] | null;
}

interface ConversationRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  listings: ListingRefRow | ListingRefRow[] | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  last_login: string | null;
}

const FALLBACK_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1600&q=80';

const mapListingImage = (images: ListingImageRow[] | null | undefined): string => {
  if (!images || images.length === 0) {
    return FALLBACK_LISTING_IMAGE;
  }

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return a.display_order - b.display_order;
    }
    return a.is_primary ? -1 : 1;
  });

  return sorted[0]?.public_url || FALLBACK_LISTING_IMAGE;
};

const mapMessage = (row: MessageRow): ChatMessageItem => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  content: row.content,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const normalizeListingRef = (
  listingRelation: ListingRefRow | ListingRefRow[] | null | undefined
): ListingRefRow | null => {
  if (!listingRelation) {
    return null;
  }

  if (Array.isArray(listingRelation)) {
    return listingRelation[0] || null;
  }

  return listingRelation;
};

const mapConversation = (
  row: ConversationRow,
  userId: string,
  unreadByConversation: Record<string, number>,
  profileById: Record<string, ProfileRow>,
  listingById: Record<string, ListingRefRow>
): ChatConversationSummary => {
  const listingRef = normalizeListingRef(row.listings) || listingById[row.listing_id] || null;
  const counterpartId = row.buyer_id === userId ? row.seller_id : row.buyer_id;
  const counterpartProfile = profileById[counterpartId];
  const isCounterpartSeller = counterpartId === row.seller_id;
  const counterpartName =
    counterpartProfile?.name?.trim() ||
    counterpartProfile?.email?.split('@')[0] ||
    (isCounterpartSeller ? listingRef?.owner_name?.trim() : '') ||
    'User';

  const listingTitle = listingRef?.title?.trim() || 'Listing';

  const lastSeen = counterpartProfile?.last_login || null;
  const onlineThresholdMs = 2 * 60 * 1000;
  const isOnline = lastSeen
    ? Date.now() - new Date(lastSeen).getTime() <= onlineThresholdMs
    : false;

  return {
    id: row.id,
    listing: {
      id: row.listing_id,
      title: listingTitle,
      imageUrl: mapListingImage(listingRef?.listing_images),
    },
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    counterpartId,
    counterpartName,
    counterpartOnline: isOnline,
    counterpartLastSeen: lastSeen,
    lastMessage: row.last_message_text || 'Start the conversation',
    lastMessageAt: row.last_message_at || row.created_at,
    unreadCount: unreadByConversation[row.id] || 0,
  };
};

export const getOrCreateListingConversation = async (
  input: StartListingConversationInput
): Promise<{ id: string }> => {
  const { listingId, buyerId, sellerId } = input;

  if (!listingId || !buyerId || !sellerId) {
    throw new Error('Missing required conversation fields.');
  }

  if (buyerId === sellerId) {
    throw new Error('You cannot start a chat on your own listing.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Failed to check existing conversation.');
  }

  if (existing?.id) {
    return { id: existing.id as string };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      last_message_text: null,
      last_message_at: null,
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message || 'Failed to start conversation.');
  }

  return { id: inserted.id as string };
};

export const fetchUserConversations = async (
  userId: string
): Promise<ChatConversationSummary[]> => {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(
      'id,listing_id,buyer_id,seller_id,last_message_text,last_message_at,created_at,listings(id,title,owner_name,listing_images(public_url,is_primary,display_order))'
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (conversationsError) {
    throw new Error(conversationsError.message || 'Failed to load conversations.');
  }

  const conversationRows = (conversations || []) as ConversationRow[];

  if (!conversationRows.length) {
    return [];
  }

  const listingIds = Array.from(new Set(conversationRows.map((row) => row.listing_id)));

  const { data: listingRows, error: listingRowsError } = await supabase
    .from('listings')
    .select('id,title,owner_name,listing_images(public_url,is_primary,display_order)')
    .in('id', listingIds);

  if (listingRowsError) {
    throw new Error(listingRowsError.message || 'Failed to load listing details for conversations.');
  }

  const listingById = (listingRows || []).reduce<Record<string, ListingRefRow>>((acc, listing) => {
    const typed = listing as ListingRefRow;
    acc[typed.id] = typed;
    return acc;
  }, {});

  const { data: unreadRows, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('receiver_id', userId)
    .is('read_at', null);

  if (unreadError) {
    throw new Error(unreadError.message || 'Failed to load unread counts.');
  }

  const unreadByConversation = (unreadRows || []).reduce<Record<string, number>>((acc, row) => {
    const conversationId = row.conversation_id as string;
    acc[conversationId] = (acc[conversationId] || 0) + 1;
    return acc;
  }, {});

  const counterpartIds = Array.from(
    new Set(
      conversationRows.map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id))
    )
  );

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id,name,email,last_login')
    .in('id', counterpartIds);

  if (profileError) {
    throw new Error(profileError.message || 'Failed to load chat participants.');
  }

  const profileById = (profileRows || []).reduce<Record<string, ProfileRow>>((acc, profile) => {
    const typedProfile = profile as ProfileRow;
    acc[typedProfile.id] = typedProfile;
    return acc;
  }, {});

  return conversationRows.map((row) =>
    mapConversation(row, userId, unreadByConversation, profileById, listingById)
  );
};

export const fetchConversationMessages = async (
  conversationId: string
): Promise<ChatMessageItem[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,receiver_id,content,created_at,read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load messages.');
  }

  return ((data || []) as MessageRow[]).map(mapMessage);
};

export const sendConversationMessage = async (input: {
  conversationId: string;
  senderId: string;
  content: string;
  listingContextId?: string;
}): Promise<ChatMessageItem> => {
  const messageBody = input.content.trim();

  if (!messageBody) {
    throw new Error('Message cannot be empty.');
  }

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('buyer_id,seller_id,listing_id')
    .eq('id', input.conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new Error(conversationError?.message || 'Conversation not found.');
  }

  const buyerId = conversation.buyer_id as string;
  const sellerId = conversation.seller_id as string;
  const listingId = (input.listingContextId || (conversation.listing_id as string)) as string;

  if (input.senderId !== buyerId && input.senderId !== sellerId) {
    throw new Error('You are not a participant of this conversation.');
  }

  const receiverId = input.senderId === buyerId ? sellerId : buyerId;

  const { count: existingMessagesCount, error: countError } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', input.conversationId);

  if (countError) {
    throw new Error(countError.message || 'Failed to validate conversation history.');
  }

  const isFirstMessage = (existingMessagesCount || 0) === 0;
  const listingPath = `/listing/${listingId}`;
  const listingTitleFromTable =
    (await supabase
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .maybeSingle()).data?.title || 'this listing';

  const contextLine = `Product: ${listingTitleFromTable} (${listingPath})`;
  const enrichedMessageBody = isFirstMessage
    ? `${messageBody}\n\n${contextLine}`
    : messageBody;

  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      receiver_id: receiverId,
      content: enrichedMessageBody,
    })
    .select('id,conversation_id,sender_id,receiver_id,content,created_at,read_at')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Failed to send message.');
  }

  const now = new Date().toISOString();

  const { error: conversationUpdateError } = await supabase
    .from('conversations')
    .update({
      last_message_text: enrichedMessageBody,
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', input.conversationId);

  if (conversationUpdateError) {
    throw new Error(conversationUpdateError.message || 'Failed to update conversation.');
  }

  await supabase.from('notifications').insert({
    user_id: receiverId,
    actor_id: input.senderId,
    type: 'message',
    title: 'New message',
    body: `You received a new message about ${listingTitleFromTable}.`,
    data: { conversationId: input.conversationId, listingId },
  });

  return mapMessage(inserted as MessageRow);
};

export const markConversationMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(error.message || 'Failed to mark messages as read.');
  }
};

export const fetchUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(error.message || 'Failed to load notifications.');
  }

  return count || 0;
};

export const fetchUnreadChatCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(error.message || 'Failed to load unread chat count.');
  }

  return count || 0;
};
