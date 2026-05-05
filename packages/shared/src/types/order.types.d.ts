export type MarketplaceOrderMode = "buy" | "rent";
export type MarketplaceOrderStatus = "pending_seller_approval" | "approved" | "handover_otp_pending" | "in_use" | "return_otp_pending" | "completed" | "rejected" | "cancelled";
export type MarketplaceOrderDisputeStatus = "none" | "open" | "under_review" | "awaiting_parties" | "resolved" | "closed";
export type MarketplaceDisputeReasonCode = "item_not_received" | "item_not_as_described" | "damaged_item" | "late_delivery_or_return" | "payment_or_refund_issue" | "fraud_or_safety_concern" | "other";
export type MarketplaceDisputePriority = "low" | "medium" | "high" | "urgent";
export type MarketplaceDisputeVerdict = "buyer_favor" | "seller_favor" | "partial_refund" | "full_refund" | "replacement" | "warning" | "no_action" | "other";
export type MarketplacePaymentMethod = "escrow_card" | "bank_transfer" | "wallet";
export interface MarketplaceOrder {
    id: string;
    listingId: string;
    listingTitle: string;
    listingImageUrl: string;
    buyerId: string;
    sellerId: string;
    mode: MarketplaceOrderMode;
    quantity: number;
    durationUnit: "day" | "week" | "month" | null;
    durationCount: number | null;
    unitPrice: number;
    itemAmount: number;
    securityDeposit: number;
    platformFee: number;
    totalDue: number;
    paymentMethod: MarketplacePaymentMethod;
    paymentConfirmed: boolean;
    status: MarketplaceOrderStatus;
    statusReason: string | null;
    handoverOtpRequestedAt: string | null;
    handoverOtpExpiresAt: string | null;
    handoverVerifiedAt: string | null;
    returnOtpRequestedAt: string | null;
    returnOtpExpiresAt: string | null;
    returnVerifiedAt: string | null;
    completedAt: string | null;
    fullName: string;
    phone: string;
    city: string;
    deliveryAddress: string;
    specialInstructions: string;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
    rejectedAt: string | null;
    disputeStatus: MarketplaceOrderDisputeStatus;
    latestDisputeId: string | null;
}
export interface MarketplaceDisputeEvidenceItem {
    type: string;
    url: string;
    signedUrl?: string | null;
    storagePath?: string;
    name?: string;
    mimeType?: string;
    sizeBytes?: number;
    uploadedAt?: string | null;
    note?: string;
}
export interface MarketplaceDisputeSla {
    firstResponseDueAt: string;
    resolutionDueAt: string;
    firstResponseBreached: boolean;
    resolutionBreached: boolean;
}
export interface MarketplaceOrderDispute {
    id: string;
    orderId: string;
    listingId: string | null;
    buyerId: string;
    sellerId: string;
    openedByUserId: string;
    openedByRole: "buyer" | "seller";
    counterpartyUserId: string;
    reasonCode: MarketplaceDisputeReasonCode;
    title: string;
    description: string;
    requestedResolution: string | null;
    evidence: MarketplaceDisputeEvidenceItem[];
    priority: MarketplaceDisputePriority;
    status: Exclude<MarketplaceOrderDisputeStatus, "none">;
    assignedAdminUserId: string | null;
    resolutionVerdict: MarketplaceDisputeVerdict | null;
    resolutionSummary: string | null;
    resolutionActions: Record<string, unknown>;
    resolvedByAdminUserId: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    sla?: MarketplaceDisputeSla | null;
    buyer?: {
        userId: string;
        name: string;
        email: string;
        phone: string;
        city: string;
        kycStatus: string;
    } | null;
    seller?: {
        userId: string;
        name: string;
        email: string;
        phone: string;
        city: string;
        kycStatus: string;
    } | null;
}
export interface MarketplaceOrderDisputeMessage {
    id: string;
    disputeId: string;
    orderId: string;
    authorUserId: string;
    authorType: "buyer" | "seller" | "admin";
    body: string;
    attachments: MarketplaceDisputeEvidenceItem[];
    isInternalNote: boolean;
    createdAt: string;
}
export interface CreateMarketplaceOrderDisputeInput {
    title: string;
    description: string;
    reasonCode: MarketplaceDisputeReasonCode;
    requestedResolution?: string;
    priority?: MarketplaceDisputePriority;
    evidence?: MarketplaceDisputeEvidenceItem[];
}
export interface DisputeEvidenceUploadFileInput {
    name: string;
    type: string;
    base64: string;
}
export interface CreateMarketplaceOrderInput {
    listingId: string;
    buyerId: string;
    mode: MarketplaceOrderMode;
    quantity: number;
    durationUnit: "day" | "week" | "month" | null;
    durationCount: number | null;
    unitPrice: number;
    itemAmount: number;
    securityDeposit: number;
    platformFee: number;
    totalDue: number;
    paymentMethod: MarketplacePaymentMethod;
    paymentConfirmed: boolean;
    fullName: string;
    phone: string;
    city: string;
    deliveryAddress: string;
    specialInstructions: string;
}
export interface MarketplaceOrderOtpResponse {
    order: MarketplaceOrder;
    otp: string;
    expiresAt: string;
}
export interface MarketplaceOrderDisputeDetailResponse {
    dispute: MarketplaceOrderDispute;
    messages: MarketplaceOrderDisputeMessage[];
}
//# sourceMappingURL=order.types.d.ts.map