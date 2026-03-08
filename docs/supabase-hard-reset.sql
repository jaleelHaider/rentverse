-- HARD RESET: Supabase Auth + Listings + Storage metadata
-- This will delete existing listing/image/profile data and recreate schema for Supabase-only auth.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "listings_read_public_or_owner" ON public.listings;
DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;

DROP POLICY IF EXISTS "listing_images_public_read" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_insert_owner" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_update_owner" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_delete_owner" ON public.listing_images;

DROP POLICY IF EXISTS "storage_listing_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_listing_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_listing_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_listing_images_auth_delete" ON storage.objects;

-- Drop old tables/triggers completely
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TABLE IF EXISTS public.listing_images CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate tables with Supabase-auth user linkage
create table public.profiles (
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

create table public.listings (
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

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles(email);
create index listings_owner_user_id_idx on public.listings(owner_user_id);
create index listings_category_idx on public.listings(category);
create index listings_created_at_idx on public.listings(created_at desc);
create index listing_images_listing_id_idx on public.listing_images(listing_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

-- RLS
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

-- Storage object policies for listing-images bucket
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
