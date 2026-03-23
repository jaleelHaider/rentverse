import { apiJsonRequest, fileToBase64 } from '@/api/clients';
import type { Listing } from '@/types';
import type {
  CreateListingPayload,
  ListingOwner,
  UpdateListingPayload,
} from '@/types/listing.types';

interface CreateListingResult {
  listingId: string;
  imageCount: number;
}

export interface EditableListingData {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
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
    instantBooking: boolean;
    maxRenters: number;
    totalForRent: number;
    availableForRent: number;
    totalForSale: number;
    availableForSale: number;
  };
  specifications: Record<string, string>;
  sellerTerms: string[];
  features: string[];
  images: string[];
}

export const createListingWithImages = async (
  payload: CreateListingPayload,
  owner: ListingOwner
): Promise<CreateListingResult> => {
  void owner;
  const encodedImages = await Promise.all((payload.images || []).map((image) => fileToBase64(image)));

  return apiJsonRequest<CreateListingResult>('/listings/me', {
    method: 'POST',
    auth: true,
    body: {
      ...payload,
      images: encodedImages,
    },
  });
};

export const fetchMarketplaceListings = async (): Promise<Listing[]> => {
  return apiJsonRequest<Listing[]>('/listings/marketplace', {
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
    ? await Promise.all(payload.images.map((image) => fileToBase64(image)))
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