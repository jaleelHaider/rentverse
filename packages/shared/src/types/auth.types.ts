export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> & {
    full_name?: string;
    avatar_url?: string;
    description?: string;
    phone?: string;
    city?: string;
    kyc_verified?: boolean;
    kyc_verification_source?: string;
    kyc_verified_at?: string;
    kyc_document_type?: string;
    kyc_document_last4?: string;
    kyc_analysis_verdict?: string;
    kyc_analysis_score?: number;
  };
}
