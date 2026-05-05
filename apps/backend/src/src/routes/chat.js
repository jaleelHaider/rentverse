import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const chatRouter = Router();

const FALLBACK_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1600&q=80";
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

const mapListingImage = (images) => {
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

const mapMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  content: row.content,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const normalizeListingRef = (listingRelation) => {
  if (!listingRelation) {
    return null;
  }

  if (Array.isArray(listingRelation)) {
    return listingRelation[0] || null;
  }

  return listingRelation;
};

const mapConversation = (row, userId, unreadByConversation, profileById, listingById) => {
  const listingRef = normalizeListingRef(row.listings) || listingById[row.listing_id] || null;
  const counterpartId = row.buyer_id === userId ? row.seller_id : row.buyer_id;
  const counterpartProfile = profileById[counterpartId];
  const isCounterpartSeller = counterpartId === row.seller_id;
  const counterpartName =
    counterpartProfile?.name?.trim() ||
    counterpartProfile?.email?.split("@")[0] ||
    (isCounterpartSeller ? listingRef?.owner_name?.trim() : "") ||
    "User";

  const listingTitle = listingRef?.title?.trim() || "Listing";

  const lastSeen = counterpartProfile?.last_login || null;
  const onlineThresholdMs = 2 * 60 * 1000;
  const isOnline = lastSeen ? Date.now() - new Date(lastSeen).getTime() <= onlineThresholdMs : false;

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
    lastMessage: row.last_message_text || "Start the conversation",
    lastMessageAt: row.last_message_at || row.created_at,
    unreadCount: unreadByConversation[row.id] || 0,
  };
};

const decodeAttachment = (attachment) => {
  const content = attachment?.contentBase64 || "";
  if (!content) {
    throw new Error("Invalid attachment payload.");
  }
  return Buffer.from(content, "base64");
};

chatRouter.post("/conversations", requireAuth, async (req, res) => {
  const { listingId, sellerId } = req.body || {};
  const buyerId = req.auth.sub;

  if (!listingId || !buyerId || !sellerId) {
    return res.status(400).json({ message: "Missing required conversation fields." });
  }

  if (buyerId === sellerId) {
    return res.status(400).json({ message: "You cannot start a chat on your own listing." });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .or(`and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`)
    .maybeSingle();

  if (existingError) {
    return res.status(400).json({ message: existingError.message || "Failed to check existing conversation." });
  }

  if (existing?.id) {
    return res.json({ id: existing.id });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      last_message_text: null,
      last_message_at: null,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    return res.status(400).json({ message: insertError?.message || "Failed to start conversation." });
  }

  return res.json({ id: inserted.id });
});

chatRouter.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data: conversations, error: conversationsError } = await supabaseAdmin
    .from("conversations")
    .select(
      "id,listing_id,buyer_id,seller_id,last_message_text,last_message_at,created_at,listings(id,title,owner_name,listing_images(public_url,is_primary,display_order))"
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (conversationsError) {
    return res.status(400).json({ message: conversationsError.message || "Failed to load conversations." });
  }

  const conversationRows = conversations || [];

  if (!conversationRows.length) {
    return res.json([]);
  }

  const listingIds = Array.from(new Set(conversationRows.map((row) => row.listing_id)));

  const { data: listingRows, error: listingRowsError } = await supabaseAdmin
    .from("listings")
    .select("id,title,owner_name,listing_images(public_url,is_primary,display_order)")
    .in("id", listingIds);

  if (listingRowsError) {
    return res.status(400).json({ message: listingRowsError.message || "Failed to load listing details for conversations." });
  }

  const listingById = (listingRows || []).reduce((acc, listing) => {
    acc[listing.id] = listing;
    return acc;
  }, {});

  const { data: unreadRows, error: unreadError } = await supabaseAdmin
    .from("messages")
    .select("conversation_id")
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (unreadError) {
    return res.status(400).json({ message: unreadError.message || "Failed to load unread counts." });
  }

  const unreadByConversation = (unreadRows || []).reduce((acc, row) => {
    const conversationId = row.conversation_id;
    acc[conversationId] = (acc[conversationId] || 0) + 1;
    return acc;
  }, {});

  const counterpartIds = Array.from(
    new Set(conversationRows.map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id)))
  );

  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,last_login")
    .in("id", counterpartIds);

  if (profileError) {
    return res.status(400).json({ message: profileError.message || "Failed to load chat participants." });
  }

  const profileById = (profileRows || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  return res.json(
    conversationRows.map((row) =>
      mapConversation(row, userId, unreadByConversation, profileById, listingById)
    )
  );
});

chatRouter.get("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  const { conversationId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id,conversation_id,sender_id,receiver_id,content,created_at,read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load messages." });
  }

  return res.json((data || []).map(mapMessage));
});

chatRouter.post("/messages", requireAuth, async (req, res) => {
  const senderId = req.auth.sub;
  const { conversationId, content, listingContextId, attachments } = req.body || {};
  const messageBody = (content || "").trim();

  if (!messageBody && !(Array.isArray(attachments) && attachments.length > 0)) {
    return res.status(400).json({ message: "Message cannot be empty." });
  }

  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from("conversations")
    .select("buyer_id,seller_id,listing_id")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    return res.status(404).json({ message: conversationError?.message || "Conversation not found." });
  }

  const buyerId = conversation.buyer_id;
  const sellerId = conversation.seller_id;
  const listingId = (listingContextId || conversation.listing_id);

  if (senderId !== buyerId && senderId !== sellerId) {
    return res.status(403).json({ message: "You are not a participant of this conversation." });
  }

  const receiverId = senderId === buyerId ? sellerId : buyerId;

  const attachmentLines = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const attachment of attachments) {
      const cleanName = (attachment.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${senderId}/${conversationId}/${Date.now()}-${cleanName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .upload(storagePath, decodeAttachment(attachment), {
          upsert: false,
          contentType: attachment.type || "application/octet-stream",
        });

      if (uploadError) {
        return res.status(400).json({ message: uploadError.message || `Failed to upload ${cleanName}` });
      }

      const publicUrl = supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
      attachmentLines.push(`Attachment: ${cleanName} (${publicUrl})`);
    }
  }

  const { count: existingMessagesCount, error: countError } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (countError) {
    return res.status(400).json({ message: countError.message || "Failed to validate conversation history." });
  }

  const isFirstMessage = (existingMessagesCount || 0) === 0;
  const listingPath = `/listing/${listingId}`;
  const listingTitleFromTable =
    (await supabaseAdmin.from("listings").select("title").eq("id", listingId).maybeSingle()).data?.title ||
    "this listing";

  const contextLine = `Product: ${listingTitleFromTable} (${listingPath})`;
  const combinedBody = [messageBody, ...attachmentLines].filter(Boolean).join("\n\n");
  const enrichedMessageBody = isFirstMessage ? `${combinedBody}\n\n${contextLine}` : combinedBody;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: enrichedMessageBody,
    })
    .select("id,conversation_id,sender_id,receiver_id,content,created_at,read_at")
    .single();

  if (insertError || !inserted) {
    return res.status(400).json({ message: insertError?.message || "Failed to send message." });
  }

  const now = new Date().toISOString();

  const { error: conversationUpdateError } = await supabaseAdmin
    .from("conversations")
    .update({
      last_message_text: enrichedMessageBody,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", conversationId);

  if (conversationUpdateError) {
    return res.status(400).json({ message: conversationUpdateError.message || "Failed to update conversation." });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: receiverId,
    actor_id: senderId,
    type: "message",
    title: "New message",
    body: `You received a new message about ${listingTitleFromTable}.`,
    data: { conversationId, listingId },
  });

  return res.json(mapMessage(inserted));
});

chatRouter.post("/conversations/:conversationId/read", requireAuth, async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.auth.sub;

  const { error } = await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to mark messages as read." });
  }

  return res.json({ ok: true });
});

chatRouter.get("/unread/notifications", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load notifications." });
  }

  return res.json({ count: count || 0 });
});

chatRouter.get("/unread/messages", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { count, error } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load unread chat count." });
  }

  return res.json({ count: count || 0 });
});
