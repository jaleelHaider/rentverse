export const APP_NAME = 'RentVerse';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_CONFIG = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language',
  ONBOARDED: 'onboarded',
};

// Navigation routes
export const ROUTES = {
  AUTH: {
    LOGIN: 'auth/login',
    SIGNUP: 'auth/signup',
    FORGOT_PASSWORD: 'auth/forgot-password',
  },
  MAIN: {
    HOME: 'home',
    SEARCH: 'search',
    BOOKINGS: 'bookings',
    MESSAGES: 'messages',
    PROFILE: 'profile',
  },
  LISTING: {
    DETAIL: 'listing/:id',
    CREATE: 'listing/create',
    EDIT: 'listing/:id/edit',
  },
};

// Category options
export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Appliances',
  'Sports',
  'Books',
  'Vehicles',
  'Other',
];

// Currencies
export const CURRENCIES = {
  PKR: '₨',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Default currency
export const DEFAULT_CURRENCY = 'PKR';

// Date formats
export const DATE_FORMATS = {
  FULL: 'dd MMMM yyyy',
  SHORT: 'dd/MM/yyyy',
  TIME: 'HH:mm:ss',
  DATETIME: 'dd/MM/yyyy HH:mm',
};

// Status options
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Page sizes
export const PAGINATION = {
  PAGE_SIZE: 20,
  INITIAL_LOAD: 10,
};
