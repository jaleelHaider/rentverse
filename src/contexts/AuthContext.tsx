import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types/auth.types';
import {
  getUserProfile,
  loginWithEmail,
  logoutUser,
  readStoredAuthUser,
  refreshCurrentUser,
  registerWithEmail,
  resendVerificationEmail,
  resetPassword as resetPasswordEmail,
  upsertUserProfile,
} from '@/api/endpoints/auth';

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
  currentUser: AuthUser | null;
  userData: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
  }) => Promise<{ user: AuthUser; needsVerification: boolean }>;
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

// eslint-disable-next-line react-refresh/only-export-components
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const cachedUser = readStoredAuthUser();
        if (cachedUser) {
          setCurrentUser(cachedUser);
          setIsEmailVerified(Boolean(cachedUser.email_confirmed_at));
        }

        const user = await refreshCurrentUser();
        setCurrentUser(user);
        setIsEmailVerified(Boolean(user?.email_confirmed_at));

        if (!user) {
          setUserData(null);
          return;
        }

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
          return;
        }

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
      } catch (error) {
        console.error('Error fetching user data:', error);
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const user = await loginWithEmail(email, password);
    setCurrentUser(user);
    setIsEmailVerified(Boolean(user.email_confirmed_at));

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
    }
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
    setCurrentUser(null);
    setUserData(null);
    setIsEmailVerified(false);
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

    await upsertUserProfile(currentUser.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      profileCompleted: data.profileCompleted,
      lastLogin: data.lastLogin,
    });
    
    if (data.name && currentUser) {
      setCurrentUser({
        ...currentUser,
        user_metadata: {
          ...currentUser.user_metadata,
          full_name: data.name,
        },
      });
    }

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