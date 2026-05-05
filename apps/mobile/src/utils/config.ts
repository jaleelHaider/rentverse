// Configuration for environment-specific settings

import Constants from 'expo-constants';
import { Platform } from 'react-native';

let baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
try {
  if (Platform.OS !== 'web' && baseURL.includes('localhost')) {
    const debuggerHost = (Constants.manifest && (Constants.manifest as any).debuggerHost) || (Constants as any).manifest?.debuggerHost;
    if (debuggerHost) {
      const hostIp = debuggerHost.split(':')[0];
      baseURL = baseURL.replace('localhost', hostIp);
    }
  }
} catch (err) {
  // ignore and keep configured baseURL
}

export const config = {
  api: {
    baseURL,
    timeout: 10000,
  },
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  app: {
    name: 'RentVerse',
    version: '1.0.0',
    scheme: 'rentverse',
  },
};
