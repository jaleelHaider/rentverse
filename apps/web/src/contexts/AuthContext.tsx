import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@rentverse/shared';
import {
  completeSocialAuth,
  deleteOwnAccount,
  getUserProfile,
  getKycVerification,
  loginWithEmail,
  logoutUser,
  readStoredAuthUser,
  refreshCurrentUser,
  registerWithEmail,
  resendVerificationEmail,
  resetPassword as resetPasswordEmail,
  submitKycVerification,
  startSocialAuth,
  type SocialProvider,
  type KycVerificationRecord,
  type SubmitKycVerificationPayload,
  type UpdateProfilePayload,
  upsertUserProfile,
} from '@/api/endpoints/auth';

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  description?: string;
  avatarUrl?: string;
  verifiedSeller: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycVerifiedAt?: string;
  kycSubmittedAt?: string;
  kycDocumentType?: string;
  kycDocumentFrontUrl?: string;
  kycDocumentBackUrl?: string;
  kycReviewMessage?: string;
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
  updateUserProfile: (data: UpdateProfilePayload) => Promise<void>;
  deleteAccount: () => Promise<void>;
  socialLogin: (provider: SocialProvider, nextPath?: string) => Promise<void>;
  completeSocialLogin: () => Promise<string>;
  reloadKycVerification: () => Promise<KycVerificationRecord | null>;
  submitKycVerification: (payload: SubmitKycVerificationPayload) => Promise<KycVerificationRecord>;
  isEmailVerified: boolean;
  isKycVerified: boolean;
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

  const toUserData = (profile: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    city?: string;
    verifiedSeller?: boolean;
    profileCompleted: boolean;
    createdAt: string;
    lastLogin: string;
    kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
    kycSubmittedAt?: string | null;
    kycVerifiedAt?: string | null;
    kycDocumentType?: string | null;
    kycDocumentFrontUrl?: string | null;
    kycDocumentBackUrl?: string | null;
    kycReviewMessage?: string | null;
  }, user: AuthUser | null): UserData => ({
    uid: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    description: (user?.user_metadata?.description as string | undefined) || undefined,
    avatarUrl: (user?.user_metadata?.avatar_url as string | undefined) || undefined,
    verifiedSeller: Boolean(profile.verifiedSeller),
    kycStatus: profile.kycStatus || 'unverified',
    kycVerifiedAt: profile.kycVerifiedAt || undefined,
    kycSubmittedAt: profile.kycSubmittedAt || undefined,
    kycDocumentType: profile.kycDocumentType || undefined,
    kycDocumentFrontUrl: profile.kycDocumentFrontUrl || undefined,
    kycDocumentBackUrl: profile.kycDocumentBackUrl || undefined,
    kycReviewMessage: profile.kycReviewMessage || undefined,
    profileCompleted: profile.profileCompleted,
    createdAt: profile.createdAt,
    lastLogin: profile.lastLogin,
  });

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
          setUserData(toUserData(profile, user));
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
          verifiedSeller: false,
          kycStatus: 'unverified',
          kycVerifiedAt: undefined,
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
      setUserData(toUserData(profile, user));
    }
  };

  const socialLogin = async (provider: SocialProvider, nextPath = '/') => {
    await startSocialAuth(provider, nextPath);
  };

  const completeSocialLogin = async () => {
    const { user, redirectTo } = await completeSocialAuth();
    setCurrentUser(user);
    setIsEmailVerified(Boolean(user.email_confirmed_at));

    const profile = await getUserProfile(user.id);
    if (profile) {
      setUserData(toUserData(profile, user));
    }

    return redirectTo;
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

  const reloadKycVerification = async () => {
    if (!currentUser) {
      return null;
    }

    const kyc = await getKycVerification();
    const profile = await getUserProfile(currentUser.id);

    if (profile) {
      setUserData(toUserData(profile, currentUser));
    }

    return kyc;
  };

  const submitKyc = async (payload: SubmitKycVerificationPayload) => {
    if (!currentUser) throw new Error('No user logged in');

    const response = await submitKycVerification(payload);

    if (response.user) {
      setCurrentUser(response.user);
    }

    setUserData((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        kycStatus: response.kyc.status,
        kycVerifiedAt: response.kyc.verifiedAt || undefined,
        kycSubmittedAt: response.kyc.submittedAt || undefined,
        kycDocumentType: response.kyc.documentType || undefined,
        kycDocumentFrontUrl: response.kyc.frontImageUrl || undefined,
        kycDocumentBackUrl: response.kyc.backImageUrl || undefined,
        kycReviewMessage: response.kyc.reviewMessage || undefined,
      };
    });

    return response.kyc;
  };

  const updateUserProfile = async (data: UpdateProfilePayload) => {
    if (!currentUser) throw new Error('No user logged in');

    const payload = await upsertUserProfile(currentUser.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      description: data.description,
      avatarUrl: data.avatarUrl,
      profileCompleted: data.profileCompleted,
      lastLogin: data.lastLogin,
    });

    if (payload.user) {
      setCurrentUser(payload.user);
      setIsEmailVerified(Boolean(payload.user.email_confirmed_at));
    } else if (
      (
        data.name ||
        data.email ||
        data.description !== undefined ||
        data.avatarUrl !== undefined ||
        data.kycVerified !== undefined ||
        data.kycVerifiedAt !== undefined ||
        data.kycDocumentType !== undefined ||
        data.kycDocumentLast4 !== undefined
      ) &&
      currentUser
    ) {
      setCurrentUser({
        ...currentUser,
        email: data.email ?? currentUser.email,
        user_metadata: {
          ...currentUser.user_metadata,
          ...(data.name ? { full_name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
          ...(data.kycVerified !== undefined ? { kyc_verified: data.kycVerified } : {}),
          ...(data.kycVerifiedAt !== undefined ? { kyc_verified_at: data.kycVerifiedAt } : {}),
          ...(data.kycDocumentType !== undefined ? { kyc_document_type: data.kycDocumentType } : {}),
          ...(data.kycDocumentLast4 !== undefined ? { kyc_document_last4: data.kycDocumentLast4 } : {}),
        },
      });
    }

    setUserData((prev) => {
      if (!prev) {
        return null;
      }

      return {
        ...prev,
        name: payload.profile.name,
        email: payload.profile.email,
        phone: payload.profile.phone,
        city: payload.profile.city,
        kycStatus: data.kycVerified !== undefined
          ? (data.kycVerified ? 'verified' : 'unverified')
          : prev.kycStatus,
        verifiedSeller: prev.verifiedSeller,
        kycVerifiedAt: data.kycVerifiedAt !== undefined ? data.kycVerifiedAt : prev.kycVerifiedAt,
        kycSubmittedAt: prev.kycSubmittedAt,
        kycDocumentType: prev.kycDocumentType,
        kycDocumentFrontUrl: prev.kycDocumentFrontUrl,
        kycDocumentBackUrl: prev.kycDocumentBackUrl,
        kycReviewMessage: prev.kycReviewMessage,
        profileCompleted: payload.profile.profileCompleted,
        lastLogin: payload.profile.lastLogin,
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      };
    });
  };

  const deleteAccount = async () => {
    await deleteOwnAccount();
    setCurrentUser(null);
    setUserData(null);
    setIsEmailVerified(false);
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
    reloadKycVerification,
    submitKycVerification: submitKyc,
    updateUserProfile,
    socialLogin,
    completeSocialLogin,
    deleteAccount,
    isEmailVerified,
    isKycVerified: userData?.kycStatus === 'verified',
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};  
