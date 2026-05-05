import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'rv_access_token';
const USER_KEY = 'rv_current_user';

const isWeb = Platform.OS === 'web';

const getWebStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Store auth token securely on device
 */
export const setToken = async (token: string): Promise<void> => {
  try {
    if (isWeb) {
      getWebStorage()?.setItem(TOKEN_KEY, token);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
    throw error;
  }
};

/**
 * Retrieve auth token from secure storage
 */
export const getToken = async (): Promise<string | null> => {
  try {
    if (isWeb) {
      return getWebStorage()?.getItem(TOKEN_KEY) || null;
    }

    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token || null;
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Remove auth token from storage
 */
export const clearToken = async (): Promise<void> => {
  try {
    if (isWeb) {
      getWebStorage()?.removeItem(TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
    throw error;
  }
};

/**
 * Store user data in secure storage
 */
export const setUser = async (user: any): Promise<void> => {
  try {
    const serializedUser = JSON.stringify(user);

    if (isWeb) {
      getWebStorage()?.setItem(USER_KEY, serializedUser);
      return;
    }

    await SecureStore.setItemAsync(USER_KEY, serializedUser);
  } catch (error) {
    console.error('Failed to store user:', error);
    throw error;
  }
};

/**
 * Retrieve user data from secure storage
 */
export const getUser = async (): Promise<any | null> => {
  try {
    if (isWeb) {
      const userJson = getWebStorage()?.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    }

    const userJson = await SecureStore.getItemAsync(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Failed to retrieve user:', error);
    return null;
  }
};

/**
 * Clear all stored authentication data
 */
export const clearAllAuthData = async (): Promise<void> => {
  try {
    if (isWeb) {
      const storage = getWebStorage();
      storage?.removeItem(TOKEN_KEY);
      storage?.removeItem(USER_KEY);
      return;
    }

    await Promise.all([clearToken(), SecureStore.deleteItemAsync(USER_KEY).catch(() => {})]);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    throw error;
  }
};
