-- Non-destructive setup for marketplace order requests + approvals.
-- Run this after base listings/chat schema.

create extension if not exists pgcrypto;

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  order_mode text not null check (order_mode in ('buy', 'rent')),
  quantity integer not null check (quantity > 0),
  duration_unit text check (duration_unit in ('day', 'week', 'month')),
  duration_count integer,
  unit_price numeric not null default 0,
  item_amount numeric not null default 0,
  security_deposit numeric not null default 0,
  platform_fee numeric not null default 0,
  total_due numeric not null default 0,
  payment_method text not null check (payment_method in ('escrow_card', 'bank_transfer', 'wallet')),
  payment_confirmed boolean not null default false,
  payment_confirmed_at timestamptz,
  status text not null default 'pending_seller_approval'
    check (status in ('pending_seller_approval', 'approved', 'rejected', 'cancelled')),
  status_reason text,
  full_name text not null,
  phone text not null,
  city text not null,
  delivery_address text not null,
  special_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  constraint marketplace_orders_buyer_seller_diff check (buyer_id <> seller_id)
);

create index if not exists marketplace_orders_buyer_idx on public.marketplace_orders (buyer_id, created_at desc);
create index if not exists marketplace_orders_seller_idx on public.marketplace_orders (seller_id, created_at desc);
create index if not exists marketplace_orders_status_idx on public.marketplace_orders (status, created_at desc);

-- Keep updated_at in sync.
drop trigger if exists marketplace_orders_set_updated_at on public.marketplace_orders;
create trigger marketplace_orders_set_updated_at
before update on public.marketplace_orders
for each row
execute function public.set_updated_at();

alter table public.marketplace_orders enable row level security;

create policy "marketplace_orders_select_participant"
on public.marketplace_orders
for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "marketplace_orders_insert_buyer"
on public.marketplace_orders
for insert
with check (auth.uid() = buyer_id);

create policy "marketplace_orders_update_seller_or_buyer"
on public.marketplace_orders
for update
using (auth.uid() = seller_id or auth.uid() = buyer_id)
with check (auth.uid() = seller_id or auth.uid() = buyer_id);

create policy "marketplace_orders_delete_buyer"
on public.marketplace_orders
for delete
using (auth.uid() = buyer_id);
