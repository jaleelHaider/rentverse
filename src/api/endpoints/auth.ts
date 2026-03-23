import { apiJsonRequest, clearAuthToken, getAuthToken, setAuthToken } from "@/api/clients";
import type { AuthUser } from "@/types/auth.types";

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	phone?: string;
	city?: string;
	profileCompleted: boolean;
	createdAt: string;
	lastLogin: string;
}

const AUTH_USER_KEY = "rv_auth_user";

const saveAuthUser = (user: AuthUser | null): void => {
	if (!user) {
		localStorage.removeItem(AUTH_USER_KEY);
		return;
	}

	localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
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

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
	const payload = await apiJsonRequest<{ profile: UserProfile | null }>("/auth/me", {
		method: "GET",
		auth: true,
	});

	if (!payload.profile || payload.profile.id !== userId) {
		return null;
	}

	return payload.profile;
};

export const upsertUserProfile = async (
	userId: string,
	values: Partial<Omit<UserProfile, "id" | "createdAt">>
): Promise<void> => {
	await apiJsonRequest<{ profile: UserProfile }>("/auth/profile", {
		method: "PATCH",
		auth: true,
		body: {
			userId,
			...values,
		},
	});
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
