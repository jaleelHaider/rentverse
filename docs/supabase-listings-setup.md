# Supabase Setup for Listings + Images (with Firebase Auth)

This document matches the implementation in:
- `src/lib/supabase.ts`
- `src/api/endpoints/listing.ts`
- `src/pages/marketplace/CreateListing.tsx`

## 1) Add Environment Variables

Create `.env` in project root (or copy from `.env.example`) and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Restart Vite after adding env values.

## 2) Create Storage Bucket

In Supabase Dashboard:
1. Go to `Storage`.
2. Create bucket named `listing-images`.
3. Set bucket as `Public` (this code stores public URLs in DB).

## 3) Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_firebase_uid text not null,
  owner_email text,
  owner_name text,

  title text not null,
  description text not null,
  category text not null,
  sub_category text,
  condition text not null,
  listing_type text not null check (listing_type in ('rent', 'sell', 'both')),

  buy_price numeric,
  rent_daily_price numeric,
  rent_weekly_price numeric,
  rent_monthly_price numeric,
  security_deposit numeric,

  location_address text,
  location_city text,
  location_state text,
  location_country text,
  location_lat double precision,
  location_lng double precision,
  service_radius_km numeric,

  min_rental_days integer not null default 1,
  max_rental_days integer not null default 30,
  instant_booking boolean not null default true,
  max_renters integer not null default 1,

  specifications jsonb not null default '{}'::jsonb,
  features text[] not null default '{}',

  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_firebase_uid_idx on public.listings(owner_firebase_uid);
create index if not exists listings_category_idx on public.listings(category);
create index if not exists listings_created_at_idx on public.listings(created_at desc);
create index if not exists listing_images_listing_id_idx on public.listing_images(listing_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();
```

## 4) Enable RLS + Policies (Quick Working Setup)

Because auth is currently in Firebase (not Supabase Auth), requests are made as Supabase `anon` role.

Run this SQL so your app can create/read listings and image rows:

```sql
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- Quick setup policies (works now, but broad access)
create policy "listings_select_all"
on public.listings
for select
using (true);

create policy "listings_insert_all"
on public.listings
for insert
with check (true);

create policy "listings_update_all"
on public.listings
for update
using (true)
with check (true);

create policy "listings_delete_all"
on public.listings
for delete
using (true);

create policy "listing_images_select_all"
on public.listing_images
for select
using (true);

create policy "listing_images_insert_all"
on public.listing_images
for insert
with check (true);

create policy "listing_images_update_all"
on public.listing_images
for update
using (true)
with check (true);

create policy "listing_images_delete_all"
on public.listing_images
for delete
using (true);
```

## 5) Storage Policies (Quick Working Setup)

Run this SQL:

```sql
-- Public read on listing images bucket
create policy "listing_images_public_read"
on storage.objects
for select
using (bucket_id = 'listing-images');

-- Allow uploads/changes/deletes from anon clients
create policy "listing_images_public_insert"
on storage.objects
for insert
with check (bucket_id = 'listing-images');

create policy "listing_images_public_update"
on storage.objects
for update
using (bucket_id = 'listing-images')
with check (bucket_id = 'listing-images');

create policy "listing_images_public_delete"
on storage.objects
for delete
using (bucket_id = 'listing-images');
```

## 6) How Firebase User Is Attached

When publishing listing, app uses Firebase user from `useAuth()`:
- `currentUser.uid` -> `owner_firebase_uid`
- `currentUser.email` -> `owner_email`
- `currentUser.displayName` -> `owner_name`

This is already implemented in `CreateListing.tsx`.

## 7) Production-Safe Security (Recommended Next)

Quick setup above is fine for development but not secure for production.

For production:
1. Create Supabase Edge Function `/create-listing`.
2. Send Firebase ID token from frontend (`await currentUser.getIdToken()`).
3. In Edge Function, verify Firebase token with Firebase Admin SDK.
4. Use Supabase service-role key in function to write DB + storage.
5. Tighten RLS policies to block direct anon write access.

This gives trustworthy user identity and prevents spoofed `owner_firebase_uid`.

## 8) Verification Checklist

1. Open app and login via Firebase.
2. Go to `Create Listing`.
3. Fill all required fields and add images.
4. Publish listing.
5. Confirm row in `public.listings`.
6. Confirm rows in `public.listing_images`.
7. Confirm files inside `listing-images/<firebase_uid>/<listing_id>/...`.
