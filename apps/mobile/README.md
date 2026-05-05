# RentVerse Mobile App

React Native + Expo SDK 50 mobile application for the RentVerse marketplace platform.

## Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)
- Expo Go app on physical device (for testing)

### Installation

```bash
npm install
```

### Development

**Start the development server:**
```bash
npm start
```

**Run on specific platform:**
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

**Using Expo Go:**
After running `npm start`, scan the QR code with Expo Go app on your phone.

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Stack

- **Framework:** React Native with Expo SDK 50
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **Routing:** Expo Router
- **State Management:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **Navigation:** React Navigation
- **Authentication:** Expo Secure Store
- **Language:** TypeScript

## Project Structure

```
src/
├── app/              # Expo Router screens and layouts
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── styles/           # Global styles and CSS
└── utils/            # Utility functions
```

## Key Files

- `app.json` - Expo configuration
- `babel.config.js` - Babel configuration with NativeWind
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `.env` - Environment variables (not committed)

## Development Notes

- Do NOT share packages with web app unnecessarily - React Native has different requirements
- SDK 50 uses React 18.2.0 (not React 19)
- NativeWind 2.0 provides Tailwind CSS support for React Native
- Environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app

## Next Steps

1. ✓ Basic setup complete
2. Add authentication screens
3. Add navigation structure
4. Connect to Supabase
5. Add main marketplace features
