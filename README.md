# RentVerse - Monorepo

A modern, scalable marketplace platform for buying, selling, and renting items in Pakistan. Built with **React** (web), **React Native + Expo** (mobile), **Node.js + Express** (backend), and **Python FastAPI** (AI services).

This is a **monorepo** using npm/pnpm workspaces, with shared types across all platforms for maximum data consistency.

## 🚀 Quick Start

```bash
cd rentverse
npm install
npm run dev:web      # Web: http://localhost:3000
npm run dev:mobile   # Mobile: Expo
npm run dev:backend  # Backend: http://localhost:4000
```

## Project Structure

```
rentverse/
├── apps/
│   ├── web/                 # Vite + React + TypeScript web app
│   ├── mobile/              # Expo + React Native + TypeScript mobile app
│   └── backend/             # Express.js + Node.js API backend
├── packages/
│   └── shared/              # Shared types, constants, utilities
├── backend/                 # Legacy backend (contains ai-service)
├── docs/                    # Documentation & SQL migrations
└── package.json             # Root monorepo package.json
```

## Workspaces

This is an **npm workspaces** monorepo. All packages are linked and can reference each other.

### Apps

- **[apps/web](./apps/web)** - Web application (Vite, React, TailwindCSS, React Router)
- **[apps/mobile](./apps/mobile)** - Mobile application (Expo, React Native, NativeWind)
- **[apps/backend](./apps/backend)** - Backend API (Express, Supabase, Node.js)

### Packages

- **[packages/shared](./packages/shared)** - Shared TypeScript types, API utilities, constants

## Tech Stack

### Frontend (Web)
- **React 19** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS 3** - Styling
- **TanStack Query** - Server state management
- **React Router 7** - Routing
- **Axios** - HTTP client

### Frontend (Mobile)
- **React Native 0.76** - Mobile framework
- **Expo 52** - React Native framework & tools
- **Expo Router** - File-based routing
- **NativeWind 2** - Tailwind CSS on React Native
- **TanStack Query** - Server state management
- **Axios** - HTTP client

### Backend
- **Express 4** - HTTP server
- **Node.js** - Runtime
- **Supabase** - Database, Auth, Storage
- **Python FastAPI** - AI microservices (category prediction, document verification, image quality)
- **JWT** - Authentication

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+ (or pnpm 9+)
- Python 3.10+ (for AI service)

### Installation

```bash
# Install root and workspace dependencies
npm install
```

### Set Up Environment Variables

Create `.env.local` in root:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_BACKEND_URL=http://localhost:4000
```

Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Create `apps/backend/.env` (see [backend README](./apps/backend/README.md))

## Development Commands

### Web App
```bash
npm run dev:web
# Opens: http://localhost:3000
```

### Mobile App
```bash
npm run dev:mobile
# Press `i` (iOS), `a` (Android), or `w` (web)
```

### Backend API
```bash
npm run dev:backend
# API: http://localhost:4000
```

### AI Service
```bash
npm run dev:ai
# Service: http://localhost:8008
# Or manually from backend/ai-service/
```

## Shared Types & Utilities

Both web and mobile import from `@rentverse/shared`:

```typescript
import type {
  AuthUser,
  ListingType,
  MarketplaceOrder,
  ChatConversationSummary,
} from '@rentverse/shared';

import { API_BASE_URL } from '@rentverse/shared';
```

### What's Shared

- **Types**: Auth, Listing, Order, Chat, User, Admin, Report types
- **Constants**: API URLs, error codes
- **Utilities**: API client helpers, validation functions (coming soon)

## Data Architecture

**Single Backend Gateway** - All clients talk ONLY to the backend API:

```
┌─────────────┐       ┌──────────────┐
│   Web App   │       │  Mobile App  │
│   (React)   │       │ (React Native)
└──────┬──────┘       └──────┬───────┘
       │                      │
       └──────────┬───────────┘
                  │ HTTP/REST
          ┌───────▼────────┐
          │  Backend API   │
          │  (Express)     │
          └───────┬────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
    ┌──▼──┐  ┌───▼────┐  ┌──▼──┐
    │ DB  │  │ Storage│  │ AI  │
    │(PG) │  │(SBase) │  │     │
    └─────┘  └────────┘  └─────┘
```

**Benefits:**
- ✅ Single source of truth
- ✅ Data consistency across platforms
- ✅ Centralized security & validation
- ✅ Easier API maintenance
