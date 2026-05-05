# Monorepo Quick Reference

## Directory Tree

```
rentverse/
├── apps/
│   ├── web/                    ← Vite React app (port 3000)
│   │   ├── src/               (NEEDS: Copy from root src/)
│   │   ├── public/            (NEEDS: Copy from root public/)
│   │   ├── package.json       ✅
│   │   ├── vite.config.ts     ✅
│   │   ├── tsconfig.json      ✅
│   │   ├── tailwind.config.js ✅
│   │   ├── postcss.config.js  ✅
│   │   └── eslint.config.js   ✅
│   │
│   ├── mobile/                 ← Expo React Native app
│   │   ├── src/               ✅
│   │   │   ├── app/           ✅ Expo Router structure
│   │   │   ├── components/    ✅
│   │   │   ├── screens/       ✅
│   │   │   ├── hooks/         ✅ (useAuth example)
│   │   │   └── api/           ✅ (API client)
│   │   ├── assets/images/     ✅
│   │   ├── package.json       ✅
│   │   ├── app.json           ✅ (Expo config)
│   │   ├── tsconfig.json      ✅
│   │   └── README.md          ✅
│   │
│   └── backend/                ← Express API (port 4000)
│       ├── src/               (NEEDS: Copy from backend/src/)
│       ├── ai-service/        (NEEDS: Copy from backend/ai-service/)
│       ├── package.json       ✅
│       └── README.md          ✅
│
├── packages/
│   └── shared/                 ← Shared types & utilities
│       ├── src/
│       │   ├── types/         ✅ (All 7 type files)
│       │   ├── constants/     📋 (TODO: Add shared constants)
│       │   ├── utils/         📋 (TODO: Add shared utils)
│       │   ├── api/           ✅ (API helpers)
│       │   └── index.ts       ✅
│       ├── package.json       ✅
│       └── tsconfig.json      ✅
│
├── backend/                    ← Legacy (for migration)
│   ├── src/                   ← Move to apps/backend/src
│   ├── ai-service/            ← Move to apps/backend/ai-service
│   ├── sql/                   ← Keep (migrations)
│   └── package.json           ← Old (move to apps/backend)
│
├── docs/
│   ├── MONOREPO_SETUP.md      ✅ (This guide)
│   └── ... (existing docs)
│
└── package.json               ✅ Root workspaces config

```

## Key Files Created

### Root Workspace
- ✅ `package.json` - Configured with workspaces

### apps/web
- ✅ `package.json` - Web app dependencies
- ✅ `tsconfig.json` - Web app TS config
- ✅ `vite.config.ts` - Vite config with API proxy
- ✅ `tailwind.config.js` - Tailwind config
- ✅ `postcss.config.js` - PostCSS config
- ✅ `eslint.config.js` - ESLint config
- ✅ `index.html` - Entry HTML
- ✅ `vite-env.d.ts` - Vite environment types

### apps/mobile
- ✅ `package.json` - Mobile app dependencies with Expo, React Native
- ✅ `app.json` - Expo app configuration
- ✅ `tsconfig.json` - Mobile app TS config
- ✅ `README.md` - Mobile setup guide
- ✅ `src/app/_layout.tsx` - Root layout with gesture handler
- ✅ `src/app/(tabs)/_layout.tsx` - Tab navigation
- ✅ `src/app/(tabs)/home.tsx` - Home screen
- ✅ `src/app/(tabs)/search.tsx` - Search screen
- ✅ `src/app/(tabs)/chat.tsx` - Chat screen
- ✅ `src/app/(tabs)/dashboard.tsx` - Dashboard screen
- ✅ `src/app/(tabs)/profile.tsx` - Profile screen
- ✅ `src/app/auth/login.tsx` - Login screen
- ✅ `src/app/auth/register.tsx` - Register screen
- ✅ `src/api/client.ts` - Axios API client with auth interceptors
- ✅ `src/hooks/useAuth.ts` - Auth hook for login/logout

### apps/backend
- ✅ `package.json` - Backend dependencies
- ✅ `README.md` - Backend setup guide

### packages/shared
- ✅ `package.json` - Shared package config
- ✅ `tsconfig.json` - Shared TS config
- ✅ `src/index.ts` - Root exports
- ✅ `src/types/index.ts` - Type barrel export
- ✅ `src/types/auth.types.ts` - Auth types
- ✅ `src/types/listing.types.ts` - Listing types
- ✅ `src/types/order.types.ts` - Order/marketplace types
- ✅ `src/types/chat.types.ts` - Chat types
- ✅ `src/types/user.types.ts` - User profile types
- ✅ `src/types/report.types.ts` - Report types
- ✅ `src/types/admin.types.ts` - Admin types
- ✅ `src/api/index.ts` - API helpers

### Documentation
- ✅ `README.md` - Updated root README
- ✅ `docs/MONOREPO_SETUP.md` - Complete setup guide

## Next Steps (Priority)

1. **Copy web app files**
   ```bash
   cp -r src/ apps/web/src/
   cp -r public/ apps/web/public/
   ```

2. **Copy backend files**
   ```bash
   cp -r backend/src/ apps/backend/src/
   cp -r backend/ai-service/ apps/backend/ai-service/
   ```

3. **Install all dependencies**
   ```bash
   npm install
   ```

4. **Update imports in web app**
   - Change `from '@/types'` → `from '@rentverse/shared'`

5. **Test locally**
   ```bash
   npm run dev:web
   npm run dev:backend
   npm run dev:mobile
   ```

## Import Aliases

### Web App
```typescript
// ✅ After migration, all apps use @rentverse/shared
import type { Listing, Order } from '@rentverse/shared';

// Internal to apps/web only:
import { MyComponent } from '@/components/MyComponent';
import { useCustom } from '@/hooks/useCustom';
import { helper } from '@/utils/helper';
```

### Mobile App
```typescript
import type { Listing, Order } from '@rentverse/shared';

// Internal to apps/mobile only:
import { MyComponent } from '@/components/MyComponent';
import { useCustom } from '@/hooks/useCustom';
```

### Shared Package
```typescript
// Export everything from @rentverse/shared
export * from './types';
export { API_BASE_URL } from '...';
```

## Environment Variables Summary

| File | Key Variables |
|------|----------------|
| `.env.local` (root) | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL |
| `apps/mobile/.env` | EXPO_PUBLIC_API_URL |
| `apps/backend/.env` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_SERVICE_URL, JWT_SECRET |

## Workspace Commands

```bash
# Run a specific workspace
npm run dev --workspace=apps/web
npm run dev --workspace=apps/mobile
npm run dev --workspace=apps/backend

# Or use root scripts
npm run dev:web
npm run dev:mobile
npm run dev:backend

# List installed workspaces
npm ls -a --workspace
```

---

**Status:** Monorepo scaffolding complete ✅  
**Next:** Migrate source files to apps/  
**Reference:** See `docs/MONOREPO_SETUP.md` for detailed guide
