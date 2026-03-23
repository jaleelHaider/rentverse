export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> & {
    full_name?: string;
  };
}
