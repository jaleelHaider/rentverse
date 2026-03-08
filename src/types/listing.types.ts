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
  buy: string;
  rent: {
    daily: string;
    weekly: string;
    monthly: string;
  };
  securityDeposit: string;
}

export interface ListingAvailability {
  minRentalDays: number;
  maxRentalDays: number;
  instantBooking: boolean;
  maxRenters: number;
  securityDeposit: number;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  condition: string;
  listingType: ListingType;
  location: ListingLocation;
  price: ListingPrice;
  specifications: Record<string, string>;
  features: string[];
  availability: ListingAvailability;
  images: File[];
}

export interface ListingOwner {
  userId: string;
  email: string;
  name: string;
}
