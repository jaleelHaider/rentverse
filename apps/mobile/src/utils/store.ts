// App state management - simple context-based approach
// Can be extended with Context API or state management library if needed

export interface AppState {
  isInitialized: boolean;
  isDarkMode: boolean;
  locale: string;
}

export const defaultAppState: AppState = {
  isInitialized: false,
  isDarkMode: false,
  locale: 'en',
};

// Usage: Import defaultAppState in context or component level state management
// Example: const [appState, setAppState] = useState<AppState>(defaultAppState);
