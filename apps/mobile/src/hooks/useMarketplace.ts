import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchListingById,
  fetchMarketplaceListings,
  fetchMyListings,
  fetchSavedListingIds,
  fetchSavedListings,
  fetchSellerStats,
  reportListing,
  saveListing,
  searchMarketplaceListings,
  type MarketplaceSearchFilters,
} from '../api/marketplace.api';

export function useMarketplaceListings() {
  return useQuery({
    queryKey: ['marketplace', 'feed'],
    queryFn: fetchMarketplaceListings,
  });
}

export function useListingDetail(listingId: string) {
  return useQuery({
    queryKey: ['marketplace', 'listing', listingId],
    queryFn: () => fetchListingById(listingId),
    enabled: !!listingId,
  });
}

export function useSavedListingIds() {
  return useQuery({
    queryKey: ['marketplace', 'saved-ids'],
    queryFn: fetchSavedListingIds,
  });
}

export function useSavedListings() {
  return useQuery({
    queryKey: ['marketplace', 'saved'],
    queryFn: fetchSavedListings,
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: ['marketplace', 'my-listings'],
    queryFn: fetchMyListings,
  });
}

export function useSellerStats(ownerUserId: string) {
  return useQuery({
    queryKey: ['marketplace', 'seller-stats', ownerUserId],
    queryFn: () => fetchSellerStats(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useMarketplaceSearch(query: string, filters: MarketplaceSearchFilters, sortBy: string) {
  return useInfiniteQuery({
    queryKey: ['marketplace', 'search', query, filters, sortBy],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchMarketplaceListings({
        query,
        page: pageParam,
        pageSize: 20,
        sortBy,
        filters,
      }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: query.trim().length >= 2,
  });
}

export function useSaveListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveListing,
    onSuccess: async (_data, listingId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'feed'] }),
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'saved'] }),
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'saved-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId] }),
      ]);
    },
  });
}

export function useReportListingMutation() {
  return useMutation({
    mutationFn: reportListing,
  });
}
