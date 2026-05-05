import { apiJsonRequest } from '@/api/clients';
import type {
  ReportSubmissionResponse,
  SubmitListingReportInput,
  SubmitUserReportInput,
} from '@rentverse/shared';

export const submitListingReport = (input: SubmitListingReportInput) =>
  apiJsonRequest<ReportSubmissionResponse>('/reports/listing', {
    method: 'POST',
    auth: true,
    body: input,
  });

export const submitUserReport = (input: SubmitUserReportInput) =>
  apiJsonRequest<ReportSubmissionResponse>('/reports/user', {
    method: 'POST',
    auth: true,
    body: input,
  });

