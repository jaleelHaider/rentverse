import { apiJsonRequest } from '@/api/clients';
import type {
  CreateMarketplaceOrderInput,
  MarketplaceOrder,
} from '@/types/order.types';

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