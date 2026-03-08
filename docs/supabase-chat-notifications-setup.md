# Supabase Chat + Notifications Setup

This guide adds OLX-style listing-linked chat inbox functionality to RentVerse.

## 1) Run SQL Schema

Open Supabase SQL Editor and run:

- `docs/supabase-chat-notifications.sql`

This creates:

- `conversations` (one thread per listing + buyer + seller)
- `messages` (all chat messages)
- `notifications` (user notifications)
- indexes, trigger, and RLS policies

## 1.1) One Chat Per Person Pair (Important)

To keep a single chat thread per buyer-seller pair (even across multiple products), run:

```sql
drop index if exists conversations_unique_listing_buyer_seller_idx;
drop index if exists conversations_unique_buyer_seller_idx;

create unique index if not exists conversations_unique_user_pair_idx
  on public.conversations(
    least(buyer_id, seller_id),
    greatest(buyer_id, seller_id)
  );
```

If duplicate rows already exist for the same pair, keep the newest one and remove older rows before creating this index.

Important:
- This SQL also adds a `profiles` select policy for conversation participants.
- Without it, chats can still work, but counterpart names may appear as `User`.

## 2) Enable Realtime for Chat

In Supabase Dashboard:

1. Go to `Database` -> `Replication`.
2. Enable replication for these tables:
   - `public.messages`
   - `public.conversations`
   - `public.notifications`
3. Save changes.

The app subscribes to `messages` changes so inbox updates live.

## 3) Auth and URLs

Make sure these are already configured (from your existing setup):

- Email auth enabled
- `Site URL` set (local/dev/prod)
- Redirect URL includes your app login flow

## 4) Required Env Keys

In your `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Restart Vite after changing env vars.

## 5) Create Attachment Storage Bucket

In Supabase Dashboard:

1. Go to `Storage`.
2. Create bucket `chat-attachments`.
3. Keep it `Public` so links in chat are directly downloadable.

Run these storage policies in SQL editor:

```sql
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
```

## 6) Expected UX After Setup

- Clicking `Contact` from a listing creates/opens a chat for that listing.
- The chat opens in `/messages` with left conversation list and right active chat.
- Listing context is visible inside the chat thread.
- New messages appear in realtime.
- Receiver gets a row in `notifications` table.

## 7) Optional: Mark Notifications as Read

Current implementation writes notification rows when a message is sent.

If you want a notification panel page later, use this update query for read-state:

```sql
update public.notifications
set read_at = now()
where id = :notification_id
  and user_id = auth.uid();
```

## 8) Quick Validation Checklist

1. User A opens User B listing and clicks `Contact`.
2. Confirm one row exists in `conversations` for that listing pair.
3. Send message from A to B.
4. Confirm row in `messages` and `notifications` for B.
5. Open `/messages` with B and verify unread count decreases after opening the conversation.
