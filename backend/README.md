# RentVerse Backend

This backend now owns all Supabase connections.

## 1) Setup

1. Copy `.env.example` to `.env`.
2. Fill these values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL`

## 2) Install and Run

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` by default.

## 3) Frontend

Set frontend env:

```bash
VITE_BACKEND_URL=http://localhost:4000
```

Then run frontend normally.

## Notes

- Frontend no longer talks directly to Supabase.
- Frontend now talks to backend APIs only.
- Existing Supabase data is preserved.
