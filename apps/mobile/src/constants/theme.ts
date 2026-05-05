// RentVerse Design System - Color Palette
// Based on brand guidelines from MOBILE_QUICK_REFERENCE.md

export const colors = {
  // Primary Colors
  primary: {
    blue: '#3b82f6',        // Used for CTAs, headers, active states
    darkBlue: '#1d4ed8',    // Used for hover, focus states, primary actions
  },

  // Secondary Colors
  secondary: {
    slate: '#64748b',       // Secondary text, disabled states
    darkSlate: '#334155',   // Primary text, dark backgrounds
    lightGray: '#f1f5f9',   // Backgrounds, borders
  },

  // Status Colors
  status: {
    success: '#10b981',     // Active listings, approvals, confirmed
    warning: '#f59e0b',     // Pending items, reviews needed
    error: '#ef4444',       // Rejections, errors, warnings
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    black: '#000000',
    darkBackground: '#0f172a',
    veryLightGray: '#f8fafc',
    lightBorder: '#e2e8f0',
    mediumGray: '#94a3b8',
    textMuted: '#cbd5e1',
  },

  // Semantic Colors
  text: {
    primary: '#0f172a',       // Main text color
    secondary: '#64748b',     // Secondary text
    muted: '#94a3b8',         // Disabled/muted text
    inverse: '#ffffff',       // Text on dark backgrounds
  },

  // Background Colors
  background: {
    primary: '#f1f5f9',       // Main app background
    surface: '#ffffff',       // Card/surface background
    overlay: 'rgba(15, 23, 42, 0.5)',  // Semi-transparent overlays
  },

  // Border Colors
  border: {
    light: '#e2e8f0',         // Light borders
    medium: '#cbd5e1',        // Medium borders
  },
};

// Typography Scale
export const typography = {
  fontFamily: {
    regular: 'System',        // Uses native fonts (SF Pro on iOS, Roboto on Android)
  },

  fontSize: {
    xs: 11,                   // Small labels
    sm: 12,                   // Secondary text
    base: 14,                 // Body text
    lg: 16,                   // Large body text
    xl: 18,                   // Headings
    '2xl': 20,                // Larger headings
    '3xl': 24,                // Section headings
    '4xl': 28,                // Page titles
    '5xl': 32,                // Hero text
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing Scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border Radius
export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
};

// Shadow (for elevation effects)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
