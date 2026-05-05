# Complete Migration: Firebase to Supabase (Auth + Listings + Storage)

This guide matches the current codebase after migration:

## 1) Install and Environment

Dependencies:

Environment variables in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Restart Vite after editing `.env`.

## 2) Supabase Auth Dashboard Settings

In Supabase Dashboard:
1. Go to `Authentication` -> `Providers` -> `Email` and enable it.
2. Keep `Confirm email` enabled (recommended).
3. Go to `Authentication` -> `URL Configuration` and add:
   - Site URL: your app URL (`http://localhost:5173` for dev)
   - Redirect URLs:
     - `http://localhost:5173/verify-email`
     - `http://localhost:5173/reset-password`

## 3) Create Core Tables

Run this SQL in Supabase SQL Editor.

Important:
If you see `ERROR: column "owner_user_id" does not exist`, your `listings` table already exists from old schema.
In that case, run the reset block below first, then run the full create script.

```sql
-- Reset old listing tables (deletes old listing data)
drop table if exists public.listing_images cascade;
drop table if exists public.listings cascade;
drop table if exists public.profiles cascade;
```

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  city text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
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
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived', 'pending', 'sold', 'rented')),
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

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists listings_owner_user_id_idx on public.listings(owner_user_id);
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();
```

## 4) Create Storage Bucket

1. Go to `Storage`.
2. Create bucket `listing-images`.
3. If you want direct public URLs, keep it public.

## 5) Enable RLS and Add Policies

```sql
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "listings_read_public_or_owner"
on public.listings
for select
using (status = 'active' or auth.uid() = owner_user_id);

create policy "listings_insert_own"
on public.listings
for insert
with check (auth.uid() = owner_user_id);

create policy "listings_update_own"
on public.listings
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "listings_delete_own"
on public.listings
for delete
using (auth.uid() = owner_user_id);

create policy "listing_images_public_read"
on public.listing_images
for select
using (true);

create policy "listing_images_insert_owner"
on public.listing_images
for insert
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = auth.uid()
  )
);

create policy "listing_images_update_owner"
on public.listing_images
for update
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = auth.uid()
  )
);

create policy "listing_images_delete_owner"
on public.listing_images
for delete
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = auth.uid()
  )
);

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  saved_by_user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (saved_by_user_id, listing_id)
);

create index if not exists saved_listings_saved_by_user_id_idx
  on public.saved_listings(saved_by_user_id, created_at desc);

create index if not exists saved_listings_listing_id_idx
  on public.saved_listings(listing_id);

alter table public.saved_listings enable row level security;

create policy "saved_listings_select_own"
on public.saved_listings
for select
using (auth.uid() = saved_by_user_id);

create policy "saved_listings_insert_own"
on public.saved_listings
for insert
with check (auth.uid() = saved_by_user_id);

create policy "saved_listings_delete_own"
on public.saved_listings
for delete
using (auth.uid() = saved_by_user_id);
```

Storage policies:

```sql
create policy "storage_listing_images_public_read"
on storage.objects
for select
using (bucket_id = 'listing-images');

create policy "storage_listing_images_auth_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'listing-images');

create policy "storage_listing_images_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'listing-images')
with check (bucket_id = 'listing-images');

create policy "storage_listing_images_auth_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'listing-images');
```

## 6) Migrate Old `owner_firebase_uid` Column (If Exists)

```sql
alter table public.listings add column if not exists owner_user_id uuid;

update public.listings
set owner_user_id = nullif(owner_firebase_uid, '')::uuid
where owner_user_id is null
  and owner_firebase_uid is not null;

create index if not exists listings_owner_user_id_idx on public.listings(owner_user_id);

```

## 7) App-Level Changes Done

1. `src/firebase/firebase.ts` was renamed and migrated to `src/supabase/supabase.ts`.
2. Auth Context now uses Supabase Auth session events.
3. Login/Register/Verify flows now use Supabase Auth.
4. Listing ownership now uses `owner_user_id` and `currentUser.id`.

## 8) Remove Firebase

Run:

```bash
npm uninstall firebase
```

Then remove leftover Firebase env keys/config from your project.

## 9) Verification Checklist

1. Register a user and verify email.
2. Login and check protected routes.
3. Create listing with images.
4. Confirm DB rows in `profiles`, `listings`, `listing_images`.
5. Confirm files in `listing-images/<user_id>/<listing_id>/...`.
6. Open `My Listings` and verify only your data appears.

## 10) Root Fix For `owner_user_id does not exist`

If you want a full clean reset (delete old listings and remove any old Firebase-era schema):

1. Run SQL file `docs/supabase-hard-reset.sql` in Supabase SQL Editor.
2. Go to Storage -> bucket `listing-images` and delete all old files.
3. If bucket is missing, create `listing-images` again.
4. Restart app and login with a new Supabase account.

This reset ensures your DB has `owner_user_id` and no old `owner_firebase_uid` dependency.
