export interface ChatListingPreview {
    id: string;
    title: string;
    imageUrl: string;
}
export interface ChatConversationSummary {
    id: string;
    listing: ChatListingPreview;
    buyerId: string;
    sellerId: string;
    counterpartId: string;
    counterpartName: string;
    counterpartOnline: boolean;
    counterpartLastSeen: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}
export interface ChatMessageItem {
    id: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    readAt: string | null;
}
export interface StartListingConversationInput {
    listingId: string;
    buyerId: string;
    sellerId: string;
}
//# sourceMappingURL=chat.types.d.ts.map