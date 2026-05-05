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
//# sourceMappingURL=listing.types.d.ts.map