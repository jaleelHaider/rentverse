import { apiJsonRequest, clearAuthToken, getApiBaseUrl, getAuthToken, setAuthToken } from "@/api/clients";
import type { AuthUser } from "@rentverse/shared";

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	phone?: string;
	city?: string;
	verifiedSeller?: boolean;
	profileCompleted: boolean;
	createdAt: string;
	lastLogin: string;
	kycStatus?: "unverified" | "pending" | "verified" | "rejected";
	kycSubmittedAt?: string | null;
	kycVerifiedAt?: string | null;
	kycDocumentType?: string | null;
	kycDocumentFrontUrl?: string | null;
	kycDocumentBackUrl?: string | null;
	kycReviewMessage?: string | null;
}

export interface UpdateProfilePayload {
	name?: string;
	email?: string;
	phone?: string;
	city?: string;
	description?: string;
	avatarUrl?: string;
	profileCompleted?: boolean;
	lastLogin?: string;
	kycVerified?: boolean;
	kycVerifiedAt?: string;
	kycDocumentType?: string;
	kycDocumentLast4?: string;
}

export interface KycDocumentInput {
	name: string;
	type: string;
	contentBase64: string;
}

export interface SubmitKycVerificationPayload {
	documentType: string;
	documentNumber: string;
	frontImage: KycDocumentInput;
	backImage: KycDocumentInput;
}

export interface KycVerificationRecord {
	status: "unverified" | "pending" | "verified" | "rejected";
	verificationSource?: "ai_service" | "manual";
	documentType?: string | null;
	documentNumberLast4?: string | null;
	frontImageUrl?: string | null;
	backImageUrl?: string | null;
	submittedAt?: string | null;
	verifiedAt?: string | null;
	rejectedAt?: string | null;
	reviewMessage?: string | null;
	analysisVerdict?: "accept" | "warn" | "reject" | null;
	analysisScore?: number | null;
	analysisPayload?: Record<string, unknown> | null;
}

const AUTH_USER_KEY = "rv_auth_user";

export type SocialProvider = "google" | "facebook" | "apple";

const saveAuthUser = (user: AuthUser | null): void => {
	if (!user) {
		localStorage.removeItem(AUTH_USER_KEY);
		return;
	}

	localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

const sanitizeNextPath = (value: string | null): string => {
	if (!value) {
		return "/";
	}

	if (!value.startsWith("/") || value.startsWith("//")) {
		return "/";
	}

	return value;
};

export const readStoredAuthUser = (): AuthUser | null => {
	const raw = localStorage.getItem(AUTH_USER_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
};

export const startSocialAuth = async (provider: SocialProvider, nextPath = "/"): Promise<void> => {
	const safeNextPath = sanitizeNextPath(nextPath);
	const startUrl = `${getApiBaseUrl()}/auth/oauth/${provider}/start?next=${encodeURIComponent(safeNextPath)}`;
	window.location.assign(startUrl);
};

export const completeSocialAuth = async (): Promise<{ user: AuthUser; redirectTo: string }> => {
	const url = new URL(window.location.href);
	const nextPath = sanitizeNextPath(url.searchParams.get("next"));
	const errorMessage = url.searchParams.get("error");
	if (errorMessage) {
		throw new Error(errorMessage);
	}
	const token = url.searchParams.get("token");

	if (!token) {
		throw new Error("Social login token missing");
	}

	setAuthToken(token);

	const payload = await apiJsonRequest<{ user: AuthUser; profile: UserProfile | null }>("/auth/me", {
		method: "GET",
		auth: true,
	});

	saveAuthUser(payload.user);

	return {
		user: payload.user,
		redirectTo: nextPath,
	};
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
	const payload = await apiJsonRequest<{ profile: UserProfile | null; kyc: KycVerificationRecord | null }>("/auth/me", {
		method: "GET",
		auth: true,
	});

	if (!payload.profile || payload.profile.id !== userId) {
		return null;
	}

	return {
		...payload.profile,
		kycStatus: payload.kyc?.status || payload.profile.kycStatus || "unverified",
		kycSubmittedAt: payload.kyc?.submittedAt ?? payload.profile.kycSubmittedAt ?? null,
		kycVerifiedAt: payload.kyc?.verifiedAt ?? payload.profile.kycVerifiedAt ?? null,
		kycDocumentType: payload.kyc?.documentType ?? payload.profile.kycDocumentType ?? null,
		kycDocumentFrontUrl: payload.kyc?.frontImageUrl ?? payload.profile.kycDocumentFrontUrl ?? null,
		kycDocumentBackUrl: payload.kyc?.backImageUrl ?? payload.profile.kycDocumentBackUrl ?? null,
		kycReviewMessage: payload.kyc?.reviewMessage ?? payload.profile.kycReviewMessage ?? null,
	};
};

export const upsertUserProfile = async (
	userId: string,
	values: UpdateProfilePayload
): Promise<{ profile: UserProfile; user?: AuthUser }> => {
	return apiJsonRequest<{ profile: UserProfile; user?: AuthUser }>("/auth/profile", {
		method: "PATCH",
		auth: true,
		body: {
			userId,
			...values,
		},
	});
};

export const requestEmailChange = async (email: string): Promise<{ message: string }> => {
	return apiJsonRequest<{ message: string }>("/auth/profile/email", {
		method: "POST",
		auth: true,
		body: { email },
	});
};

export const submitKycVerification = async (
	payload: SubmitKycVerificationPayload
): Promise<{ kyc: KycVerificationRecord; profile: UserProfile; user?: AuthUser; message: string }> => {
	return apiJsonRequest<{ kyc: KycVerificationRecord; profile: UserProfile; user?: AuthUser; message: string }>("/auth/kyc/submit", {
		method: "POST",
		auth: true,
		body: payload,
	});
};

export const getKycVerification = async (): Promise<KycVerificationRecord | null> => {
	const payload = await apiJsonRequest<{ kyc: KycVerificationRecord | null }>("/auth/kyc", {
		method: "GET",
		auth: true,
	});

	return payload.kyc;
};

export const registerWithEmail = async (
	email: string,
	password: string,
	name: string,
	extra?: { phone?: string; city?: string }
): Promise<{ user: AuthUser; needsVerification: boolean }> => {
	const payload = await apiJsonRequest<{ user: AuthUser; needsVerification: boolean }>("/auth/register", {
		method: "POST",
		body: {
			email,
			password,
			name,
			phone: extra?.phone,
			city: extra?.city,
		},
	});

	return payload;
};

export const loginWithEmail = async (email: string, password: string): Promise<AuthUser> => {
	const payload = await apiJsonRequest<{ token: string; user: AuthUser }>("/auth/login", {
		method: "POST",
		body: { email, password },
	});

	setAuthToken(payload.token);
	saveAuthUser(payload.user);
	return payload.user;
};

export const logoutUser = async (): Promise<void> => {
	const token = getAuthToken();
	if (token) {
		await apiJsonRequest<{ ok: boolean }>("/auth/logout", {
			method: "POST",
			auth: true,
		}).catch(() => undefined);
	}

	clearAuthToken();
	saveAuthUser(null);
};

export const deleteOwnAccount = async (): Promise<void> => {
	await apiJsonRequest<{ ok: boolean }>("/auth/account", {
		method: "DELETE",
		auth: true,
	});

	clearAuthToken();
	saveAuthUser(null);
};

export const resetPassword = async (email: string): Promise<boolean> => {
	await apiJsonRequest<{ ok: boolean }>("/auth/reset-password", {
		method: "POST",
		body: {
			email,
		},
	});

	return true;
};

export const resendVerificationEmail = async (email: string): Promise<boolean> => {
	await apiJsonRequest<{ ok: boolean }>("/auth/resend-verification", {
		method: "POST",
		body: {
			email,
		},
	});

	return true;
};

export const refreshCurrentUser = async (): Promise<AuthUser | null> => {
	const token = getAuthToken();
	if (!token) {
		saveAuthUser(null);
		return null;
	}

	const payload = await apiJsonRequest<{ user: AuthUser; profile: UserProfile | null }>("/auth/me", {
		method: "GET",
		auth: true,
	});

	saveAuthUser(payload.user);
	return payload.user;
};

