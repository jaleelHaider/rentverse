# RentVerse Admin Dashboard Setup Guide

This guide sets up a separate admin panel on a hidden URL with role hierarchy, MFA, KYC review, AI override audit, and worker management.

## What is implemented

- Separate admin area at `/admin` with dedicated login and layout.
- Admin role hierarchy:
  - `superadmin`
  - `admin`
  - `manager`
  - `moderator`
  - `kyc_reviewer`
  - `finance`
  - `support`
- Worker creation by higher roles:
  - Superadmin can create admin and lower roles.
  - Admin can create lower-level roles only.
- Mandatory MFA flow for admin login.
- KYC review with:
  - Front/back image viewing
  - AI verdict + score visibility
  - AI re-check action
  - Manual override with audit logs
- Admin audit logs for all sensitive actions.

## Backend files added/updated

- `backend/sql/003_admin_schema.sql`
- `backend/src/routes/admin.js`
- `backend/src/middleware/admin.js`
- `backend/src/scripts/bootstrap-superadmin.js`
- `backend/src/server.js` (admin route + localhost subdomain CORS)
- `backend/package.json` (new dependencies and script)

## Frontend files added/updated

- `src/api/endpoints/admin.ts`
- `src/types/admin.types.ts`
- `src/components/admin/AdminProtectedRoute.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/pages/admin/Login.tsx`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/UserManagement.tsx`
- `src/pages/admin/DisputeResolution.tsx`
- `src/pages/admin/Workers.tsx`
- `src/pages/admin/Listings.tsx`
- `src/pages/admin/KycReview.tsx`
- `src/pages/admin/AuditLogs.tsx`
- `src/App.tsx` (separate admin route surface)

## Step 1: Run SQL migrations in Supabase

Run these in Supabase SQL editor in order:

1. `docs/supabase-setup.sql` (if this is a fresh project only)
2. `backend/sql/002_kyc_verification.sql`
3. `backend/sql/003_admin_schema.sql`

## Step 2: Install backend packages

From project root:

```powershell
cd backend
npm install
```

## Step 3: Configure backend environment

In `backend/.env` ensure these are set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `FRONTEND_URL`
- `BACKEND_URL`
- `AI_SERVICE_URL` (for KYC AI checks)
- `AI_SERVICE_TIMEOUT_MS`

Optional explicit superadmin bootstrap values:

- `SUPERADMIN_EMAIL=haiderjaleel349@gmail.com`
- `SUPERADMIN_PASSWORD=jaleelhaider`
- `SUPERADMIN_NAME=Haider Jaleel`

## Step 4: Seed superadmin account

From `backend` folder:

```powershell
npm run admin:bootstrap
```

This will:

- create/update Supabase auth user
- upsert profile row
- create/update `admin_users` row as `superadmin`

## Step 5: Run backend and frontend

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
npm run dev
```

## Step 6: Local subdomain usage

You can open admin at:

- `http://localhost:5173/admin`

If you want a true subdomain look locally, use:

- `http://admin.localhost:5173/admin`

CORS is already updated to allow localhost subdomains.

## Step 7: First admin login and MFA

1. Open `/admin/login`.
2. Login with:
   - Email: `haiderjaleel349@gmail.com`
   - Password: `jaleelhaider`
3. On first login, scan MFA QR in authenticator app.
4. Enter 6-digit code to complete MFA and enter dashboard.

## Operational controls included

- Dashboard metrics + recent KYC + recent audit.
- Users list with admin identification.
- Workers page for internal account creation and activation/suspension.
- Listings moderation (status changes and delete).
- Orders/disputes manual status control.
- KYC review with image view, AI re-check, manual approve/reject.
- Audit logs for traceability.

## Important notes

- Admin tables are blocked from direct client access with RLS `false` policies.
- Admin APIs are backend-only and require admin role middleware.
- Manual KYC overrides are written to audit logs with AI comparison metadata.
- Password changes are not exposed in admin dashboard flows.

## Recommended production follow-ups

- Move admin frontend to dedicated subdomain (for example `admin.rentverse.com`).
- Add IP allowlist or VPN restriction for admin routes.
- Add session revocation endpoint and short token refresh policy.
- Add CSV export with role-based restrictions.
- Add two-person approval flow for finance-sensitive actions.
