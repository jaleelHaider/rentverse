export type AdminRole =
  | 'superadmin'
  | 'admin'
  | 'manager'
  | 'moderator'
  | 'kyc_reviewer'
  | 'finance'
  | 'support';

export interface AdminAccount {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: AdminRole;
  status: 'active' | 'suspended';
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface AdminDashboardStats {
  users: number;
  listings: number;
  orders: number;
  pendingKyc: number;
  openDisputes: number;
}

export interface AdminHistoryPartySummary {
  id: string;
  name: string;
  email: string;
}

export interface AdminVerifiedSellerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  kycStatus: string;
  profileCompleted: boolean;
  moderationStatus: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  verifiedSeller: boolean;
  verifiedSellerAt: string | null;
  verifiedSellerNote: string | null;
}

export interface AdminVerifiedSellerStats {
  totalOrders: number;
  completedOrders: number;
  sellerSoldCount: number;
  sellerRentedCount: number;
  buyerPurchasedCount: number;
  buyerRentedCount: number;
  activeListings: number;
  totalListings: number;
  totalReviews: number;
  avgRating: number;
  positivePercentage: number;
  latestOrderAt: string | null;
  latestReviewAt: string | null;
  latestListingAt: string | null;
  latestActivityAt: string | null;
}

export interface AdminVerifiedSellerListing {
  id: string;
  title: string;
  status: string;
  listingType: string;
  createdAt: string;
  updatedAt: string;
  link: string;
}

export interface AdminVerifiedSellerOrder {
  id: string;
  role: 'buyer' | 'seller';
  status: string;
  mode: 'buy' | 'rent';
  listingId: string;
  listingTitle: string;
  listingLink: string | null;
  totalDue: number;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  counterparty: AdminHistoryPartySummary | null;
}

export interface AdminVerifiedSellerReview {
  id: string;
  orderId: string;
  listingId: string;
  reviewerId: string;
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

export interface AdminVerifiedSellerSummary {
  profile: AdminVerifiedSellerProfile;
  stats: AdminVerifiedSellerStats;
}

export interface AdminVerifiedSellerDetailResponse extends AdminVerifiedSellerSummary {
  listings: AdminVerifiedSellerListing[];
  orders: AdminVerifiedSellerOrder[];
  reviews: AdminVerifiedSellerReview[];
}

export interface AdminUserHistoryOrder {
  id: string;
  role: 'buyer' | 'seller';
  status: string;
  mode: 'buy' | 'rent';
  listingId: string;
  listingTitle: string;
  listingLink: string | null;
  totalDue: number;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  counterparty: AdminHistoryPartySummary | null;
}

export interface AdminUserHistoryListing {
  id: string;
  title: string;
  status: string;
  listingType: string;
  buyPrice: number | null;
  rentDailyPrice: number | null;
  rentWeeklyPrice: number | null;
  rentMonthlyPrice: number | null;
  createdAt: string;
  updatedAt: string;
  link: string;
}

export interface AdminUserHistoryProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  kycStatus: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface AdminUserHistoryResponse {
  profile: AdminUserHistoryProfile;
  listings: AdminUserHistoryListing[];
  orders: {
    all: AdminUserHistoryOrder[];
    completed: AdminUserHistoryOrder[];
    summary: {
      total: number;
      asBuyer: number;
      asSeller: number;
      completed: number;
      rejected: number;
      cancelled: number;
    };
  };
}

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudFlagType =
  | 'duplicate_listing'
  | 'suspicious_keywords'
  | 'price_anomaly_vs_seller'
  | 'extremely_low_price'
  | 'insufficient_media'
  | 'account_velocity_listings'
  | 'rapid_activity_new_account'
  | 'disposable_email'
  | 'multiple_ip_accounts'
  | 'unverified_phone'
  | 'high_dispute_rate'
  | 'high_risk_payment_method'
  | 'unusually_high_amount_buyer'
  | 'high_refund_rate';

export interface AdminFraudFlag {
  type: FraudFlagType;
  severity: FraudSeverity;
  confidence: number;
  title: string;
  explanation: string;
  why_suspicious: string;
  recommended_action: string;
  metadata: Record<string, unknown>;
}

export interface AdminFraudDetectionResult {
  entityType: 'listing' | 'user' | 'order' | 'pattern';
  entityId: string;
  riskScore: number;
  flags: AdminFraudFlag[];
  isSuspicious: boolean;
  summary: string;
}

export interface AdminFraudActivity {
  id: string;
  detectionId: string;
  detectedAt: string;
  entityType: 'listing' | 'user' | 'order' | 'pattern';
  entityId: string;
  entityTitle?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  riskScore: number;
  mainFlag: AdminFraudFlag;
  flagCount: number;
  summary: string;
  status: 'unreviewed' | 'reviewed' | 'flagged' | 'resolved' | 'dismissed';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  action?: 'suspend_user' | 'remove_listing' | 'cancel_order' | 'mark_suspicious' | 'none';
}

export interface AdminFraudStats {
  total_detections: number;
  critical_risk: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  unreviewed_count: number;
  resolved_count: number;
  users_flagged: number;
  listings_flagged: number;
  orders_flagged: number;
  top_fraud_types: Array<{ type: string; count: number }>;
}

export interface AdminFraudListResponse {
  activities: AdminFraudActivity[];
  stats: AdminFraudStats;
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserSuspicionMark {
  userId: string;
  isSuspicious: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
}


