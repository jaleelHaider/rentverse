import apiClient from './client';

export interface AuthProfileResponse {
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    verified_seller?: boolean;
    profile_completed?: boolean;
    created_at?: string;
    last_login?: string | null;
  };
  kyc?: {
    status?: string | null;
    verificationSource?: string | null;
  };
}

export interface ProfileSummaryResponse {
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
    ratingBreakdown: Record<string, number>;
  };
}

export interface ProfileReview {
  id: string;
  orderId: string;
  listingId: string;
  reviewerId: string;
  revieweeId: string;
  reviewTargetRole: string;
  transactionType: string;
  rating: number;
  title: string;
  comment: string;
  isPublic: boolean;
  createdAt: string;
  reviewerName: string;
  listingTitle: string;
}

export interface ProfileListingsResponse {
  listings: Array<{
    id: string;
    title: string;
    listingType: string;
    status: string;
    price: {
      buy?: number;
      rentDaily?: number;
      rentWeekly?: number;
      rentMonthly?: number;
    };
    imageUrl: string;
    location: {
      city: string;
      area: string;
    };
    createdAt: string;
  }>;
}

export const fetchCurrentAuthProfile = async () => {
  const response = await apiClient.get<AuthProfileResponse>('/auth/me');
  return response.data;
};

export const fetchProfileSummary = async (userId: string) => {
  const response = await apiClient.get<ProfileSummaryResponse>(`/profiles/${userId}/summary`);
  return response.data;
};

export const fetchProfileReviews = async (userId: string) => {
  const response = await apiClient.get<{ reviews: ProfileReview[] }>(`/profiles/${userId}/reviews`, {
    params: { limit: 10 },
  });
  return response.data.reviews || [];
};

export const fetchProfileListings = async (userId: string) => {
  const response = await apiClient.get<ProfileListingsResponse>(`/profiles/${userId}/listings`, {
    params: { status: 'active' },
  });
  return response.data.listings || [];
};

export const updateCurrentProfile = async (payload: {
  name?: string;
  phone?: string;
  city?: string;
  description?: string;
  avatarUrl?: string;
  profileCompleted?: boolean;
}) => {
  const response = await apiClient.patch('/auth/profile', payload);
  return response.data as AuthProfileResponse;
};

export const updateCurrentEmail = async (email: string) => {
  const response = await apiClient.post('/auth/profile/email', { email });
  return response.data as { message: string };
};

export const reportUser = async ({
  userId,
  reasonCode,
  description,
}: {
  userId: string;
  reasonCode: string;
  description?: string;
}) => {
  const response = await apiClient.post('/reports/user', {
    userId,
    reasonCode,
    description,
  });
  return response.data as { id: string; status: string };
};
