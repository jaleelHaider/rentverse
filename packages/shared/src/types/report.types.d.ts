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
//# sourceMappingURL=report.types.d.ts.map