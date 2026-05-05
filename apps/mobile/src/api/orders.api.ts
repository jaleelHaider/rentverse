import apiClient from './client';
import { getUser } from '../utils/tokenStorage';
import type {
  CreateMarketplaceOrderInput,
  CreateMarketplaceOrderDisputeInput,
  DisputeEvidenceUploadFileInput,
  MarketplaceDisputeEvidenceItem,
  MarketplaceOrder as SharedMarketplaceOrder,
  MarketplaceOrderDispute,
  MarketplaceOrderDisputeDetailResponse,
  MarketplaceOrderDisputeMessage,
} from '@rentverse/shared';

export type PlaceOrderPayload = CreateMarketplaceOrderInput;

export interface OrderResponse {
  id: string;
  listingId: string;
  listingTitle: string;
  disputeStatus?: string;
  latestDisputeId?: string | null;
  orderType: 'buy' | 'rent';
  quantity?: number;
  durationUnit?: 'day' | 'week' | 'month' | null;
  durationCount?: number | null;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  rentalStartDate?: string;
  rentalEndDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  paymentId?: string;
}

export interface MyOrdersResponse {
  buyingOrders: OrderResponse[];
  sellingOrders: OrderResponse[];
  rentingOrders: OrderResponse[];
}

const mapStatus = (status: SharedMarketplaceOrder['status']): OrderResponse['status'] => {
  switch (status) {
    case 'pending_seller_approval':
      return 'pending';
    case 'approved':
      return 'approved';
    case 'handover_otp_pending':
    case 'in_use':
    case 'return_otp_pending':
      return 'in_transit';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const getDisplayName = (user: any): string =>
  String(user?.user_metadata?.full_name || user?.user_metadata?.name || 'You');

const mapOrderToLegacy = (
  order: SharedMarketplaceOrder,
  currentUserId: string | null,
  currentUserName: string
): OrderResponse => {
  const isBuyer = order.buyerId === currentUserId;
  const isSeller = order.sellerId === currentUserId;

  return {
    id: order.id,
    listingId: order.listingId,
    listingTitle: order.listingTitle,
    orderType: order.mode,
    quantity: order.quantity,
    durationUnit: order.durationUnit,
    durationCount: order.durationCount,
    buyerId: order.buyerId,
    buyerName: isBuyer ? currentUserName : order.fullName || 'Buyer',
    sellerId: order.sellerId,
    sellerName: isSeller ? currentUserName : 'Seller',
    totalPrice: order.totalDue,
    status: mapStatus(order.status),
    rentalStartDate: undefined,
    rentalEndDate: undefined,
    notes: order.specialInstructions || undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt || undefined,
    paymentId: undefined,
    disputeStatus: (order as any).disputeStatus || 'none',
    latestDisputeId: (order as any).latestDisputeId || null,
  };
};

// Place order (buyer)
export const placeOrder = async (payload: PlaceOrderPayload) => {
  const response = await apiClient.post<SharedMarketplaceOrder>('/orders', payload);
  return response.data;
};

// Get my orders (both buying and selling)
export const fetchMyOrders = async (): Promise<MyOrdersResponse> => {
  const response = await apiClient.get<SharedMarketplaceOrder[]>('/orders/me');
  const currentUser = await getUser();
  const currentUserId = currentUser?.id || null;
  const currentUserName = getDisplayName(currentUser);
  const legacyOrders = Array.isArray(response.data)
    ? response.data.map((order) => mapOrderToLegacy(order, currentUserId, currentUserName))
    : [];

  return {
    buyingOrders: legacyOrders.filter((order) => order.orderType === 'buy' && order.buyerId === currentUserId),
    sellingOrders: legacyOrders.filter((order) => order.sellerId === currentUserId),
    rentingOrders: legacyOrders.filter((order) => order.orderType === 'rent' && order.buyerId === currentUserId),
  };
};

// Get single order details
export const fetchOrderDetails = async (orderId: string) => {
  const response = await apiClient.get<SharedMarketplaceOrder>(`/orders/${orderId}`);
  return response.data;
};

// Disputes
export interface CreateDisputePayload {
  title: string;
  description: string;
  reasonCode: string;
  requestedResolution?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  evidence?: Array<any>;
}

export const createDispute = async (orderId: string, payload: CreateDisputePayload) => {
  const response = await apiClient.post(`/orders/${orderId}/disputes`, payload);
  return response.data;
};

export const fetchDisputes = async (orderId: string) => {
  const response = await apiClient.get<MarketplaceOrderDispute[]>(`/orders/${orderId}/disputes`);
  return response.data;
};

export const fetchDispute = async (orderId: string, disputeId: string) => {
  const response = await apiClient.get<MarketplaceOrderDisputeDetailResponse>(`/orders/${orderId}/disputes/${disputeId}`);
  return response.data;
};

export const createDispute = async (orderId: string, payload: CreateMarketplaceOrderDisputeInput) => {
  const response = await apiClient.post<{ dispute: MarketplaceOrderDispute; initialMessage: MarketplaceOrderDisputeMessage }>(
    `/orders/${orderId}/disputes`,
    payload
  );
  return response.data;
};

export const uploadDisputeEvidence = async (orderId: string, files: DisputeEvidenceUploadFileInput[]) => {
  const response = await apiClient.post<{ evidence: MarketplaceDisputeEvidenceItem[] }>(`/orders/${orderId}/disputes/evidence/upload`, {
    files,
  });
  return response.data.evidence;
};

export const postDisputeMessage = async (
  orderId: string,
  disputeId: string,
  body: string,
  attachments: MarketplaceDisputeEvidenceItem[] = []
) => {
  const response = await apiClient.post<MarketplaceOrderDisputeMessage>(`/orders/${orderId}/disputes/${disputeId}/messages`, {
    body,
    attachments,
  });
  return response.data;
};

// Update order status (seller action: approve/reject/confirm delivery)
export const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
  const response = await apiClient.patch(`/orders/${orderId}/status`, {
    status,
    notes,
  });
  return response.data as SharedMarketplaceOrder;
};

// Cancel order (buyer)
export const cancelOrder = async (orderId: string, reason?: string) => {
  const response = await apiClient.post(`/orders/${orderId}/cancel`, { reason });
  return response.data as SharedMarketplaceOrder;
};

// Confirm delivery (seller)
export const confirmDelivery = async (orderId: string) => {
  const response = await apiClient.post(`/orders/${orderId}/confirm-delivery`, {});
  return response.data as SharedMarketplaceOrder;
};

// Request return (buyer)
export const requestReturn = async (orderId: string, reason: string) => {
  const response = await apiClient.post(`/orders/${orderId}/request-return`, { reason });
  return response.data as SharedMarketplaceOrder;
};

// Approve order (seller)
export const approveOrder = async (orderId: string) => {
  const response = await apiClient.post(`/orders/${orderId}/approve`, {});
  return response.data as SharedMarketplaceOrder;
};

// Reject order (seller)
export const rejectOrder = async (orderId: string, reason?: string) => {
  const response = await apiClient.post(`/orders/${orderId}/reject`, { reason });
  return response.data as SharedMarketplaceOrder;
};
