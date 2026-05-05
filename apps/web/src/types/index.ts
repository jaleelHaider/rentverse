// User Types
export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatar?: string;
  city: string;
  verified: boolean;
  trustScore: number;
  memberSince: string;
  stats: {
    listings: number;
    rentals: number;
    sales: number;
    rating: number;
  };
}

export type UserRole = 'user' | 'verified_seller' | 'admin';

// Listing Types
export type ListingType = 'buy' | 'rent' | 'both';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface Listing {
  id: string;
  title: string;
  description: string;
  type: ListingType;
  category: string;
  subCategory: string;
  condition: ListingCondition;
  
  price: {
    buy?: number;
    rent?: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    securityDeposit?: number;
  };
  
  images: string[];
  location: {
    city: string;
    area: string;
    coordinates?: [number, number];
    address?: string;
  };
  
  specifications: Record<string, string>;
  features: string[];
  
  seller: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    totalReviews?: number;
    verified: boolean;
    trustScore: number;
    responseRate: number;
  };
  
  availability: {
    forRent: boolean;
    forSale: boolean;
    totalForRent: number;
    availableForRent: number;
    totalForSale: number;
    availableForSale: number;
    rentalCalendar?: Record<string, boolean>;
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
  status: 'active' | 'pending' | 'sold' | 'rented' | 'paused';
}

// Rental Types
export interface RentalBooking {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  renterId: string;
  ownerId: string;
  dates: {
    start: string;
    end: string;
    totalDays: number;
  };
  pricing: {
    dailyRate: number;
    totalRent: number;
    securityDeposit: number;
    platformFee: number;
    totalAmount: number;
  };
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'disputed';
  paymentStatus: 'pending' | 'held' | 'released' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  icon: string;
  subCategories: string[];
  count: number;
  popular: boolean;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  listingId?: string;
}
