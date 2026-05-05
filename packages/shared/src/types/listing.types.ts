export type ListingType = "buy" | "rent" | "both";

export interface ListingLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface ListingPrice {
  buy: number | string;
  rent: {
    daily: number | string;
    weekly: number | string;
    monthly: number | string;
  };
  securityDeposit: number | string;
}

export interface ListingAvailability {
  minRentalDays: number;
  maxRentalDays: number;
  securityDeposit: number;
  totalForRent: number;
  availableForRent: number;
  totalForSale: number;
  availableForSale: number;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  categoryNodeKey: string;
  categoryPath: string;
  categorySource: "ai" | "manual";
  categoryConfidence: number | null;
  condition: string;
  listingType: ListingType;
  location: ListingLocation;
  price: ListingPrice;
  specifications: Record<string, string>;
  features: string[];
  availability: ListingAvailability;
  images: File[];
}

export interface UpdateListingPayload extends Omit<CreateListingPayload, "images"> {
  listingId: string;
  images?: File[];
}

export interface ListingOwner {
  userId: string;
  email: string;
  name: string;
}

export interface ListingSeller {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  rating: number;
  totalReviews: number;
  responseRate: number;
  trustScore: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  categoryNodeKey: string;
  categoryPath: string;
  categorySource: "ai" | "manual";
  categoryConfidence: number | null;
  condition: string;
  type: ListingType;
  listingType?: ListingType; // Alternative naming
  location: ListingLocation & { area?: string };
  price: ListingPrice;
  seller: ListingSeller;
  images: string[];
  features: string[];
  specifications: Record<string, string>;
  availability: ListingAvailability & { rentalCalendar?: Record<string, boolean> };
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
}
