# RentVerse Monorepo Setup Guide

This guide documents the monorepo structure conversion and next steps.

## What Was Created

### Folder Structure

```
rentverse/
├── apps/
│   ├── web/                    # Web app workspace
│   │   ├── src/                # (NEEDS MIGRATION) Copy src/ files here
│   │   ├── public/             # (NEEDS MIGRATION) Copy public/ files here
│   │   ├── index.html
│   │   ├── vite-env.d.ts
│   │   ├── package.json        # ✅ Created
│   │   ├── tsconfig.json       # ✅ Created
│   │   ├── vite.config.ts      # ✅ Created
│   │   ├── tailwind.config.js  # ✅ Created
│   │   ├── postcss.config.js   # ✅ Created
│   │   └── eslint.config.js    # ✅ Created
│   │
│   ├── mobile/                 # Mobile app workspace
│   │   ├── src/                # ✅ Created (with basic structure)
│   │   │   ├── app/            # Expo Router entry point
│   │   │   ├── components/     # Reusable components
│   │   │   ├── screens/        # Screen components
│   │   │   ├── hooks/          # Custom hooks (useAuth)
│   │   │   ├── api/            # API client
│   │   │   └── utils/          # Utilities
│   │   ├── assets/images/      # Images & icons
│   │   ├── package.json        # ✅ Created
│   │   ├── app.json            # ✅ Expo config
│   │   ├── tsconfig.json       # ✅ Created
│   │   └── README.md           # ✅ Created
│   │
│   └── backend/                # Backend workspace
│       ├── src/                # (NEEDS MIGRATION) Copy backend/src/ here
│       ├── package.json        # ✅ Created
│       └── README.md           # ✅ Created
│
├── packages/
│   └── shared/                 # Shared package
│       ├── src/
│       │   ├── types/          # ✅ All type files created
│       │   │   ├── auth.types.ts
│       │   │   ├── listing.types.ts
│       │   │   ├── order.types.ts
│       │   │   ├── chat.types.ts
│       │   │   ├── user.types.ts
│       │   │   ├── report.types.ts
│       │   │   ├── admin.types.ts
│       │   │   └── index.ts
│       │   ├── constants/      # (TODO) Add shared constants
│       │   ├── utils/          # (TODO) Add shared utilities
│       │   ├── api/            # API helpers
│       │   └── index.ts        # ✅ Root export
│       ├── package.json        # ✅ Created
│       └── tsconfig.json       # ✅ Created
│
├── backend/                    # Legacy backend folder (for migration)
│   ├── src/                    # Original backend code
│   ├── ai-service/             # AI service (move to apps/backend/ai-service)
│   ├── sql/                    # Database migrations
│   └── package.json            # Original backend package.json
│
├── docs/                       # Documentation (keep as is)
├── public/                     # (NEEDS MIGRATION) Move to apps/web/public
├── package.json               # ✅ Root monorepo config with workspaces
└── README.md                  # ✅ Updated with monorepo info
```

## Status Summary

### ✅ Completed
- Created root `package.json` with npm workspaces
- Created `apps/web/` with configs (tsconfig, vite, eslint, tailwind, postcss)
- Created `apps/mobile/` with Expo + React Native setup
  - Basic tab navigation structure
  - API client with auth token handling
  - useAuth hook example
  - Placeholder screens for all tabs
- Created `packages/shared/` with:
  - All 7 type files (auth, listing, order, chat, user, report, admin)
  - Type barrel exports
  - API client helpers
- Updated root README with monorepo documentation
- Created mobile app README with setup instructions

### 🔄 Next Steps (Priority Order)

#### 1. **Migrate Web App Files** (CRITICAL)
```bash
# Copy the current web app files
cp -r src/ apps/web/src/
cp -r public/ apps/web/public/
cp -r .env.example apps/web/.env.example
```

After copying, you'll need to:
- Update imports in web app to use `@rentverse/shared`:
  ```typescript
  // Before:
  import type { Listing, Order } from '../types/index.ts'
  
  // After:
  import type { Listing, Order } from '@rentverse/shared'
  ```
- Update API utilities to point to correct paths
- Test that `npm run dev:web` works

#### 2. **Migrate Backend Files**
```bash
# Copy backend src/
cp -r backend/src/ apps/backend/src/

# Copy AI service
cp -r backend/ai-service/ apps/backend/ai-service/

# Copy env example
cp backend/.env.example apps/backend/.env.example
```

After copying:
- Update import paths if any
- Verify database connection works
- Test `npm run dev:backend`

#### 3. **Update Root .env & .env.example**
Create `.env.local` in root with:
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_BACKEND_URL=http://localhost:4000
```

#### 4. **Install Dependencies for All Workspaces**
```bash
npm install
# This installs root + all workspace dependencies
```

#### 5. **Verify All Apps Start**
```bash
npm run dev:web      # Should start on port 3000
npm run dev:mobile   # Should start Expo
npm run dev:backend  # Should start on port 4000
```

### 📝 Development Workflow

#### Running Everything at Once
You can use multiple terminals:
```terminal-1
npm run dev:web      # Terminal 1

# Terminal 2
npm run dev:backend

# Terminal 3
npm run dev:mobile

# Terminal 4
npm run dev:ai       # If needed
```

#### Building for Production
```bash
npm run build:web    # Output: apps/web/dist/
npm run build:mobile # Expo build
npm run build:backend
```

### 🔗 Package Imports

Both `apps/web` and `apps/mobile` can import from `packages/shared`:

```typescript
// In apps/web or apps/mobile:
import type { Listing, MarketplaceOrder } from '@rentverse/shared';
import { API_BASE_URL } from '@rentverse/shared';
```

### 🗄️ Database

- Migrations are in `backend/sql/`
- Run them in Supabase SQL editor
- No changes needed to DB setup

### 🔐 Environment Variables

**Root level** (`.env.local` or `.env`):
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BACKEND_URL=http://localhost:4000
```

**apps/mobile** (`.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

**apps/backend** (`.env`):
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
# ... rest of backend env vars
```

### 🚀 Deployment

#### Web (Vercel)
1. Connect GitHub repo to Vercel
2. Set project root to `apps/web`
3. Set env variables in Vercel dashboard
4. Deploy on push to `main`

#### Mobile (Expo EAS)
From `apps/mobile/`:
```bash
npm run eas:build
npm run eas:submit
```

#### Backend (Railway, Render, Heroku)
1. Deploy `apps/backend/` folder
2. Set environment variables
3. Start command: `node src/server.js`

### 📚 Shared Package Structure

The `@rentverse/shared` package exports:

```typescript
// Main entry point (src/index.ts)
export * from './types/index.js';
export { API_BASE_URL } from './constants';

// Sub-exports for granular imports
export * from './types/auth.types.js';
export * from './types/listing.types.js';
export * from './types/order.types.js';
export * from './types/chat.types.js';
export * from './types/user.types.js';
export * from './types/report.types.js';
export * from './types/admin.types.js';
```

### 🐛 Troubleshooting

**"Cannot find module '@rentverse/shared'"**
- Ensure `npm install` was run in root
- Check `packages/shared/package.json` exists
- Verify `tsconfig.json` in apps has path mapping

**Web app imports are broken**
- Find & replace in `src/`:
  ```
  Find: from '@/types
  Replace: from '@rentverse/shared
  ```

**Backend .env vars not loading**
- Ensure `apps/backend/.env` exists
- Check `require('dotenv').config()` is called in server.js

## Migration Checklist

- [ ] Copy `src/` to `apps/web/src/`
- [ ] Copy `public/` to `apps/web/public/`
- [ ] Copy `backend/src/` to `apps/backend/src/`
- [ ] Copy `backend/ai-service/` to `apps/backend/ai-service/`
- [ ] Update web app imports to use `@rentverse/shared`
- [ ] Create `apps/web/.env.local` with Supabase creds
- [ ] Create `apps/backend/.env` with Supabase creds
- [ ] Run `npm install` in root
- [ ] Test `npm run dev:web`
- [ ] Test `npm run dev:backend`
- [ ] Test `npm run dev:mobile`
- [ ] Verify database migrations are in place
- [ ] Update backend `FRONTEND_URL` env to include Expo dev URL

---

**Created:** April 2026  
**Monorepo:** npm workspaces  
**Structure:** apps/ + packages/ layout
