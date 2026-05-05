const configuredBackendUrl = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

const resolveApiBaseCandidates = (): string[] => {
	if (configuredBackendUrl) {
		return [`${configuredBackendUrl}/api`, "/api"];
	}

	if (typeof window !== "undefined") {
		const hostname = window.location.hostname.toLowerCase();
		const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

		if (isLocalhost) {
			// Try the documented local backend port first so requests hit the API without extra env setup.
			return ["http://localhost:4001/api", "/api"];
		}

		return ["/api"];
	}

	return ["http://localhost:4001/api", "/api"];
};

const API_BASE_CANDIDATES = resolveApiBaseCandidates();
const API_BASE_URL = API_BASE_CANDIDATES[0] || "/api";
const AUTH_TOKEN_KEY = "rv_access_token";

export const getApiBaseUrl = (): string => API_BASE_URL;

export const getAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token: string): void => {
	localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
	localStorage.removeItem(AUTH_TOKEN_KEY);
};

export interface JsonRequestOptions {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	body?: unknown;
	auth?: boolean;
}

export const apiJsonRequest = async <T>(
	path: string,
	options: JsonRequestOptions = {}
): Promise<T> => {
	const { method = "GET", body, auth = false } = options;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (auth) {
		const token = getAuthToken();
		if (!token) {
			throw new Error("Unauthorized");
		}
		headers.Authorization = `Bearer ${token}`;
	}

	let lastError: unknown = null;

	for (let index = 0; index < API_BASE_CANDIDATES.length; index += 1) {
		const baseUrl = API_BASE_CANDIDATES[index];
		const hasNextCandidate = index < API_BASE_CANDIDATES.length - 1;
		try {
			const response = await fetch(`${baseUrl}${path}`, {
				method,
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined,
			});

			const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;

			if (!response.ok) {
				const errorMsg = payload.message || `Request failed with status ${response.status}`;
				console.error(`[API ${response.status}] ${method} ${baseUrl}${path}`, errorMsg);
				
				const shouldTryNextCandidate =
					hasNextCandidate &&
					(response.status === 404 || response.status >= 500);

				if (shouldTryNextCandidate) {
					lastError = new Error(errorMsg);
					continue;
				}

				throw new Error(errorMsg);
			}

			return payload as T;
		} catch (error) {
			lastError = error;

			if (error instanceof Error && /failed to fetch|networkerror|network error/i.test(error.message)) {
				continue;
			}

			throw error;
		}
	}

	if (lastError instanceof Error) {
		const candidates = API_BASE_CANDIDATES.join(", ");
		throw new Error(`Unable to reach backend API. Checked: ${candidates}. Original error: ${lastError.message}`);
	}

	throw new Error("Unable to reach backend API.");
};

export interface EncodedFile {
	name: string;
	type: string;
	contentBase64: string;
}

const stripDataUrlPrefix = (value: string): string => {
	const index = value.indexOf(",");
	if (index < 0) {
		return value;
	}
	return value.slice(index + 1);
};

export const fileToBase64 = (file: File): Promise<EncodedFile> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = () => {
			reject(new Error(`Failed to read file: ${file.name}`));
		};

		reader.onload = () => {
			const raw = typeof reader.result === "string" ? reader.result : "";
			resolve({
				name: file.name,
				type: file.type || "application/octet-stream",
				contentBase64: stripDataUrlPrefix(raw),
			});
		};

		reader.readAsDataURL(file);
	});
};

// Minimal backward-compatible client wrapper returning { data, error }
export const client = {
	get: async <T>(path: string, opts?: { auth?: boolean }): Promise<{ data?: T; error?: Error }> => {
		try {
			const data = await apiJsonRequest<T>(path, { method: 'GET', auth: !!opts?.auth })
			return { data }
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) }
		}
	},
	post: async <T>(path: string, body?: unknown, opts?: { auth?: boolean }): Promise<{ data?: T; error?: Error }> => {
		try {
			const data = await apiJsonRequest<T>(path, { method: 'POST', body, auth: !!opts?.auth })
			return { data }
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) }
		}
	},
	patch: async <T>(path: string, body?: unknown, opts?: { auth?: boolean }): Promise<{ data?: T; error?: Error }> => {
		try {
			const data = await apiJsonRequest<T>(path, { method: 'PATCH', body, auth: !!opts?.auth })
			return { data }
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) }
		}
	},
	delete: async <T>(path: string, opts?: { auth?: boolean }): Promise<{ data?: T; error?: Error }> => {
		try {
			const data = await apiJsonRequest<T>(path, { method: 'DELETE', auth: !!opts?.auth })
			return { data }
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) }
		}
	},
}

