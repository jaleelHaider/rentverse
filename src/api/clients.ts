const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"}/api`;
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

	const response = await fetch(`${API_BASE_URL}${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;

	if (!response.ok) {
		throw new Error(payload.message || "Request failed");
	}

	return payload as T;
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
