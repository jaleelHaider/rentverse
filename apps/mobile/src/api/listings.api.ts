import apiClient from './client';

// Types for create/edit listing
export interface CreateListingPayload {
  title: string;
  description: string;
  categoryNodeKey: string;
  categoryPath: string;
  categorySource: string;
  listingType: 'buy' | 'rent' | 'both';
  condition: string;
  price: {
    buy?: number;
    rent: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    securityDeposit?: number;
  };
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    lat?: number | null;
    lng?: number | null;
    radius?: number;
  };
  availability: {
    securityDeposit?: number;
    minRentalDays?: number;
    maxRentalDays?: number;
    totalForRent?: number;
    availableForRent?: number;
    totalForSale?: number;
    availableForSale?: number;
  };
  features: string[];
  specifications: Record<string, any>;
  images: Array<{
    uri: string;
    type: string;
    name: string;
  }>;
}

export interface UpdateListingPayload extends Partial<CreateListingPayload> {
  id: string;
}

export interface MyListingResponse {
  id: string;
  title: string;
  description: string;
  categoryPath: string;
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
  views: number;
  saves: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  orderType: 'buy' | 'rent';
  quantity?: number;
  rentalStartDate?: string;
  rentalEndDate?: string;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: string;
  respondedAt?: string;
}

// Create a new listing
export const createListing = async (payload: CreateListingPayload) => {
  const response = await apiClient.post('/listings/me', payload);
  return response.data as { id: string; listing: MyListingResponse };
};

// Update existing listing
export const updateListing = async (payload: UpdateListingPayload) => {
  const { id, ...data } = payload;
  const response = await apiClient.patch(`/listings/${id}`, data);
  return response.data as MyListingResponse;
};

// Delete listing
export const deleteListing = async (id: string) => {
  await apiClient.delete(`/listings/${id}`);
  return { success: true };
};

// Get user's listings
export const fetchMyListings = async () => {
  const response = await apiClient.get<MyListingResponse[]>('/listings/me/listings');
  return Array.isArray(response.data) ? response.data : [];
};

// Get single listing for editing
export const fetchListingForEdit = async (id: string) => {
  const response = await apiClient.get<MyListingResponse>(`/listings/me/editable/${id}`);
  return response.data;
};

// Get incoming booking requests for seller
export const fetchMyBookings = async () => {
  const response = await apiClient.get<BookingRequest[]>('/orders/me/incoming');
  return Array.isArray(response.data) ? response.data : [];
};

// Approve booking request
export const approveBooking = async (orderId: string) => {
  const response = await apiClient.post(`/orders/${orderId}/approve`, {});
  return response.data as BookingRequest;
};

// Reject booking request
export const rejectBooking = async (orderId: string, reason?: string) => {
  const response = await apiClient.post(`/orders/${orderId}/reject`, { reason });
  return response.data as BookingRequest;
};

// Image upload (usually multipart, but backend might handle via signed URLs)
export const uploadListingImage = async (imageBase64: string) => {
  const response = await apiClient.post<{ imageUrl: string }>('/listings/upload-image', {
    imageBase64,
  });
  return response.data.imageUrl;
};

// Predict category based on title and description
export const predictCategory = async (title: string, description: string) => {
  const response = await apiClient.post<{
    suggestions: Array<{
      nodeKey: string;
      fullPath: string;
      confidence: number;
      reason: string[];
    }>;
  }>('/listings/predict-category', {
    title,
    description,
    maxSuggestions: 4,
  });
  return response.data.suggestions;
};
