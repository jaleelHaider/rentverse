import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  getUserProfile,
  loginWithEmail,
  logoutUser,
  refreshCurrentUser,
  registerWithEmail,
  resendVerificationEmail,
  resetPassword as resetPasswordEmail,
  upsertUserProfile,
} from '../supabase/supabase';

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  profileCompleted: boolean;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
  }) => Promise<{ user: User; needsVerification: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  resendVerificationToEmail: (email: string) => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  isEmailVerified: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      setIsEmailVerified(Boolean(user?.email_confirmed_at));

      if (!user) {
        setUserData(null);
        setIsLoading(false);
        return;
      }

      void (async () => {
        try {
          const profile = await getUserProfile(user.id);

          if (profile) {
            setUserData({
              uid: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              city: profile.city,
              profileCompleted: profile.profileCompleted,
              createdAt: profile.createdAt,
              lastLogin: profile.lastLogin,
            });
          } else {
            const fallbackName = (user.user_metadata?.full_name as string | undefined) || '';
            const now = new Date().toISOString();

            await upsertUserProfile(user.id, {
              name: fallbackName,
              email: user.email || '',
              profileCompleted: false,
              lastLogin: now,
            });

            setUserData({
              uid: user.id,
              name: fallbackName,
              email: user.email || '',
              profileCompleted: false,
              createdAt: now,
              lastLogin: now,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoading(false);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await loginWithEmail(email, password);
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
  }) => {
    return registerWithEmail(userData.email, userData.password, userData.name, {
      phone: userData.phone,
      city: userData.city,
    });
  };

  const logout = async () => {
    await logoutUser();
  };

  const resetPassword = async (email: string) => {
    await resetPasswordEmail(email);
  };

  const resendVerification = async () => {
    if (!currentUser) throw new Error('No user logged in');
    if (!currentUser.email) throw new Error('No email found for current user');
    await resendVerificationEmail(currentUser.email);
  };

  const resendVerificationToEmail = async (email: string) => {
    await resendVerificationEmail(email);
  };

  const refreshAuthUser = async () => {
    const refreshedUser = await refreshCurrentUser();
    setCurrentUser(refreshedUser);
    const verified = Boolean(refreshedUser?.email_confirmed_at);
    setIsEmailVerified(verified);
    return verified;
  };

  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!currentUser) throw new Error('No user logged in');

    if (data.name) {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.name },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update auth profile');
      }
    }

    await upsertUserProfile(currentUser.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      profileCompleted: data.profileCompleted,
      lastLogin: data.lastLogin,
    });
    
    // Update local state
    setUserData(prev => prev ? { ...prev, ...data } : null);
  };

  const value = {
    currentUser,
    userData,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    resendVerification,
    resendVerificationToEmail,
    refreshAuthUser,
    updateUserProfile,
    isEmailVerified,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};  