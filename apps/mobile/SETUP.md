# Getting Started with RentVerse Mobile

This guide will help you set up and run the RentVerse mobile application using Expo SDK 50 and React Native.

## System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Expo CLI**: Latest version
- **iOS**: Xcode 14+ (for iOS development)
- **Android**: Android Studio with SDK 33+ (for Android development)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Verify TypeScript setup**:
   ```bash
   npm run typecheck
   ```

## Development

### Start Development Server
```bash
npm start
```

This will start the Expo development server. You'll see a QR code in your terminal.

### Run on Specific Platform

**iOS Simulator** (macOS only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

**Web Browser**:
```bash
npm run web
```

### Using Expo Go

1. Download the Expo Go app on your device from App Store or Play Store
2. Run `npm start`
3. Scan the QR code with your camera or Expo Go app
4. App will load on your device

## Project Structure

```
src/
├── app/                  # Expo Router routes and layouts
│   ├── _layout.tsx       # Root layout with providers
│   └── index.tsx         # Home screen
├── components/           # Reusable UI components
│   ├── Common.tsx        # Common container and button components
│   └── Feedback.tsx      # Loading, error, and empty state components
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   ├── useListings.ts    # Listing queries
│   └── useUser.ts        # User queries
├── constants/            # App constants and configuration
├── types/                # TypeScript type definitions
├── utils/                # Utility functions and helpers
│   ├── api.ts            # API client
│   ├── config.ts         # Environment configuration
│   ├── helpers.ts        # Helper functions
│   ├── queryClient.ts    # React Query setup
│   └── store.ts          # App state management
└── styles/               # Global styles and Tailwind CSS
```

## Technology Stack

- **Framework**: React Native 0.73.6
- **Expo SDK**: 50.x
- **State Management**: React Query (TanStack Query)
- **Styling**: NativeWind (Tailwind CSS)
- **Routing**: Expo Router
- **HTTP Client**: Axios
- **Authentication**: Expo Secure Store
- **Language**: TypeScript
- **Navigation**: React Navigation

## Environment Variables

Create a `.env` file in the root of the mobile app:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: Environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run web` | Run in web browser |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm run prebuild` | Clean prebuild for native development |

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

### Submit to Stores
```bash
eas submit
```

## Troubleshooting

### Clear Cache
```bash
npm start -- --clear
```

### Reset Module Cache
```bash
watchman watch-del-all
npm start -- --clear
```

### Remove Expo Cache
```bash
rm -rf .expo
npm start -- --clear
```

### Dependency Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Package Management Notes

- **Separate from Web App**: Mobile packages are kept separate from the web app to avoid compatibility issues
- **SDK 50 Compatibility**: All packages are compatible with Expo SDK 50 and React Native 0.73.6
- **No Shared Mobile Packages**: Mobile-specific packages are not shared with the web app unless zero risk of compatibility issues

## Next Steps

1. ✓ Basic setup is complete
2. Add authentication screens
3. Set up navigation structure  
4. Integrate Supabase
5. Implement marketplace features

## Support

For issues or questions:
- Check [Expo Documentation](https://docs.expo.dev/)
- Check [React Native Documentation](https://reactnative.dev/)
- Check [NativeWind Documentation](https://www.nativewind.dev/)

## License

Part of the RentVerse project
