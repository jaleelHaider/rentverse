export type ReportTargetType = 'listing' | 'user';

export interface SubmitListingReportInput {
  listingId: string;
  reasonCode: string;
  description?: string;
}

export interface SubmitUserReportInput {
  userId: string;
  reasonCode: string;
  description?: string;
}

export interface ReportSubmissionResponse {
  id: string;
  listingId?: string;
  userId?: string;
  reasonCode: string;
  description: string | null;
  status: 'open' | 'investigating' | 'actioned' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportReasonSummary {
  reasonCode: string;
  count: number;
}

export interface AdminReportItem {
  id: string;
  reporterUserId: string;
  reporterName: string;
  reporterEmail: string;
  reasonCode: string;
  description: string | null;
  status: 'open' | 'investigating' | 'actioned' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByAdminUserId: string | null;
  adminNote: string | null;
}

export interface AdminModerationAction {
  id: string;
  actionType: string;
  actionNote: string | null;
  actionMeta: Record<string, unknown>;
  createdAt: string;
  createdByAdminUserId: string;
  createdByName: string;
}

export interface AdminReportedListingBlock {
  targetId: string;
  listing: {
    id: string;
    title: string;
    status: string;
    ownerUserId: string;
    ownerName: string;
    ownerEmail: string;
    category: string;
    listingType: string;
    createdAt: string;
    updatedAt: string;
    link: string;
  } | null;
  totalReports: number;
  openReports: number;
  investigatingReports: number;
  actionedReports: number;
  dismissedReports: number;
  uniqueReporterCount: number;
  latestReportAt: string;
  reasons: AdminReportReasonSummary[];
  latestComments: string[];
}

export interface AdminReportedUserBlock {
  targetId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    kycStatus: string;
    moderationStatus: string;
    moderationNote: string | null;
    moderatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    profileLink: string;
  } | null;
  totalReports: number;
  openReports: number;
  investigatingReports: number;
  actionedReports: number;
  dismissedReports: number;
  uniqueReporterCount: number;
  latestReportAt: string;
  reasons: AdminReportReasonSummary[];
  latestComments: string[];
}

export interface AdminReportedListingDetailResponse {
  targetId: string;
  listing: AdminReportedListingBlock['listing'];
  reports: AdminReportItem[];
  actions: AdminModerationAction[];
  stats: {
    totalReports: number;
    uniqueReporterCount: number;
    openReports: number;
    investigatingReports: number;
    actionedReports: number;
    dismissedReports: number;
  };
}

export interface AdminReportedUserDetailResponse {
  targetId: string;
  user: AdminReportedUserBlock['user'];
  reports: AdminReportItem[];
  actions: AdminModerationAction[];
  stats: {
    totalReports: number;
    uniqueReporterCount: number;
    openReports: number;
    investigatingReports: number;
    actionedReports: number;
    dismissedReports: number;
  };
}

