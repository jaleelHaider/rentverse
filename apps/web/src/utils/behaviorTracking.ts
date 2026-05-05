/**
 * User Behavior Tracking Utility
 * Tracks browsing history, preferences, and transactions for AI-powered recommendations
 */

export interface ViewingHistoryItem {
  listingId: string;
  timestamp: number;
  category: string;
  price: number;
  city: string;
  timeSpent?: number;
}

export interface UserPreferences {
  preferredCategories: string[];
  userCity?: string;
  priceRange?: { min: number; max: number };
  preferredConditions?: string[];
  lastUpdated: number;
}

export interface TransactionBehavior {
  totalTransactions: number;
  categoriesInterested: string[];
  averageSpending: number;
  lastTransactionDate?: number;
  rentingPreference: 'rent' | 'buy' | 'both';
}

const VIEWING_HISTORY_KEY = 'rentverse_viewing_history';
const VIEWING_DETAILS_KEY = 'rentverse_viewing_details';
const USER_PREFERENCES_KEY = 'rentverse_user_preferences';
const TRANSACTION_BEHAVIOR_KEY = 'rentverse_transaction_behavior';

/**
 * Record a listing view
 */
export const recordListingView = (
  listingId: string,
  category: string,
  price: number,
  city: string
): void => {
  try {
    // Get existing viewing history
    const historyStr = localStorage.getItem(VIEWING_HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];

    // Add new view
    const newView: ViewingHistoryItem = {
      listingId,
      timestamp: Date.now(),
      category,
      price,
      city,
    };

    // Keep only last 100 views to avoid localStorage bloat
    const updatedHistory = [newView, ...history].slice(0, 100);

    // Store updated history
    localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(updatedHistory));

    // Update user preferences based on viewing
    updatePreferencesFromView(category, city, price);
  } catch (error) {
    console.warn('Failed to record listing view:', error);
  }
};

/**
 * Record time spent on a listing
 */
export const recordTimeSpent = (listingId: string, timeInSeconds: number): void => {
  try {
    const detailsStr = localStorage.getItem(VIEWING_DETAILS_KEY);
    const details = detailsStr ? JSON.parse(detailsStr) : {};

    details[listingId] = {
      timeSpent: timeInSeconds,
      lastViewed: Date.now(),
      viewCount: (details[listingId]?.viewCount || 0) + 1,
    };

    localStorage.setItem(VIEWING_DETAILS_KEY, JSON.stringify(details));
  } catch (error) {
    console.warn('Failed to record time spent:', error);
  }
};

/**
 * Get viewing history
 */
export const getViewingHistory = (): ViewingHistoryItem[] => {
  try {
    const historyStr = localStorage.getItem(VIEWING_HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.warn('Failed to get viewing history:', error);
    return [];
  }
};

/**
 * Update user preferences based on viewing behavior
 */
const updatePreferencesFromView = (category: string, city: string, price: number): void => {
  try {
    const prefsStr = localStorage.getItem(USER_PREFERENCES_KEY);
    const prefs: UserPreferences = prefsStr
      ? JSON.parse(prefsStr)
      : {
          preferredCategories: [],
          lastUpdated: Date.now(),
        };

    // Update preferred categories
    if (!prefs.preferredCategories.includes(category)) {
      prefs.preferredCategories.push(category);
    }
    prefs.preferredCategories = prefs.preferredCategories.slice(0, 5);

    // Update user city
    if (!prefs.userCity && city) {
      prefs.userCity = city;
    }

    // Update price range
    if (!prefs.priceRange) {
      prefs.priceRange = { min: price, max: price };
    } else {
      prefs.priceRange.min = Math.min(prefs.priceRange.min, price);
      prefs.priceRange.max = Math.max(prefs.priceRange.max, price);
    }

    prefs.lastUpdated = Date.now();

    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to update preferences:', error);
  }
};

/**
 * Get user preferences
 */
export const getUserPreferences = (): UserPreferences => {
  try {
    const prefsStr = localStorage.getItem(USER_PREFERENCES_KEY);
    return prefsStr
      ? JSON.parse(prefsStr)
      : {
          preferredCategories: [],
          lastUpdated: Date.now(),
        };
  } catch (error) {
    console.warn('Failed to get user preferences:', error);
    return {
      preferredCategories: [],
      lastUpdated: Date.now(),
    };
  }
};

/**
 * Record a transaction
 */
export const recordTransaction = (
  category: string,
  price: number,
  transactionType: 'rent' | 'buy'
): void => {
  try {
    const behaviorStr = localStorage.getItem(TRANSACTION_BEHAVIOR_KEY);
    const behavior: TransactionBehavior = behaviorStr
      ? JSON.parse(behaviorStr)
      : {
          totalTransactions: 0,
          categoriesInterested: [],
          averageSpending: 0,
          rentingPreference: transactionType,
        };

    behavior.totalTransactions += 1;
    behavior.lastTransactionDate = Date.now();

    // Update categories
    if (!behavior.categoriesInterested.includes(category)) {
      behavior.categoriesInterested.push(category);
    }

    // Update average spending
    behavior.averageSpending =
      (behavior.averageSpending * (behavior.totalTransactions - 1) + price) /
      behavior.totalTransactions;

    // Update preference if transaction type changes
    if (transactionType === 'rent') {
      behavior.rentingPreference = 'rent';
    } else if (transactionType === 'buy') {
      behavior.rentingPreference = behavior.rentingPreference === 'rent' ? 'both' : 'buy';
    }

    localStorage.setItem(TRANSACTION_BEHAVIOR_KEY, JSON.stringify(behavior));
  } catch (error) {
    console.warn('Failed to record transaction:', error);
  }
};

/**
 * Get transaction behavior
 */
export const getTransactionBehavior = (): TransactionBehavior | null => {
  try {
    const behaviorStr = localStorage.getItem(TRANSACTION_BEHAVIOR_KEY);
    return behaviorStr ? JSON.parse(behaviorStr) : null;
  } catch (error) {
    console.warn('Failed to get transaction behavior:', error);
    return null;
  }
};

/**
 * Clear all tracking data (for testing or user privacy)
 */
export const clearTrackingData = (): void => {
  try {
    localStorage.removeItem(VIEWING_HISTORY_KEY);
    localStorage.removeItem(VIEWING_DETAILS_KEY);
    localStorage.removeItem(USER_PREFERENCES_KEY);
    localStorage.removeItem(TRANSACTION_BEHAVIOR_KEY);
  } catch (error) {
    console.warn('Failed to clear tracking data:', error);
  }
};

/**
 * Get comprehensive user profile for recommendations
 */
export const getUserProfile = () => {
  return {
    viewingHistory: getViewingHistory(),
    preferences: getUserPreferences(),
    transactionBehavior: getTransactionBehavior(),
  };
};

