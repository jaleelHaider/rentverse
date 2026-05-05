import { apiJsonRequest, getApiBaseUrl, fileToBase64 } from '@/api/clients';
import type {
  Listing,
  CreateListingPayload,
  ListingOwner,
  UpdateListingPayload,
} from '@rentverse/shared';

interface CreateListingResult {
  listingId: string;
  imageCount: number;
  imageQualityWarnings?: Array<{
    index: number;
    name: string;
    verdict: "warn";
    score: number;
    warnings: string[];
    failures: string[];
    metrics: Record<string, number>;
  }>;
}

interface EncodedImageFile {
  name: string;
  type: string;
  contentBase64: string;
}

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

const stripDataUrlPrefix = (value: string): string => {
  const index = value.indexOf(',');
  if (index < 0) {
    return value;
  }
  return value.slice(index + 1);
};

const replaceExtensionWithJpeg = (fileName: string): string => {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf('.');
  const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  return `${baseName || 'image'}.jpg`;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error(`Failed to read image: ${file.name}`));
    };

    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      resolve(raw);
    };

    reader.readAsDataURL(file);
  });
};

const optimizeImageForUpload = async (file: File): Promise<EncodedImageFile> => {
  try {
    const rawDataUrl = await readFileAsDataUrl(file);

    const image = new Image();
    image.src = rawDataUrl;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);
      image.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to decode image: ${file.name}`));
      };
    });

    const longestEdge = Math.max(image.width, image.height);
    const scale = longestEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestEdge : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image processing is not supported in this browser.');
    }

    context.drawImage(image, 0, 0, width, height);
    const optimized = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    
    console.log(`✓ Optimized ${file.name}: ${Math.round(optimized.length / 1024)}KB`);

    return {
      name: replaceExtensionWithJpeg(file.name),
      type: 'image/jpeg',
      contentBase64: stripDataUrlPrefix(optimized),
    };
  } catch (error) {
    console.error(`✗ Image optimization failed for ${file.name}:`, error);
    throw error;
  }
};

export interface ImageQualityCheckResult {
  imageName: string;
  verdict: "accept" | "warn" | "reject";
  score: number;
  warnings: string[];
  failures: string[];
  metrics: Record<string, number>;
}

export interface TaxonomyNode {
  node_key: string;
  parent_key?: string;
  name: string;
  full_path: string;
  depth: number;
  is_leaf: boolean;
  child_count: number;
}

export interface PredictedCategorySuggestion {
  nodeKey: string;
  fullPath: string;
  confidence: number;
  reason: string[];
}

export interface EditableListingData {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  categoryNodeKey: string;
  categoryPath: string;
  categorySource: "ai" | "manual" | "";
  categoryConfidence: number | null;
  condition: string;
  listingType: 'buy' | 'rent' | 'both';
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
    radius: number;
  };
  price: {
    buy: string;
    rent: {
      daily: string;
      weekly: string;
      monthly: string;
    };
    securityDeposit: string;
  };
  availability: {
    minRentalDays: number;
    maxRentalDays: number;
    totalForRent: number;
    availableForRent: number;
    totalForSale: number;
    availableForSale: number;
  };
  specifications: Record<string, string>;
  features: string[];
  images: string[];
}

export const createListingWithImages = async (
  payload: CreateListingPayload,
  owner: ListingOwner
): Promise<CreateListingResult> => {
  void owner;
  const encodedImages = await Promise.all((payload.images || []).map((image) => optimizeImageForUpload(image)));
  
  const totalSize = Math.round(JSON.stringify(encodedImages).length / 1024 / 1024);
  console.log(`Sending listing with ${encodedImages.length} image(s), total size: ${totalSize}MB`);

  try {
    return await apiJsonRequest<CreateListingResult>('/listings/me', {
      method: 'POST',
      auth: true,
      body: {
        ...payload,
        images: encodedImages,
      },
    });
  } catch (error) {
    console.error('Listing creation failed:', error);
    throw error;
  }
};

export const fetchMarketplaceListings = async (): Promise<Listing[]> => {
  return apiJsonRequest<Listing[]>('/listings/marketplace', {
    method: 'GET',
  });
};

export interface MarketplaceSearchResult extends Listing {
  relevanceScore?: number;
  rankPosition?: number;
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
  results: MarketplaceSearchResult[];
}

export interface MarketplaceSearchFilters {
  categories?: string[];
  conditions?: string[];
  listingTypes?: Array<'buy' | 'rent' | 'both'>;
  sellerVerified?: boolean;
  ratingMin?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export interface MarketplaceSuggestionItem {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  image: string;
  price: Listing['price'];
  location: string;
}

export interface MarketplaceSuggestionsResponse {
  query: string;
  keywords: string[];
  listings: MarketplaceSuggestionItem[];
}

export const searchMarketplaceListings = async (
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    sort?: 'relevant' | 'newest' | 'price_low' | 'price_high' | 'rating' | 'trust';
    filters?: MarketplaceSearchFilters;
  }
): Promise<MarketplaceSearchResponse> => {
  const params = new URLSearchParams();
  params.set('q', query);
  if (typeof options?.page === 'number') {
    params.set('page', String(options.page));
  }
  if (typeof options?.pageSize === 'number') {
    params.set('limit', String(options.pageSize));
  }
  if (typeof options?.sort === 'string') {
    params.set('sort', options.sort);
  }
  if (options?.filters) {
    const { categories, conditions, listingTypes, sellerVerified, ratingMin, minPrice, maxPrice } = options.filters;

    if (categories?.length) params.set('category', categories.join(','));
    if (conditions?.length) params.set('condition', conditions.join(','));
    if (listingTypes?.length) params.set('type', listingTypes.join(','));
    if (typeof sellerVerified === 'boolean') params.set('sellerVerified', String(sellerVerified));
    if (typeof ratingMin === 'number' && ratingMin > 0) params.set('ratingMin', String(ratingMin));
    if (typeof minPrice === 'number' && Number.isFinite(minPrice)) params.set('minPrice', String(minPrice));
    if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) params.set('maxPrice', String(maxPrice));
  }

  return apiJsonRequest<MarketplaceSearchResponse>(`/listings/marketplace/search?${params.toString()}`, {
    method: 'GET',
  });
};

export interface MarketplaceSearchEventPayload {
  eventType: 'search' | 'click';
  searchSessionId: string;
  query: string;
  listingId?: string;
  rankPosition?: number;
  resultCount?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  filters?: MarketplaceSearchFilters;
}

export const recordMarketplaceSearchEvent = async (payload: MarketplaceSearchEventPayload): Promise<void> => {
  await fetch(`${getApiBaseUrl()}/listings/marketplace/search-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined);
};

export interface MarketplaceSearchAnalytics {
  totalSearches: number;
  totalClicks: number;
  topQueries: Array<{
    query: string;
    searches: number;
    zeroResults: number;
    averageResults: number;
  }>;
  zeroResults: Array<{
    query: string;
    zeroResults: number;
    searches: number;
  }>;
  ctrByRank: Array<{
    rank: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  recentSearches: Array<{
    searchSessionId: string;
    query: string;
    resultCount: number;
    page: number;
    pageSize: number;
    sortBy: string;
    createdAt: string;
  }>;
}

export const fetchMarketplaceSearchAnalytics = async (): Promise<MarketplaceSearchAnalytics> => {
  return apiJsonRequest<MarketplaceSearchAnalytics>('/listings/marketplace/search/analytics', {
    method: 'GET',
  });
};

export const fetchMarketplaceSuggestions = async (
  query: string,
  limit = 6
): Promise<MarketplaceSuggestionsResponse> => {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', String(limit));

  return apiJsonRequest<MarketplaceSuggestionsResponse>(`/listings/marketplace/suggestions?${params.toString()}`, {
    method: 'GET',
  });
};

export const fetchUserListings = async (userId: string): Promise<Listing[]> => {
  void userId;
  return apiJsonRequest<Listing[]>('/listings/me/listings', {
    method: 'GET',
    auth: true,
  });
};

export const fetchMarketplaceListingById = async (listingId: string): Promise<Listing> => {
  return apiJsonRequest<Listing>(`/listings/${listingId}`, {
    method: 'GET',
  });
};

export interface SavedListingStatusResponse {
  listingId: string;
  isSaved: boolean;
  saves: number;
}

export interface SavedListingsResponse {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  results: Listing[];
}

export const fetchSavedListingIds = async (): Promise<string[]> => {
  const payload = await apiJsonRequest<{ listingIds: string[] }>('/listings/saved/ids', {
    method: 'GET',
    auth: true,
  });

  return payload.listingIds || [];
};

export const fetchSavedListings = async (page = 1, pageSize = 24): Promise<SavedListingsResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(pageSize));

  return apiJsonRequest<SavedListingsResponse>(`/listings/saved?${params.toString()}`, {
    method: 'GET',
    auth: true,
  });
};

export const fetchSavedListingStatus = async (listingId: string): Promise<SavedListingStatusResponse> => {
  return apiJsonRequest<SavedListingStatusResponse>(`/listings/${listingId}/saved-status`, {
    method: 'GET',
    auth: true,
  });
};

export const saveListing = async (listingId: string): Promise<SavedListingStatusResponse> => {
  return apiJsonRequest<SavedListingStatusResponse>(`/listings/${listingId}/save`, {
    method: 'POST',
    auth: true,
  });
};

export const unsaveListing = async (listingId: string): Promise<SavedListingStatusResponse> => {
  return apiJsonRequest<SavedListingStatusResponse>(`/listings/${listingId}/save`, {
    method: 'DELETE',
    auth: true,
  });
};

export const fetchEditableListing = async (
  listingId: string,
  ownerUserId: string
): Promise<EditableListingData> => {
  void ownerUserId;
  return apiJsonRequest<EditableListingData>(`/listings/me/editable/${listingId}`, {
    method: 'GET',
    auth: true,
  });
};

export const updateUserListing = async (
  payload: UpdateListingPayload,
  ownerUserId: string
): Promise<void> => {
  void ownerUserId;
  const encodedImages = payload.images?.length
    ? await Promise.all(payload.images.map((image) => optimizeImageForUpload(image)))
    : [];

  await apiJsonRequest<{ ok: boolean }>(`/listings/me/${payload.listingId}`, {
    method: 'PATCH',
    auth: true,
    body: {
      ...payload,
      images: encodedImages,
    },
  });
};

export const deleteUserListing = async (listingId: string, ownerUserId: string): Promise<void> => {
  void ownerUserId;
  await apiJsonRequest<{ ok: boolean }>(`/listings/me/${listingId}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const fetchSellerDerivedStats = async (
  ownerUserId: string
): Promise<{ activeListings: number; memberSince: string }> => {
  return apiJsonRequest<{ activeListings: number; memberSince: string }>(
    `/listings/seller/${ownerUserId}/stats`,
    { method: 'GET' }
  );
};

export const fetchActiveListingCategoryCounts = async (): Promise<Record<string, number>> => {
  return apiJsonRequest<Record<string, number>>('/listings/meta/category-counts', {
    method: 'GET',
  });
};

export const fetchTaxonomyRoots = async (): Promise<TaxonomyNode[]> => {
  return apiJsonRequest<TaxonomyNode[]>('/listings/taxonomy/roots', {
    method: 'GET',
  });
};

export const fetchTaxonomyChildren = async (nodeKey: string): Promise<TaxonomyNode[]> => {
  return apiJsonRequest<TaxonomyNode[]>(`/listings/taxonomy/children/${encodeURIComponent(nodeKey)}`, {
    method: 'GET',
  });
};

export const searchTaxonomy = async (query: string, limit = 15): Promise<TaxonomyNode[]> => {
  const encodedQuery = encodeURIComponent(query);
  return apiJsonRequest<TaxonomyNode[]>(`/listings/taxonomy/search?q=${encodedQuery}&limit=${limit}`, {
    method: 'GET',
  });
};

export const predictListingCategory = async (
  title: string,
  description: string,
  maxSuggestions = 4
): Promise<PredictedCategorySuggestion[]> => {
  const response = await apiJsonRequest<{ suggestions: PredictedCategorySuggestion[] }>(
    '/listings/predict-category',
    {
      method: 'POST',
      auth: true,
      body: {
        title,
        description,
        maxSuggestions,
      },
    }
  );

  return Array.isArray(response.suggestions) ? response.suggestions : [];
};

export const checkListingImageQuality = async (image: File): Promise<ImageQualityCheckResult> => {
  const encoded = await fileToBase64(image);
  return apiJsonRequest<ImageQualityCheckResult>('/listings/check-image-quality', {
    method: 'POST',
    auth: true,
    body: {
      image: encoded,
    },
  });
};

export interface ReserveInventoryResult {
  remainingQuantity: number;
  updatedStatus: 'active' | 'sold' | 'rented';
}

export const reserveListingInventory = async (
  listingId: string,
  mode: 'buy' | 'rent',
  quantity: number
): Promise<ReserveInventoryResult> => {
  return apiJsonRequest<ReserveInventoryResult>('/listings/reserve', {
    method: 'POST',
    auth: true,
    body: {
      listingId,
      mode,
      quantity,
    },
  });
};
