import { apiJsonRequest } from '@/api/clients';

export interface UserProfileSummary {
  profile: {
    id: string;
    name: string;
    city: string;
    description: string;
    memberSince: string;
    kycVerified: boolean;
    verifiedSeller: boolean;
  };
  stats: {
    sellerSoldCount: number;
    sellerRentedCount: number;
    buyerPurchasedCount: number;
    buyerRentedCount: number;
    totalTransactions: number;
    activeListings: number;
    totalReviews: number;
    avgRating: number;
    positivePercentage: number;
    ratingBreakdown: Record<number, number>;
  };
}

export interface UserReview {
  id: string;
  orderId: string;
  listingId: string;
  reviewerId: string;
  revieweeId: string;
  reviewTargetRole: 'seller' | 'renter';
  transactionType: 'sold' | 'rented';
  rating: number;
  title: string;
  comment: string;
  isPublic: boolean;
  createdAt: string;
  reviewerName: string;
  listingTitle: string;
}

export interface UserReviewQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  rating?: 0 | 1 | 2 | 3 | 4 | 5;
  transactionType?: 'all' | 'sold' | 'rented';
  targetRole?: 'all' | 'seller' | 'renter';
}

export interface UserReviewListResponse {
  reviews: UserReview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProfileListingCard {
  id: string;
  title: string;
  listingType: 'rent' | 'sell' | 'both';
  status: string;
  price: {
    buy: number | null;
    rentDaily: number | null;
    rentWeekly: number | null;
    rentMonthly: number | null;
  };
  imageUrl: string;
  location: {
    city: string;
    area: string;
  };
  createdAt: string;
}

export const fetchUserProfileSummary = (userId: string): Promise<UserProfileSummary> => {
  return apiJsonRequest<UserProfileSummary>(`/profiles/${userId}/summary`, { method: 'GET' });
};

const toSearchParams = (input: UserReviewQuery): string => {
  const params = new URLSearchParams();
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  if (input.search) params.set('search', input.search);
  if (input.sort) params.set('sort', input.sort);
  if (typeof input.rating === 'number') params.set('rating', String(input.rating));
  if (input.transactionType) params.set('transactionType', input.transactionType);
  if (input.targetRole) params.set('targetRole', input.targetRole);
  return params.toString();
};

export const fetchUserProfileReviews = (
  userId: string,
  query: UserReviewQuery
): Promise<UserReviewListResponse> => {
  const searchParams = toSearchParams(query);
  const path = searchParams
    ? `/profiles/${userId}/reviews?${searchParams}`
    : `/profiles/${userId}/reviews`;

  return apiJsonRequest<UserReviewListResponse>(path, { method: 'GET' });
};

export const fetchUserProfileListings = (
  userId: string,
  status: 'active' | 'all' = 'active'
): Promise<{ listings: ProfileListingCard[] }> => {
  return apiJsonRequest<{ listings: ProfileListingCard[] }>(
    `/profiles/${userId}/listings?status=${status}`,
    { method: 'GET' }
  );
};

export const fetchEligibleReviewOrders = (
  revieweeId: string,
  listingId?: string
): Promise<{ eligibleOrderIds: string[] }> => {
  const params = new URLSearchParams({ revieweeId });
  if (listingId) {
    params.set('listingId', listingId);
  }

  return apiJsonRequest<{ eligibleOrderIds: string[] }>(
    `/profiles/reviews/eligible?${params.toString()}`,
    { method: 'GET', auth: true }
  );
};

export interface CreateReviewInput {
  orderId: string;
  revieweeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  isPublic?: boolean;
}

export const createMarketplaceReview = (input: CreateReviewInput): Promise<{ review: UserReview }> => {
  return apiJsonRequest<{ review: UserReview }>('/profiles/reviews', {
    method: 'POST',
    auth: true,
    body: input,
  });
};

