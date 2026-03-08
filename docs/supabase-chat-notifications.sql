-- RentVerse chat + notifications schema
-- Run after your base listings schema is created.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_text text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (buyer_id <> seller_id)
);

create unique index if not exists conversations_unique_user_pair_idx
  on public.conversations(
    least(buyer_id, seller_id),
    greatest(buyer_id, seller_id)
  );

create index if not exists conversations_buyer_id_idx on public.conversations(buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations(seller_id);
create index if not exists conversations_last_message_at_idx on public.conversations(last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_sender_receiver_different check (sender_id <> receiver_id)
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages(conversation_id, created_at asc);

create index if not exists messages_receiver_unread_idx
  on public.messages(receiver_id, created_at desc)
  where read_at is null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles: allow reading counterpart profile for participants in a conversation.
-- Keep your existing own-profile policy as well.
create policy "profiles_select_conversation_participant"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.conversations c
    where (
      (c.buyer_id = auth.uid() and c.seller_id = public.profiles.id)
      or (c.seller_id = auth.uid() and c.buyer_id = public.profiles.id)
    )
  )
);

-- Conversations: only buyer or seller can read/update their own thread.
create policy "conversations_select_participant"
on public.conversations
for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_insert_buyer_only"
on public.conversations
for insert
with check (auth.uid() = buyer_id);

create policy "conversations_update_participant"
on public.conversations
for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Messages: only participants can read/send/update read-state.
create policy "messages_select_participant"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

create policy "messages_insert_sender_participant"
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        (c.buyer_id = sender_id and c.seller_id = receiver_id)
        or (c.seller_id = sender_id and c.buyer_id = receiver_id)
      )
  )
);

create policy "messages_update_receiver_only"
on public.messages
for update
using (receiver_id = auth.uid())
with check (receiver_id = auth.uid());

-- Notifications: owner can read/update their notifications. Sender can insert.
create policy "notifications_select_owner"
on public.notifications
for select
using (user_id = auth.uid());

create policy "notifications_insert_authenticated"
on public.notifications
for insert
with check (auth.uid() is not null);

create policy "notifications_update_owner"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Storage object policies for chat attachments bucket
create policy "storage_chat_attachments_public_read"
on storage.objects
for select
using (bucket_id = 'chat-attachments');

create policy "storage_chat_attachments_auth_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-attachments');

create policy "storage_chat_attachments_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'chat-attachments')
with check (bucket_id = 'chat-attachments');

create policy "storage_chat_attachments_auth_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'chat-attachments');
