import apiClient, { getErrorMessage } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  city?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignupResponse {
  user: AuthUser;
  needsVerification: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata?: Record<string, any>;
}

/**
 * Login with email and password
 */
export const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  try {
    console.log('[AUTH API] Attempting login for:', credentials.email);
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    console.log('[AUTH API] Login successful');
    return response.data;
  } catch (error) {
    console.error('[AUTH API] Login error:', error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Register a new user
 */
export const signupUser = async (data: SignupRequest): Promise<SignupResponse> => {
  try {
    const response = await apiClient.post<SignupResponse>('/auth/register', data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthUser> => {
  try {
    const response = await apiClient.get<{ user: AuthUser; profile?: any; kyc?: any }>('/auth/me');
    return response.data.user ? response.data.user : (response.data as unknown as AuthUser);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Logout the current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout', {});
  } catch (error) {
    console.error('Logout error:', error);
    // Still consider it successful even if API fails
  }
};

/**
 * Reset password with email
 */
export const resetPassword = async (email: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', { email });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Resend verification email
 */
export const resendVerification = async (email: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
