import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { getToken, clearToken } from '../utils/tokenStorage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use environment variables with EXPO_PUBLIC_ prefix (Expo convention)
let API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001/api';

console.log('[API CLIENT] Initial API_URL:', API_URL);
console.log('[API CLIENT] Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('[API CLIENT] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('[API CLIENT] Platform:', Platform.OS);

// When running on a physical device via Expo Go, "localhost" refers to the device.
// Replace localhost with the dev machine IP from Expo Constants.debuggerHost so the
// device can reach the backend running on the developer machine.
try {
  if (Platform.OS !== 'web' && API_URL.includes('localhost')) {
    // debuggerHost is usually like "192.168.x.y:19000"
    const debuggerHost = (Constants.manifest && (Constants.manifest as any).debuggerHost) || (Constants as any).manifest?.debuggerHost;
    if (debuggerHost) {
      const hostIp = debuggerHost.split(':')[0];
      API_URL = API_URL.replace('localhost', hostIp);
      console.log('Auto-detected dev host IP:', hostIp, '-> API_URL:', API_URL);
    }
  } else {
    console.log('Configured API_URL:', API_URL);
  }
} catch (err) {
  // If constants aren't available or parsing fails, fall back to the configured URL
  // and let the app use EXPO_PUBLIC_API_URL when provided.
  console.warn('Failed to auto-detect dev host for API_URL', err);
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased to 30s for more stable mobile networks
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status < 500, // Don't treat 4xx as errors initially
});

console.log('[API CLIENT] Axios baseURL:', apiClient.defaults.baseURL);

// Store for the request interceptor to use
let tokenPromise: Promise<string | null> | null = null;

/**
 * Request interceptor - Add auth token to all requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing');
      return config;
    } catch (error) {
      console.error('Error adding auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Log detailed error info
    if (!error.response) {
      console.error('Network Error - No Response:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
      });
    } else {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        data: error.response.data,
      });
    }

    // Handle 401 Unauthorized - token might be expired
    if (error.response?.status === 401) {
      try {
        // Clear token and let the app redirect to login
        await clearToken();
      } catch (err) {
        console.error('Error clearing token:', err);
      }
    }

    // Handle network errors with retry for POST requests
    if (!error.response && error.code === 'ERR_NETWORK') {
      // If it's a POST to auth/login and hasn't been retried, try again
      if (originalRequest.method === 'post' && originalRequest.url?.includes('/auth/login') && !originalRequest._retry) {
        originalRequest._retry = true;
        console.warn('Retrying failed POST request:', originalRequest.url);
        
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return apiClient(originalRequest);
      }
      
      console.error('Network error after retry:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Get the base API URL
 */
export const getApiUrl = (): string => API_URL;

/**
 * Default error handler
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Server responded with error status
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.statusText) {
      return error.response.statusText;
    }
  }

  // Generic error message
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

export default apiClient;
