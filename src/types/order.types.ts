export type MarketplaceOrderMode = "buy" | "rent";

export type MarketplaceOrderStatus =
  | "pending_seller_approval"
  | "approved"
  | "rejected"
  | "cancelled";

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
  fullName: string;
  phone: string;
  city: string;
  deliveryAddress: string;
  specialInstructions: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
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
