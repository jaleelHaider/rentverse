import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveBooking,
  createListing,
  deleteListing,
  fetchListingForEdit,
  fetchMyBookings,
  fetchMyListings,
  rejectBooking,
  updateListing,
  CreateListingPayload,
  UpdateListingPayload,
} from '../api/listings.api';

// Marketplace hooks (re-exports from useMarketplace)
export {
  useListingDetail as useListing,
  useMarketplaceListings as useListings,
  useMarketplaceSearch as useSearchListings,
} from './useMarketplace';

// Seller management hooks
export function useMyListings() {
  return useQuery({
    queryKey: ['listings', 'my'],
    queryFn: fetchMyListings,
  });
}

export function useListingForEdit(id: string) {
  return useQuery({
    queryKey: ['listings', id, 'edit'],
    queryFn: () => fetchListingForEdit(id),
    enabled: !!id,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'incoming'],
    queryFn: fetchMyBookings,
  });
}

export function useCreateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateListingPayload) => createListing(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['listings', 'my'] });
    },
  });
}

export function useUpdateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateListingPayload) => updateListing(payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['listings', 'my'] });
      void queryClient.invalidateQueries({ queryKey: ['listings', data.id] });
    },
  });
}

export function useDeleteListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['listings', 'my'] });
    },
  });
}

export function useApproveBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => approveBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'incoming'] });
    },
  });
}

export function useRejectBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      rejectBooking(bookingId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'incoming'] });
    },
  });
}
