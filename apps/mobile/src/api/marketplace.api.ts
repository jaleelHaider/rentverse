import apiClient from './client';

export interface MarketplacePriceBand {
  buy?: number;
  rent?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  securityDeposit?: number;
}

export interface MarketplaceListingSeller {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
  trustScore: number;
  totalReviews: number;
}

export interface MarketplaceListingLocation {
  city: string;
  area: string;
  address?: string;
  coordinates?: [number, number];
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  type: 'buy' | 'rent' | 'both';
  category: string;
  subCategory: string;
  categoryNodeKey: string;
  categoryPath: string;
  condition: string;
  price: MarketplacePriceBand;
  images: string[];
  location: MarketplaceListingLocation;
  specifications: Record<string, string | number | boolean | null>;
  features: string[];
  sellerTerms: string[];
  seller: MarketplaceListingSeller;
  availability: {
    forRent: boolean;
    forSale: boolean;
    totalForRent: number;
    availableForRent: number;
    totalForSale: number;
    availableForSale: number;
  };
  aiMetadata: {
    qualityScore: number;
    priceFairness: number;
    fraudRisk: number;
    categoryConfidence: number;
  };
  views: number;
  saves: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'sold' | 'rented' | 'draft';
  relevanceScore?: number;
  rankPosition?: number;
}

export interface MarketplaceSearchFilters {
  category?: string[];
  condition?: string[];
  type?: string[];
  sellerVerified?: boolean;
  ratingMin?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export interface MarketplaceSearchResponse {
  query: string;
  searchSessionId: string;
  total: number;
  page: number;
  pageSize: number;
  offset: number;
  hasMore: boolean;
  sortBy: string;
  results: MarketplaceListing[];
}

export interface ListingReportPayload {
  listingId: string;
  reasonCode: string;
  description?: string;
}

export const fetchMarketplaceListings = async () => {
  const response = await apiClient.get<MarketplaceListing[]>('/listings/marketplace');
  return response.data;
};

export const fetchListingById = async (listingId: string) => {
  const response = await apiClient.get<MarketplaceListing>(`/listings/${listingId}`);
  return response.data;
};

export const fetchSavedListingIds = async () => {
  const response = await apiClient.get<{ ids: string[] }>('/listings/saved/ids');
  return response.data.ids || [];
};

export const fetchSavedListings = async () => {
  const response = await apiClient.get<MarketplaceListing[]>('/listings/saved');
  return response.data;
};

export const fetchMyListings = async () => {
  const response = await apiClient.get<{ listings: MarketplaceListing[] }>('/listings/me/listings');
  return response.data.listings || [];
};

export const fetchSellerStats = async (ownerUserId: string) => {
  const response = await apiClient.get(`/listings/seller/${ownerUserId}/stats`);
  return response.data as Record<string, unknown>;
};

export const searchMarketplaceListings = async ({
  query,
  page,
  pageSize,
  sortBy,
  filters,
}: {
  query: string;
  page: number;
  pageSize: number;
  sortBy: string;
  filters: MarketplaceSearchFilters;
}) => {
  const response = await apiClient.get<MarketplaceSearchResponse>('/listings/marketplace/search', {
    params: {
      q: query,
      page,
      limit: pageSize,
      sort: sortBy,
      category: filters.category?.join(','),
      condition: filters.condition?.join(','),
      type: filters.type?.join(','),
      sellerVerified: filters.sellerVerified,
      ratingMin: filters.ratingMin,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    },
  });

  return response.data;
};

export const saveListing = async (listingId: string) => {
  const response = await apiClient.post(`/listings/${listingId}/save`);
  return response.data as { saved: boolean; id: string };
};

export const reportListing = async ({ listingId, reasonCode, description }: ListingReportPayload) => {
  const response = await apiClient.post('/reports/listing', {
    listingId,
    reasonCode,
    description,
  });
  return response.data as { id: string; status: string };
};
