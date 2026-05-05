-- RentVerse AI Chatbot Schema
-- Comprehensive production-grade tables for RAG, knowledge management, and user behavior tracking
-- Run this after supabase-setup.sql and supabase-orders-setup.sql

-- ============================================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;
create extension if not exists vector;  -- For embeddings/pgvector


-- ============================================================================
-- 2. FAQ ENTRIES TABLE
-- Knowledge base for frequently asked questions
-- Covers: account, listings, orders, payments, disputes, platform features
-- ============================================================================
create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  
  -- Core content
  question text not null unique,
  answer text not null,
  
  -- Categorization & metadata
  category text not null check (category in (
    'account',
    'listings',
    'renting',
    'buying',
    'payments',
    'disputes',
    'returns',
    'shipping',
    'verification',
    'technical',
    'safety',
    'policies'
  )),
  sub_category text,  -- e.g., 'account' -> 'password_reset', 'profile_verification'
  
  -- Ranking & visibility
  priority integer not null default 5 check (priority between 1 and 10),  -- 1 = highest, 10 = lowest
  is_active boolean not null default true,
  view_count integer not null default 0,
  helpful_votes integer not null default 0,
  unhelpful_votes integer not null default 0,
  
  -- Content quality
  answer_length_chars integer generated always as (char_length(answer)) stored,
  has_images boolean not null default false,
  has_external_links boolean not null default false,
  
  -- Audit trail
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_updated_by text,  -- admin email
  
  -- SEO & searchability
  tags text[] default '{}',
  search_keywords text  -- space-separated keywords for full-text search
);

create index if not exists faq_category_idx on public.faq_entries(category);
create index if not exists faq_active_idx on public.faq_entries(is_active);
create index if not exists faq_priority_idx on public.faq_entries(priority);
create index if not exists faq_created_at_idx on public.faq_entries(created_at desc);
create index if not exists faq_search_keywords_idx on public.faq_entries using gin(to_tsvector('english', search_keywords));


-- ============================================================================
-- 3. POLICY ENTRIES TABLE
-- Store platform policies: return, refund, exchange, warranty, cancellation, etc.
-- ============================================================================
create table if not exists public.policy_entries (
  id uuid primary key default gen_random_uuid(),
  
  -- Core content
  title text not null unique,
  content text not null,  -- Full policy text (markdown or plain)
  
  -- Policy type categorization
  policy_type text not null check (policy_type in (
    'returns',
    'refunds',
    'cancellation',
    'warranty',
    'exchange',
    'dispute_resolution',
    'user_conduct',
    'data_privacy',
    'payment_terms',
    'shipping_liability',
    'damage_claims',
    'item_condition'
  )),
  
  -- Applicability
  applies_to text not null check (applies_to in ('buyer', 'seller', 'both')),
  listing_type text check (listing_type in ('rent', 'sell', 'both')),  -- Which listing type applies
  geography text default 'pakistan',  -- 'pakistan' or 'all'
  
  -- Validity & versioning
  version_number integer not null default 1,
  is_current_version boolean not null default true,
  effective_date date not null,
  end_date date,  -- null = still valid
  reason_for_update text,  -- why was this updated
  
  -- Ranking & visibility
  priority integer not null default 5 check (priority between 1 and 10),
  is_active boolean not null default true,
  
  -- Audit trail
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,  -- admin email
  updated_by text,  -- admin email
  
  -- Additional metadata
  related_policies text[],  -- IDs of related policy entries
  exception_notes text,  -- e.g., "Electronics excluded from return window"
  
  -- SEO & searchability
  search_keywords text  -- space-separated keywords for full-text search
);

create index if not exists policy_type_idx on public.policy_entries(policy_type);
create index if not exists policy_active_idx on public.policy_entries(is_active);
create index if not exists policy_current_version_idx on public.policy_entries(is_current_version);
create index if not exists policy_applies_to_idx on public.policy_entries(applies_to);
create index if not exists policy_listing_type_idx on public.policy_entries(listing_type);
create index if not exists policy_created_at_idx on public.policy_entries(created_at desc);
create index if not exists policy_search_keywords_idx on public.policy_entries using gin(to_tsvector('english', search_keywords));


-- ============================================================================
-- 4. SHIPPING INFO ENTRIES TABLE
-- Delivery times, costs, zones, special conditions
-- ============================================================================
create table if not exists public.shipping_info_entries (
  id uuid primary key default gen_random_uuid(),
  
  -- Core info
  title text not null unique,
  description text not null,
  
  -- Shipping context
  shipping_type text not null check (shipping_type in (
    'standard_delivery',
    'express_delivery',
    'pickup_only',
    'local_delivery',
    'rider_pickup',
    'international'
  )),
  
  -- Geographic coverage
  coverage_area text not null,  -- e.g., 'Karachi City', 'Islamabad Metro', 'Pakistan-wide'
  coverage_cities text[],  -- Array of covered cities
  excluded_areas text[],  -- Areas NOT covered
  
  -- Timing & availability
  standard_delivery_days_min integer,  -- minimum days
  standard_delivery_days_max integer,  -- maximum days
  express_delivery_days integer,  -- 1, 2, or 3 days
  order_cutoff_time text,  -- e.g., "2:00 PM"
  weekend_service boolean not null default false,
  
  -- Costs
  base_shipping_cost numeric not null default 0,
  cost_per_km numeric,  -- variable cost based on distance
  free_shipping_above_order_value numeric,  -- e.g., orders over 5000 are free
  max_shipping_cost numeric,  -- cap the shipping fee
  
  -- Restrictions
  max_items_per_order integer,
  max_weight_kg numeric,
  max_dimensions_cm text,  -- e.g., "100x100x100"
  restricted_items text[],  -- e.g., ['fragile', 'hazardous', 'perishable']
  
  -- Special conditions
  signature_required boolean not null default false,
  insurance_available boolean not null default true,
  insurance_cost_percent numeric,  -- e.g., 1.5 for 1.5% of order value
  cash_on_delivery boolean not null default true,
  
  -- Status & visibility
  is_active boolean not null default true,
  priority integer not null default 5,
  
  -- Audit trail
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text  -- admin email
);

create index if not exists shipping_type_idx on public.shipping_info_entries(shipping_type);
create index if not exists shipping_active_idx on public.shipping_info_entries(is_active);
create index if not exists shipping_coverage_area_idx on public.shipping_info_entries(coverage_area);
create index if not exists shipping_created_at_idx on public.shipping_info_entries(created_at desc);


-- ============================================================================
-- 5. EMBEDDINGS TABLE (for RAG with pgvector)
-- Stores embeddings of FAQ, policy, and shipping content for semantic search
-- ============================================================================
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  
  -- Source reference
  source_table text not null check (source_table in ('faq_entries', 'policy_entries', 'shipping_info_entries')),
  source_id uuid not null,  -- ID of the row in the source table
  
  -- Chunked content info
  chunk_index integer not null default 0,  -- if text is chunked
  chunk_text text not null,  -- original text chunk
  chunk_metadata jsonb default '{}'::jsonb,  -- {"category": "...", "question": "...", etc}
  
  -- The embedding vector itself
  embedding vector(384),  -- 384 dimensions for all-MiniLM-L6-v2 model
  
  -- Indexing for fast search
  created_at timestamptz not null default now()
);

-- Create vector index for fast similarity search (using IVFFlat or HNSW)
create index if not exists embeddings_vector_idx on public.embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Also index by source for easy cleanup/updates
create index if not exists embeddings_source_idx on public.embeddings(source_table, source_id);
create index if not exists embeddings_created_at_idx on public.embeddings(created_at desc);


-- ============================================================================
-- 6. USER SEARCH BEHAVIOR TABLE
-- Tracks user queries, searches, clicks, and time spent (for recommendation system)
-- Deletes records after 15 days
-- ============================================================================
create table if not exists public.user_search_behavior (
  id uuid primary key default gen_random_uuid(),
  
  -- User identification
  user_id uuid references auth.users(id) on delete cascade,  -- null for guest users
  session_id text,  -- generated session ID for tracking unregistered users
  ip_address inet,  -- for guest tracking
  
  -- Search/discovery activity
  search_query text,  -- what did the user search for?
  search_type text check (search_type in ('text_search', 'category_browse', 'filter_apply', 'recommendation')),
  search_results_count integer,  -- how many results returned?
  
  -- Interaction details
  clicked_listing_ids uuid[] default '{}',  -- which items they clicked on
  clicked_count integer generated always as (array_length(clicked_listing_ids, 1)) stored,
  time_spent_total_seconds integer,  -- total time on search results page
  time_spent_per_listing_seconds jsonb default '{}'::jsonb,  -- {"listing_id": seconds, ...}
  
  -- Product preferences (explicit/implicit)
  category_viewed text,  -- e.g., 'Electronics', 'Furniture'
  sub_category_viewed text,  -- e.g., 'Cameras', 'Lenses'
  price_range_min numeric,
  price_range_max numeric,
  condition_preference text check (condition_preference in ('new', 'like_new', 'good', 'fair', 'any')),
  listing_type_preference text check (listing_type_preference in ('rent', 'sell', 'both')),
  
  -- Demographics (inferred/optional)
  user_age_range text check (user_age_range in ('18-25', '26-35', '36-45', '46-55', '56-65', '65+')),
  user_location text,  -- city or region
  user_primary_device text check (user_primary_device in ('mobile', 'tablet', 'desktop')),
  
  -- Engagement metrics
  is_converted boolean not null default false,  -- did they make a purchase/rental after this search?
  conversion_listing_id uuid,  -- which listing did they convert on
  conversion_mode text check (conversion_mode in ('buy', 'rent')),
  
  -- Features viewed
  applied_filters jsonb default '{}'::jsonb,  -- {"price_max": 50000, "condition": "new", ...}
  sorted_by text,  -- 'price_asc', 'price_desc', 'newest', 'rating', 'popular'
  
  -- Behavior flags
  used_ai_chatbot boolean not null default false,
  chatbot_helped boolean,  -- did chatbot answer help them?
  abandoned_search boolean not null default false,  -- left without interacting
  
  -- Timestamp management
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 days'),  -- auto-delete after 15 days
  
  -- Session context
  referrer_source text check (referrer_source in ('organic', 'direct', 'social', 'email', 'chatbot', 'other')),
  utm_source text,
  utm_campaign text
);

create index if not exists user_behavior_user_id_idx on public.user_search_behavior(user_id);
create index if not exists user_behavior_session_id_idx on public.user_search_behavior(session_id);
create index if not exists user_behavior_created_at_idx on public.user_search_behavior(created_at desc);
create index if not exists user_behavior_expires_at_idx on public.user_search_behavior(expires_at);
create index if not exists user_behavior_category_idx on public.user_search_behavior(category_viewed);
create index if not exists user_behavior_converted_idx on public.user_search_behavior(is_converted);

-- Create a trigger to automatically delete expired records
create or replace function public.cleanup_expired_search_behavior()
returns void
language plpgsql
as $$
begin
  delete from public.user_search_behavior
  where expires_at < now();
end;
$$;


-- ============================================================================
-- 7. CHAT SESSIONS TABLE
-- Track AI chatbot conversations for analytics and context
-- ============================================================================
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  
  -- User identification
  user_id uuid references auth.users(id) on delete set null,  -- null for guest sessions
  session_id text not null unique,  -- consistent session tracking
  
  -- Session metadata
  device_type text check (device_type in ('web', 'mobile', 'tablet')),
  browser_info text,  -- e.g., "Chrome 90", "Safari 14"
  ip_address inet,
  
  -- Conversation context
  conversation_summary text,  -- brief summary of what was discussed
  message_count integer not null default 0,
  
  -- Engagement metrics
  duration_seconds integer,  -- total session duration
  total_queries integer not null default 0,
  products_recommended_count integer not null default 0,
  products_clicked_count integer not null default 0,
  
  -- Outcomes
  conversion_occurred boolean not null default false,
  conversion_listing_id uuid,
  user_satisfaction_rating integer check (user_satisfaction_rating between 1 and 5),
  
  -- Status
  is_active boolean not null default true,
  was_resolved boolean not null default false,
  required_escalation boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index if not exists chat_sessions_session_id_idx on public.chat_sessions(session_id);
create index if not exists chat_sessions_created_at_idx on public.chat_sessions(created_at desc);
create index if not exists chat_sessions_conversion_idx on public.chat_sessions(conversion_occurred);


-- ============================================================================
-- 8. CHAT MESSAGES TABLE
-- Individual messages in a chat session (for history & analytics)
-- ============================================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  
  -- Session reference
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  
  -- Message content
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  
  -- Message metadata
  message_type text check (message_type in ('text', 'product_recommendation', 'faq_answer', 'policy_answer', 'follow_up_question')),
  
  -- For assistant messages: context & grounding
  used_tools text[],  -- ['search_products', 'search_faq', etc]
  retrieval_sources uuid[],  -- references to faq_entries, policy_entries IDs used
  confidence_score numeric check (confidence_score between 0 and 1),
  
  -- For user messages: intent detection
  detected_intent text,  -- 'product_search', 'faq_question', 'policy_question', 'shopping_help'
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'frustrated')),
  
  -- Metadata
  tokens_used integer,  -- LLM tokens for this message
  latency_ms integer,  -- response time in milliseconds
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages(chat_session_id);
create index if not exists chat_messages_role_idx on public.chat_messages(role);
create index if not exists chat_messages_intent_idx on public.chat_messages(detected_intent);
create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at desc);


-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================
alter table public.faq_entries enable row level security;
alter table public.policy_entries enable row level security;
alter table public.shipping_info_entries enable row level security;
alter table public.embeddings enable row level security;
alter table public.user_search_behavior enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- All knowledge tables are publicly readable
create policy "faq_entries_public_read" on public.faq_entries for select using (is_active = true);
create policy "policy_entries_public_read" on public.policy_entries for select using (is_active = true and is_current_version = true);
create policy "shipping_info_public_read" on public.shipping_info_entries for select using (is_active = true);

-- Embeddings are AI service only (internal)
create policy "embeddings_service_only" on public.embeddings for select using (false);

-- User behavior is private to the user or service role
create policy "user_behavior_select_own" on public.user_search_behavior for select
  using (auth.uid() = user_id or auth.uid() is null);

create policy "user_behavior_insert_self" on public.user_search_behavior for insert
  with check (auth.uid() = user_id or user_id is null);

-- Chat sessions are private to user
create policy "chat_sessions_select_own" on public.chat_sessions for select
  using (auth.uid() = user_id or user_id is null);

create policy "chat_sessions_insert_self" on public.chat_sessions for insert
  with check (auth.uid() = user_id or user_id is null);

-- Chat messages follow session visibility
create policy "chat_messages_select_own" on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_messages.chat_session_id
      and (auth.uid() = cs.user_id or cs.user_id is null)
    )
  );

create policy "chat_messages_insert_self" on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_messages.chat_session_id
      and (auth.uid() = cs.user_id or cs.user_id is null)
    )
  );


-- ============================================================================
-- 10. AUTO-UPDATE TRIGGERS
-- ============================================================================
drop trigger if exists faq_entries_set_updated_at on public.faq_entries;
create trigger faq_entries_set_updated_at
  before update on public.faq_entries
  for each row
  execute function public.set_updated_at();

drop trigger if exists policy_entries_set_updated_at on public.policy_entries;
create trigger policy_entries_set_updated_at
  before update on public.policy_entries
  for each row
  execute function public.set_updated_at();

drop trigger if exists shipping_info_set_updated_at on public.shipping_info_entries;
create trigger shipping_info_set_updated_at
  before update on public.shipping_info_entries
  for each row
  execute function public.set_updated_at();

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row
  execute function public.set_updated_at();


-- ============================================================================
-- 11. INITIAL SEEDING (Optional Demo Data)
-- ============================================================================

-- Insert sample FAQs
insert into public.faq_entries (question, answer, category, sub_category, priority, search_keywords)
values
  (
    'How do I verify my account on RentVerse?',
    'To verify your account, go to your profile settings and click "Verify Identity". You can verify with your CNIC number or passport. We use AI to verify your documents within minutes. Verification unlocks higher rental limits and builds seller credibility.',
    'account',
    'verification',
    2,
    'verify account identity CNIC passport verification limits credibility'
  ),
  (
    'What is RentVerse return policy?',
    'Items can be returned within 7 days of delivery if in original condition. Rental items must be returned on the agreed date with no damage. Refunds are processed within 3-5 business days. Some categories (electronics, bikes) have special conditions.',
    'returns',
    'return_window',
    1,
    'return policy days refund items condition damage'
  ),
  (
    'How long does delivery take?',
    'Standard delivery: 3-5 business days. Express delivery: 1-2 days (available in major cities). We show delivery times at checkout. Delivery is free for orders over PKR 5,000 in Karachi, Islamabad, and Lahore.',
    'shipping',
    'delivery_time',
    2,
    'delivery time days express standard shipping free shipping'
  ),
  (
    'Can I cancel my rental booking?',
    'Yes, you can cancel up to 24 hours before the rental starts for a full refund. Cancellations within 24 hours are charged 20% of the rental amount. After rental starts, cancellation follows our rental agreement terms.',
    'policies',
    'rental_cancellation',
    1,
    'cancel rental booking refund 24 hours terms agreement'
  ),
  (
    'What payment methods are accepted?',
    'We accept credit/debit cards (Visa, MasterCard), bank transfers, EasyPaisa, JazzCash, HBL Mobile, and wallet payments. All payments are secured with SSL encryption. For high-value items, escrow protection is available.',
    'payments',
    'payment_methods',
    2,
    'payment methods cards bank transfer easypaisa jazzcash wallet escrow'
  )
on conflict (question) do nothing;

-- Insert sample policies
insert into public.policy_entries (title, content, policy_type, applies_to, effective_date, created_by, search_keywords)
values
  (
    'Standard Return Policy',
    'Products can be returned within 7 days of delivery without any questions asked. The product must be in its original condition with all packaging and accessories. Refunds are issued within 3-5 business days after we receive and inspect the return.',
    'returns',
    'both',
    '2026-01-01',
    'admin@rentverse.pk',
    'returns 7 days original condition refund inspection'
  ),
  (
    'Rental Damage Policy',
    'Renters are responsible for normal wear and tear. Major damage (cracks, dents, non-functional components) will result in damage charges ranging from 10-50% of rental value. Damage must be reported within 24 hours of return.',
    'damage_claims',
    'buyer',
    '2026-01-01',
    'admin@rentverse.pk',
    'rental damage charges wear tear repair costs'
  ),
  (
    'Buyer Protection Program',
    'All purchases on RentVerse are covered by our buyer protection. If an item does not match the listing description or is damaged on arrival, you can file a claim within 48 hours. Our team will mediate and resolve disputes fairly.',
    'dispute_resolution',
    'buyer',
    '2026-01-01',
    'admin@rentverse.pk',
    'buyer protection disputes mediation resolution claims'
  )
on conflict (title) do nothing;

-- Insert sample shipping info
insert into public.shipping_info_entries (title, description, shipping_type, coverage_area, coverage_cities, standard_delivery_days_min, standard_delivery_days_max, base_shipping_cost, free_shipping_above_order_value)
values
  (
    'Standard Delivery - Karachi',
    'Delivery to all areas in Karachi within 3-5 business days. Tracking available via SMS.',
    'standard_delivery',
    'Karachi City',
    '{"Karachi"}',
    3,
    5,
    300,
    5000
  ),
  (
    'Express Delivery - Major Cities',
    'Next-day or 2-day delivery in Karachi, Islamabad, and Lahore for orders placed before 2 PM.',
    'express_delivery',
    'Major Cities',
    '{"Karachi", "Islamabad", "Lahore"}',
    1,
    2,
    800,
    10000
  ),
  (
    'Pickup Service',
    'Pick up your order from our collection points. Free pickup available at 5 locations across Karachi. Open 9 AM to 8 PM daily.',
    'pickup_only',
    'Karachi City',
    '{"Karachi"}',
    1,
    2,
    0,
    0
  )
on conflict (title) do nothing;

-- ============================================================================
-- 12. SAMPLE VIEWS (Optional - for analytics)
-- ============================================================================

-- View: Recent FAQ performance
create or replace view public.faq_popularity as
select
  id,
  question,
  category,
  view_count,
  helpful_votes,
  unhelpful_votes,
  round(100.0 * helpful_votes / nullif(helpful_votes + unhelpful_votes, 0), 2) as helpful_percentage,
  created_at
from public.faq_entries
where is_active = true
order by view_count desc;

-- View: User behavior summary
create or replace view public.user_behavior_summary as
select
  user_id,
  count(*) as total_searches,
  sum(time_spent_total_seconds) as total_time_spent_seconds,
  sum(clicked_count) as total_clicks,
  count(*) filter (where is_converted = true) as conversions,
  max(created_at) as last_activity
from public.user_search_behavior
where expires_at > now()
group by user_id;

-- View: Chat analytics
create or replace view public.chat_analytics as
select
  date_trunc('day', created_at) as date,
  count(*) as total_sessions,
  count(*) filter (where conversion_occurred = true) as conversions,
  count(*) filter (where required_escalation = true) as escalations,
  round(avg(message_count), 2) as avg_messages_per_session,
  round(avg(duration_seconds), 2) as avg_session_duration_sec
from public.chat_sessions
group by date_trunc('day', created_at)
order by date desc;

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
-- 1. Embeddings are generated server-side using sentence-transformers (all-MiniLM-L6-v2)
-- 2. FAQ, policies, and shipping info are manually created/updated by admins via backend endpoints
-- 3. User behavior is logged automatically when users interact with search/browse features
-- 4. Chat sessions and messages are created/updated by the AI chatbot service
-- 5. All timestamps are in UTC (timestamptz)
-- 6. Records expire automatically: user_search_behavior after 15 days, chat_sessions after 30 days
-- 7. RLS policies allow authenticated users to see only their own data, guests are anonymous
-- 8. Service role has full access for backend operations
-- ============================================================================
