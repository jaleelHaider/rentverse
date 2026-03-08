# RentVerse

RentVerse is a technology-driven marketplace for Pakistan where users can buy, sell, and rent items with a structured rental flow, escrow-style payment handling, and AI-assisted safety and quality features.

Unlike traditional local marketplaces focused only on buying/selling, RentVerse introduces an end-to-end rental lifecycle with deposits, verification, and dispute support.

## Table of Contents

1. [Project Vision](#project-vision)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [Core Features](#core-features)
5. [Requirement Coverage](#requirement-coverage)
6. [AI Components](#ai-components)
7. [System Flow](#system-flow)
8. [Security Measures](#security-measures)
9. [Tech Stack](#tech-stack)
10. [Project Architecture](#project-architecture)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)
13. [Database and Supabase Setup](#database-and-supabase-setup)
14. [Available Scripts](#available-scripts)
15. [Deployment and CI/CD](#deployment-and-cicd)
16. [Current Scope and Roadmap](#current-scope-and-roadmap)
17. [Contributing](#contributing)
18. [License](#license)

## Project Vision

RentVerse aims to be a complete ecosystem for local commerce and temporary access to goods.

- Buy and sell items like a standard marketplace.
- Rent items with transparent pricing and deposit workflows.
- Improve trust with verification, auditability, and secure transaction states.
- Apply AI to improve listing quality, discovery, and fraud resistance.

## Problem Statement

Current online marketplaces usually lack rental-first workflows and transaction safety. Common pain points include:

- No structured rent booking process.
- Weak or non-existent deposit handling.
- No escrow-like custody flow to reduce fraud.
- Minimal AI support for listing quality and risk signals.
- Limited guided support for users.

RentVerse addresses this by combining rental process orchestration, secure payment state handling, and AI-assisted intelligence in one platform.

## Objectives

1. Build a marketplace supporting buy, sell, and rent listing types.
2. Integrate AI for categorization, image quality checks, and chatbot assistance.
3. Implement escrow-style payment simulation to reduce scam risk.
4. Deliver a scalable, user-friendly web and mobile-ready experience.
5. Increase trust via verification and handover confirmation flows.


## System Flow

1. User publishes a listing for rent or sale.
2. Renter selects dates and initiates booking.
3. System calculates payable amount and security deposit.
4. Escrow-like transaction state is created.
5. Handover is verified through OTP or QR confirmation.
6. Return is verified similarly on completion.
7. Deposit is released or refunded per completion state.
8. Admin module handles disputes using logs and verification records.

## Security Measures

1. Optional KYC for trust elevation on high-risk transactions.
2. Escrow simulation to reduce direct payment fraud.
3. OTP/QR handover verification to prevent false handover claims.
4. Admin oversight for suspicious transactions and disputes.
5. Reputation and rating signals for user trust decisions.
6. AI-assisted suspicious activity detection.

## Tech Stack

### Frontend

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- Tailwind CSS 3

### State and Data

- TanStack Query (React Query)
- Context API for auth/language/theme modules

### Backend Services

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security policies

### Tooling

- ESLint 9
- PostCSS + Autoprefixer
- GitHub Actions (CI)
- Vercel (production deployment)

## Project Architecture

High-level structure:

```text
src/
  api/              # API clients and endpoint modules
  components/       # Reusable UI and feature components
  contexts/         # Global React context providers
  hooks/            # Custom hooks
  pages/            # Route-level pages
  store/            # App state stores
  supabase/         # Supabase auth/profile service logic
  lib/              # Core client setup (e.g., Supabase client)
  types/            # Shared TypeScript domain types
  utils/            # Utilities and helpers
docs/               # Setup and deployment guides
```

Routing entry points:

- Public: `/`, `/browse`, `/listing/:id`, `/categories`, `/how-it-works`, `/about`, `/contact`
- Auth: `/login`, `/register`, `/verify-email`, `/forgot-password`
- Protected: `/dashboard`, `/my-listings`, `/my-bookings`, `/create-listing`

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- Supabase project (URL + anon key)

### Installation

```bash
git clone <your-repo-url>
cd rentverse
npm install
```

### Run Development Server

```bash
npm run dev
```

The Vite dev server is configured to run on port `3000`.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Important notes:

- The app will fail at startup if these variables are missing.
- After changing `.env`, restart the dev server.

## Database and Supabase Setup

Follow the complete migration/setup guide:

- `docs/supabase-listings-setup.md`

Optional hard reset script (use carefully):

- `docs/supabase-hard-reset.sql`

Minimum setup checklist:

1. Enable Supabase Email auth provider.
2. Configure auth redirect URLs for local and deployed environments.
3. Create `profiles`, `listings`, and `listing_images` tables.
4. Create `listing-images` storage bucket.
5. Enable RLS and add required table/storage policies.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Type-check and create production build |
| `npm run lint` | Run ESLint checks |
| `npm run preview` | Preview production build locally |

## Deployment and CI/CD

This project includes GitHub Actions + Vercel pipeline at:

- `.github/workflows/ci-cd-vercel.yml`

Pipeline behavior:

- Pull requests to `main`: install, lint, and build checks.
- Pushes to `main`: same checks, then Vercel production deployment.

Full step-by-step setup guide:

- `docs/github-actions-vercel-deploy.md`

Required GitHub repository variables/secrets:

- Repository variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Repository secret: `VERCEL_TOKEN`

## Current Scope and Roadmap

Current codebase status:

- Core web app with authentication, marketplace browsing, and listing creation is in place.
- Supabase-backed listing and image upload pipeline is implemented.
- Several API modules for rentals, payments, and AI are scaffolded and ready for backend integration.

Planned next milestones:

1. Complete rental booking, escrow, and refund transaction flows.
2. Implement AI microservices and connect `src/api/ai/*` modules.
3. Add negotiation, advanced trust controls (KYC, blocking workflows), and analytics dashboards.
4. Expand test automation and harden CI gates.

## Contributing

For academic/team collaboration, use this baseline workflow:

1. Create a branch from `main`.
2. Implement and test your changes.
3. Run `npm run lint` and `npm run build` locally.
4. Open a pull request with a clear description and screenshots where relevant.

## License

No license file is currently defined in this repository.

If this project will be open sourced, add a `LICENSE` file (for example, MIT, Apache-2.0, or GPL-3.0) and update this section accordingly.
