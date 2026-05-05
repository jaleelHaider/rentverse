import { getApiBaseUrl } from '@/api/clients';
import type {
  AdminAccount,
  AdminUserHistoryResponse,
  AdminVerifiedSellerDetailResponse,
  AdminVerifiedSellerProfile,
  AdminVerifiedSellerStats,
  AdminFraudActivity,
  AdminFraudListResponse,
  AdminReportedListingBlock,
  AdminReportedListingDetailResponse,
  AdminReportedUserBlock,
  AdminReportedUserDetailResponse,
  MarketplaceDisputePriority,
  MarketplaceDisputeVerdict,
  MarketplaceOrderDispute,
  MarketplaceOrderDisputeDetailResponse,
  MarketplaceOrderDisputeMessage,
  MarketplaceOrderDisputeStatus,
  MarketplaceOrderStatus,
} from '@rentverse/shared';

const ADMIN_TOKEN_KEY = 'rv_admin_access_token';

const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token);
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

const adminRequest = async <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    auth?: boolean;
  }
): Promise<T> => {
  const method = options?.method || 'GET';
  const auth = options?.auth ?? true;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Unauthorized');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}/admin${path}`, {
    method,
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
};

export interface AdminLoginStartResult {
  mfaRequired: boolean;
  mfaSetupRequired?: boolean;
  preAuthToken?: string;
  token?: string;
  admin: AdminAccount;
  mfa?: {
    qrDataUrl: string | null;
    otpauthUrl: string | null;
  };
}

export const adminLoginStart = (email: string, password: string) => {
  return adminRequest<AdminLoginStartResult>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  }).then((payload) => {
    if (payload.token) {
      setAdminToken(payload.token);
    }
    return payload;
  });
};

export const adminVerifyMfa = async (preAuthToken: string, otp: string) => {
  const payload = await adminRequest<{ token: string; admin: AdminAccount }>('/auth/mfa/verify', {
    method: 'POST',
    auth: false,
    body: { preAuthToken, otp },
  });

  setAdminToken(payload.token);
  return payload;
};

export const getAdminMe = () => adminRequest<{ admin: AdminAccount }>('/me');

export const getAdminDashboard = () =>
  adminRequest<{
    stats: {
      users: number;
      listings: number;
      orders: number;
      pendingKyc: number;
      openDisputes: number;
    };
    recentKyc: Array<Record<string, unknown>>;
    recentAudit: Array<Record<string, unknown>>;
  }>('/dashboard');

export const getAdminUsers = () => adminRequest<Array<Record<string, unknown>>>('/users');

export const getAdminUserHistory = (userId: string) =>
  adminRequest<AdminUserHistoryResponse>(`/users/${userId}/history`);

export const getAdminVerifiedSellerCandidates = (query?: { search?: string; sort?: string }) => {
  const params = new URLSearchParams({ status: 'candidate' });
  if (query?.search) params.set('search', query.search);
  if (query?.sort) params.set('sort', query.sort);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return adminRequest<Array<{ profile: AdminVerifiedSellerProfile; stats: AdminVerifiedSellerStats }>>(`/verified-sellers${suffix}`);
};

export const getAdminVerifiedSellers = (query?: { search?: string; sort?: string }) => {
  const params = new URLSearchParams({ status: 'verified' });
  if (query?.search) params.set('search', query.search);
  if (query?.sort) params.set('sort', query.sort);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return adminRequest<Array<{ profile: AdminVerifiedSellerProfile; stats: AdminVerifiedSellerStats }>>(`/verified-sellers${suffix}`);
};

export const getAdminVerifiedSellerDetail = (userId: string) =>
  adminRequest<AdminVerifiedSellerDetailResponse>(`/verified-sellers/${userId}`);

export const updateAdminVerifiedSellerStatus = (
  userId: string,
  input: { verified: boolean; note?: string }
) =>
  adminRequest<{ ok: boolean; profile: AdminVerifiedSellerProfile }>(`/verified-sellers/${userId}/status`, {
    method: 'POST',
    body: input,
  });

export const getAdminReportedListings = (status?: 'open' | 'investigating' | 'actioned' | 'dismissed') =>
  adminRequest<AdminReportedListingBlock[]>(`/reports/listings${status ? `?status=${status}` : ''}`);

export const getAdminReportedListingDetail = (listingId: string) =>
  adminRequest<AdminReportedListingDetailResponse>(`/reports/listings/${listingId}`);

export const applyAdminListingReportAction = (
  listingId: string,
  input: {
    actionType: 'pause_listing' | 'activate_listing' | 'delete_listing' | 'dismiss_reports' | 'mark_investigating';
    note?: string;
  }
) =>
  adminRequest<{ ok: boolean }>(`/reports/listings/${listingId}/actions`, {
    method: 'POST',
    body: input,
  });

export const getAdminReportedUsers = (status?: 'open' | 'investigating' | 'actioned' | 'dismissed') =>
  adminRequest<AdminReportedUserBlock[]>(`/reports/users${status ? `?status=${status}` : ''}`);

export const getAdminReportedUserDetail = (userId: string) =>
  adminRequest<AdminReportedUserDetailResponse>(`/reports/users/${userId}`);

export const applyAdminUserReportAction = (
  userId: string,
  input: {
    actionType:
      | 'warn_user'
      | 'restrict_listing_activity'
      | 'restrict_messaging'
      | 'restrict_order_activity'
      | 'restrict_all_activity'
      | 'suspend_user'
      | 'clear_user_restrictions'
      | 'dismiss_reports'
      | 'mark_investigating';
    note?: string;
  }
) =>
  adminRequest<{ ok: boolean }>(`/reports/users/${userId}/actions`, {
    method: 'POST',
    body: input,
  });

export const getAdminWorkers = () => adminRequest<Array<Record<string, unknown>>>('/workers');

export const createAdminWorker = (input: {
  email: string;
  password: string;
  fullName: string;
  role: string;
}) =>
  adminRequest<Record<string, unknown>>('/workers', {
    method: 'POST',
    body: input,
  });

export const updateAdminWorker = (userId: string, input: { role?: string; status?: string }) =>
  adminRequest<Record<string, unknown>>(`/workers/${userId}`, {
    method: 'PATCH',
    body: input,
  });

export const getAdminListings = () => adminRequest<Array<Record<string, unknown>>>('/listings');

export const updateAdminListing = (listingId: string, status: string) =>
  adminRequest<Record<string, unknown>>(`/listings/${listingId}`, {
    method: 'PATCH',
    body: { status },
  });

export const deleteAdminListing = (listingId: string) =>
  adminRequest<{ ok: boolean }>(`/listings/${listingId}`, {
    method: 'DELETE',
  });

export const getAdminOrders = () => adminRequest<Array<Record<string, unknown>>>('/orders');

export const updateAdminOrder = (orderId: string, input: { status: string; statusReason?: string }) =>
  adminRequest<Record<string, unknown>>(`/orders/${orderId}`, {
    method: 'PATCH',
    body: input,
  });

export const getAdminDisputes = (query?: {
  status?: Exclude<MarketplaceOrderDisputeStatus, 'none'>;
  priority?: MarketplaceDisputePriority;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.priority) params.set('priority', query.priority);
  if (query?.limit) params.set('limit', String(query.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return adminRequest<MarketplaceOrderDispute[]>(`/disputes${suffix}`);
};

export const getAdminDisputeDetail = (disputeId: string) =>
  adminRequest<MarketplaceOrderDisputeDetailResponse>(`/disputes/${disputeId}`);

export const assignAdminDispute = (disputeId: string, assignToUserId?: string | null) =>
  adminRequest<MarketplaceOrderDispute>(`/disputes/${disputeId}/assign`, {
    method: 'PATCH',
    body: { assignToUserId: assignToUserId === undefined ? undefined : assignToUserId },
  });

export const postAdminDisputeMessage = (
  disputeId: string,
  input: { body: string; isInternalNote?: boolean; attachments?: Array<Record<string, unknown>> }
) =>
  adminRequest<MarketplaceOrderDisputeMessage>(`/disputes/${disputeId}/messages`, {
    method: 'POST',
    body: input,
  });

export const issueAdminDisputeVerdict = (
  disputeId: string,
  input: {
    status: 'resolved' | 'closed' | 'awaiting_parties' | 'under_review';
    verdict?: MarketplaceDisputeVerdict;
    summary?: string;
    orderStatus?: MarketplaceOrderStatus;
    resolutionActions?: Record<string, unknown>;
  }
) =>
  adminRequest<MarketplaceOrderDispute>(`/disputes/${disputeId}/verdict`, {
    method: 'PATCH',
    body: input,
  });

export const getAdminKyc = (status?: string) =>
  adminRequest<Array<Record<string, unknown>>>(`/kyc${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const recheckAdminKycAi = (userId: string) =>
  adminRequest<Record<string, unknown>>(`/kyc/${userId}/recheck-ai`, {
    method: 'POST',
    body: {},
  });

export const reviewAdminKyc = (
  userId: string,
  input: { status: 'pending' | 'verified' | 'rejected'; reviewMessage?: string; overrideAi?: boolean; overrideReason?: string }
) =>
  adminRequest<{ ok: boolean }>(`/kyc/${userId}/review`, {
    method: 'PATCH',
    body: input,
  });

export const getAdminAudit = () => adminRequest<Array<Record<string, unknown>>>('/audit?limit=200');

export const getAdminContactMessages = (query?: { status?: string; search?: string; limit?: number }) => {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.search) params.set('search', query.search);
  if (query?.limit) params.set('limit', String(query.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return adminRequest<Array<Record<string, unknown>>>(`/contact-messages${suffix}`);
};

export const updateAdminContactMessageStatus = (
  messageId: string,
  input: { status: 'new' | 'in_progress' | 'resolved' | 'closed'; adminNotes?: string }
) =>
  adminRequest<Record<string, unknown>>(`/contact-messages/${messageId}`, {
    method: 'PATCH',
    body: input,
  });

// ============ AI FRAUD DETECTION ENDPOINTS ============

export const getAdminFraudDetections = (query?: {
  status?: 'unreviewed' | 'reviewed' | 'flagged' | 'resolved' | 'dismissed';
  entityType?: 'listing' | 'user' | 'order' | 'pattern';
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  page?: number;
  pageSize?: number;
}) => {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.entityType) params.set('entityType', query.entityType);
  if (query?.riskLevel) params.set('riskLevel', query.riskLevel);
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return adminRequest<AdminFraudListResponse>(`/fraud-detections${suffix}`);
};

export const getAdminFraudDetectionDetail = (detectionId: string) =>
  adminRequest<Record<string, unknown>>(`/fraud-detections/${detectionId}`);

export const reviewAdminFraudDetection = (
  detectionId: string,
  input: {
    status: 'unreviewed' | 'reviewed' | 'flagged' | 'resolved' | 'dismissed';
    adminNotes?: string;
    action?: 'suspend_user' | 'remove_listing' | 'cancel_order' | 'mark_suspicious' | 'none';
  }
) =>
  adminRequest<Record<string, unknown>>(`/fraud-detections/${detectionId}/review`, {
    method: 'POST',
    body: input,
  });

export const analyzeFraudListing = (listingId: string) =>
  adminRequest<Record<string, unknown>>(`/fraud-detections/analyze/listing/${listingId}`, {
    method: 'POST',
  });

export const analyzeFraudUser = (userId: string) =>
  adminRequest<Record<string, unknown>>(`/fraud-detections/analyze/user/${userId}`, {
    method: 'POST',
  });

