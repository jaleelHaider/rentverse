export interface UserProfileHeader {
	id: string;
	name: string;
	city: string;
	memberSince: string;
}

export interface UserProfileStats {
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
}

export interface UserReviewRecord {
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
