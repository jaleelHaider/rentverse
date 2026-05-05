const PREFERENCE_STORAGE_KEY = 'rentverse_preferences_v1';

export interface AppPreferences {
  notificationsEnabled: boolean;
  darkMode: boolean;
  language: 'en' | 'ne';
}

const defaults: AppPreferences = {
  notificationsEnabled: true,
  darkMode: false,
  language: 'en',
};

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export async function getPreferences(): Promise<AppPreferences> {
  try {
    if (isWeb) {
      const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      return { ...defaults, ...(JSON.parse(raw) as Partial<AppPreferences>) };
    }

    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(PREFERENCE_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    return { ...defaults, ...(JSON.parse(raw) as Partial<AppPreferences>) };
  } catch {
    return defaults;
  }
}

export async function setPreferences(next: AppPreferences): Promise<void> {
  const payload = JSON.stringify(next);

  if (isWeb) {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, payload);
    return;
  }

  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(PREFERENCE_STORAGE_KEY, payload);
}
