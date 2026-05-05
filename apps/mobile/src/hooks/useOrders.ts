import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMarketplaceOrderDisputeInput,
  DisputeEvidenceUploadFileInput,
  MarketplaceDisputeEvidenceItem,
} from '@rentverse/shared';
import {
  cancelOrder,
  confirmDelivery,
  createDispute,
  fetchMyOrders,
  fetchOrderDetails,
  fetchDispute,
  fetchDisputes,
  placeOrder,
  requestReturn,
  postDisputeMessage,
  uploadDisputeEvidence,
  updateOrderStatus,
  PlaceOrderPayload,
  approveOrder,
  rejectOrder,
} from '../api/orders.api';

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: fetchMyOrders,
  });
}

export function useOrderDetails(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => fetchOrderDetails(orderId),
    enabled: !!orderId,
  });
}

export function usePlaceOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) => placeOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) =>
      updateOrderStatus(orderId, status, notes),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
    },
  });
}

export function useApproveOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => approveOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
}

export function useRejectOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      rejectOrder(orderId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      cancelOrder(orderId, reason),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
    },
  });
}

export function useConfirmDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => confirmDelivery(orderId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
    },
  });
}

export function useRequestReturnMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      requestReturn(orderId, reason),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
    },
  });
}

export function useCreateDisputeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: CreateMarketplaceOrderDisputeInput }) => createDispute(orderId, payload),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'disputes'] });
    },
  });
}

export function useFetchDisputes(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId, 'disputes'],
    queryFn: () => fetchDisputes(orderId),
    enabled: !!orderId,
  });
}

export function useDisputeDetail(orderId: string, disputeId: string) {
  return useQuery({
    queryKey: ['orders', orderId, 'disputes', disputeId],
    queryFn: () => fetchDispute(orderId, disputeId),
    enabled: !!orderId && !!disputeId,
  });
}

export function useUploadDisputeEvidenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, files }: { orderId: string; files: DisputeEvidenceUploadFileInput[] }) => uploadDisputeEvidence(orderId, files),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'disputes'] });
    },
  });
}

export function usePostDisputeMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, disputeId, body, attachments }: { orderId: string; disputeId: string; body: string; attachments?: MarketplaceDisputeEvidenceItem[] }) =>
      postDisputeMessage(orderId, disputeId, body, attachments),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'disputes'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'disputes', variables.disputeId] });
    },
  });
}
