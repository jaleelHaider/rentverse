import React, { createContext, useCallback, useEffect, useState } from 'react';
import { loginUser, signupUser, getCurrentUser, logoutUser, AuthUser, LoginRequest, SignupRequest } from '../api/auth.api';
import { getToken, setToken, clearToken, setUser, getUser, clearAllAuthData } from '../utils/tokenStorage';

export interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Auth actions
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user is already authenticated on app start
   */
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to get token from storage
      const token = await getToken();

      if (!token) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      // Try to get current user from storage or API
      const storedUser = await getUser();
      if (storedUser) {
        setCurrentUser(storedUser);
      }

      // Do not block app startup on backend verification.
      // Re-check in the background and clear auth if the token is invalid.
      void (async () => {
        try {
          const user = await getCurrentUser();
          setCurrentUser(user);
          await setUser(user);
        } catch (err) {
          await clearAllAuthData();
          setCurrentUser(null);
        }
      })();
    } catch (err) {
      console.error('Auth check error:', err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login user with email and password
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await loginUser(credentials);

      // Store token and user
      await setToken(response.token);
      await setUser(response.user);
      setCurrentUser(response.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new user
   */
  const signup = useCallback(async (data: SignupRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await signupUser(data);

      // For signup, we might not get a token immediately if email verification is required
      // Store user data
      await setUser(response.user);

      // If we have a token (immediate login), store it
      // Note: This depends on backend behavior - might require email verification
      if ('token' in response) {
        await setToken((response as any).token);
      }

      setCurrentUser(response.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call logout API
      await logoutUser();

      // Clear all stored data
      await clearAllAuthData();
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Clear data even if API call fails
      await clearAllAuthData();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check auth status on app start
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser && !!currentUser.id,
    error,
    login,
    signup,
    logout,
    checkAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
