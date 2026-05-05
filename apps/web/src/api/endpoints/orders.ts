import { apiJsonRequest } from '@/api/clients';
import type {
  CreateMarketplaceOrderDisputeInput,
  CreateMarketplaceOrderInput,
  DisputeEvidenceUploadFileInput,
  MarketplaceDisputeEvidenceItem,
  MarketplaceOrderDispute,
  MarketplaceOrderDisputeDetailResponse,
  MarketplaceOrderDisputeMessage,
  MarketplaceOrderOtpResponse,
  MarketplaceOrder,
} from '@rentverse/shared';

export const createMarketplaceOrder = async (
  input: CreateMarketplaceOrderInput
): Promise<MarketplaceOrder> => {
  return apiJsonRequest<MarketplaceOrder>('/orders', {
    method: 'POST',
    auth: true,
    body: input,
  });
};

export const fetchMarketplaceOrdersForUser = async (userId: string): Promise<MarketplaceOrder[]> => {
  void userId;
  return apiJsonRequest<MarketplaceOrder[]>('/orders/me', {
    method: 'GET',
    auth: true,
  });
};

export const approveMarketplaceOrder = async (
  orderId: string,
  sellerId: string
): Promise<MarketplaceOrder> => {
  void sellerId;
  return apiJsonRequest<MarketplaceOrder>(`/orders/${orderId}/approve`, {
    method: 'POST',
    auth: true,
  });
};

export const rejectMarketplaceOrder = async (
  orderId: string,
  sellerId: string,
  reason?: string
): Promise<MarketplaceOrder> => {
  void sellerId;
  return apiJsonRequest<MarketplaceOrder>(`/orders/${orderId}/reject`, {
    method: 'POST',
    auth: true,
    body: { reason },
  });
};

export const cancelMarketplaceOrder = async (
  orderId: string,
  reason?: string
): Promise<MarketplaceOrder> => {
  return apiJsonRequest<MarketplaceOrder>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    auth: true,
    body: { reason },
  });
};

export const requestHandoverOtp = async (orderId: string): Promise<MarketplaceOrderOtpResponse> => {
  return apiJsonRequest<MarketplaceOrderOtpResponse>(`/orders/${orderId}/handover-otp/request`, {
    method: 'POST',
    auth: true,
  });
};

export const verifyHandoverOtp = async (
  orderId: string,
  otp: string
): Promise<MarketplaceOrder> => {
  return apiJsonRequest<MarketplaceOrder>(`/orders/${orderId}/handover-otp/verify`, {
    method: 'POST',
    auth: true,
    body: { otp },
  });
};

export const requestReturnOtp = async (orderId: string): Promise<MarketplaceOrderOtpResponse> => {
  return apiJsonRequest<MarketplaceOrderOtpResponse>(`/orders/${orderId}/return-otp/request`, {
    method: 'POST',
    auth: true,
  });
};

export const verifyReturnOtp = async (
  orderId: string,
  otp: string
): Promise<MarketplaceOrder> => {
  return apiJsonRequest<MarketplaceOrder>(`/orders/${orderId}/return-otp/verify`, {
    method: 'POST',
    auth: true,
    body: { otp },
  });
};

export const createOrderDispute = async (
  orderId: string,
  input: CreateMarketplaceOrderDisputeInput
): Promise<{ dispute: MarketplaceOrderDispute; initialMessage: MarketplaceOrderDisputeMessage }> => {
  return apiJsonRequest<{ dispute: MarketplaceOrderDispute; initialMessage: MarketplaceOrderDisputeMessage }>(
    `/orders/${orderId}/disputes`,
    {
      method: 'POST',
      auth: true,
      body: input,
    }
  );
};

export const fetchOrderDisputes = async (orderId: string): Promise<MarketplaceOrderDispute[]> => {
  return apiJsonRequest<MarketplaceOrderDispute[]>(`/orders/${orderId}/disputes`, {
    method: 'GET',
    auth: true,
  });
};

export const fetchOrderDisputeDetail = async (
  orderId: string,
  disputeId: string
): Promise<MarketplaceOrderDisputeDetailResponse> => {
  return apiJsonRequest<MarketplaceOrderDisputeDetailResponse>(`/orders/${orderId}/disputes/${disputeId}`, {
    method: 'GET',
    auth: true,
  });
};

export const postOrderDisputeMessage = async (
  orderId: string,
  disputeId: string,
  body: string,
  attachments: MarketplaceDisputeEvidenceItem[] = []
): Promise<MarketplaceOrderDisputeMessage> => {
  return apiJsonRequest<MarketplaceOrderDisputeMessage>(`/orders/${orderId}/disputes/${disputeId}/messages`, {
    method: 'POST',
    auth: true,
    body: { body, attachments },
  });
};

export const uploadOrderDisputeEvidence = async (
  orderId: string,
  files: DisputeEvidenceUploadFileInput[]
): Promise<MarketplaceDisputeEvidenceItem[]> => {
  const response = await apiJsonRequest<{ evidence: MarketplaceDisputeEvidenceItem[] }>(
    `/orders/${orderId}/disputes/evidence/upload`,
    {
      method: 'POST',
      auth: true,
      body: { files },
    }
  );

  return Array.isArray(response?.evidence) ? response.evidence : [];
};
