-- Non-destructive setup for profile analytics + transaction reviews.
-- Run after docs/supabase-setup.sql and docs/supabase-orders-setup.sql.

create extension if not exists pgcrypto;

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  review_target_role text not null check (review_target_role in ('seller', 'renter')),
  transaction_type text not null check (transaction_type in ('sold', 'rented')),
  rating smallint not null check (rating between 1 and 5),
  title text,
  comment text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_reviews_reviewer_reviewee_diff check (reviewer_id <> reviewee_id),
  constraint marketplace_reviews_unique_direction unique (order_id, reviewer_id, reviewee_id)
);

create index if not exists marketplace_reviews_reviewee_idx
  on public.marketplace_reviews (reviewee_id, created_at desc);
create index if not exists marketplace_reviews_reviewer_idx
  on public.marketplace_reviews (reviewer_id, created_at desc);
create index if not exists marketplace_reviews_rating_idx
  on public.marketplace_reviews (reviewee_id, rating);
create index if not exists marketplace_reviews_transaction_type_idx
  on public.marketplace_reviews (reviewee_id, transaction_type);

drop trigger if exists marketplace_reviews_set_updated_at on public.marketplace_reviews;
create trigger marketplace_reviews_set_updated_at
before update on public.marketplace_reviews
for each row
execute function public.set_updated_at();

alter table public.marketplace_reviews enable row level security;

drop policy if exists "marketplace_reviews_select_public_or_participant" on public.marketplace_reviews;
create policy "marketplace_reviews_select_public_or_participant"
on public.marketplace_reviews
for select
using (
  is_public = true
  or auth.uid() = reviewer_id
  or auth.uid() = reviewee_id
);

drop policy if exists "marketplace_reviews_insert_reviewer" on public.marketplace_reviews;
create policy "marketplace_reviews_insert_reviewer"
on public.marketplace_reviews
for insert
with check (auth.uid() = reviewer_id);

drop policy if exists "marketplace_reviews_update_reviewer" on public.marketplace_reviews;
create policy "marketplace_reviews_update_reviewer"
on public.marketplace_reviews
for update
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

drop policy if exists "marketplace_reviews_delete_reviewer" on public.marketplace_reviews;
create policy "marketplace_reviews_delete_reviewer"
on public.marketplace_reviews
for delete
using (auth.uid() = reviewer_id);
