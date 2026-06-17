-- ============================================================================
-- Fonda — initial schema
-- Hotel operations SaaS for independent hotel GMs (20–200 rooms).
--
-- Tenancy model: every row belongs to exactly one hotel. A user (public.users)
-- belongs to one hotel. RLS isolates all data to the caller's hotel.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('owner', 'manager');
create type public.email_status as enum ('pending', 'sent', 'ignored', 'needs_attention');
create type public.chaser_status as enum ('pending', 'sent', 'replied');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Hotels: the tenant root. All other tables fan out from here.
create table public.hotels (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  rooms_count   integer     not null check (rooms_count > 0 and rooms_count <= 1000),
  timezone      text        not null default 'UTC',
  pms_type      text,                       -- e.g. 'cloudbeds', 'mews', 'apaleo'; null until connected
  pms_connected boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Users: app profile, 1:1 with auth.users. Each user belongs to one hotel.
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  email      text not null,
  role       public.user_role not null default 'manager',
  created_at timestamptz not null default now()
);

create index users_hotel_id_idx on public.users (hotel_id);

-- Briefings: the generated morning AI briefing for a hotel.
create table public.briefings (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  content_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at    timestamptz
);

create index briefings_hotel_generated_idx on public.briefings (hotel_id, generated_at desc);

-- Emails: ingested guest emails plus their AI classification and draft reply.
create table public.emails (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels (id) on delete cascade,
  external_id    text,               -- message id from the mailbox provider
  from_email     text,
  subject        text,
  body           text,
  classification text,               -- AI label, e.g. 'booking_request', 'complaint'
  draft_reply    text,
  status         public.email_status not null default 'pending',
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  -- A provider message maps to at most one row per hotel (idempotent ingest).
  unique (hotel_id, external_id)
);

create index emails_hotel_status_idx on public.emails (hotel_id, status);

-- Check-in chasers: outbound nudges asking guests for their arrival time.
create table public.checkin_chasers (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels (id) on delete cascade,
  reservation_id text,               -- reservation reference from the PMS (not a local FK)
  guest_email    text,
  draft_content  text,
  status         public.chaser_status not null default 'pending',
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index checkin_chasers_hotel_status_idx on public.checkin_chasers (hotel_id, status);

-- Hotel settings: one row per hotel, drives briefing + AI tone.
create table public.hotel_settings (
  id                   uuid primary key default gen_random_uuid(),
  hotel_id             uuid not null unique references public.hotels (id) on delete cascade,
  briefing_time        time not null default '07:00',
  briefing_language    text not null default 'en',
  gm_name              text,
  arrival_instructions text,
  tone_guidelines      text
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS — this is what lets
-- the public.users policy reference the same table without infinite recursion).
-- ---------------------------------------------------------------------------

-- The hotel the current authenticated user belongs to.
create or replace function public.current_hotel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hotel_id from public.users where id = auth.uid();
$$;

-- The current authenticated user's role within their hotel.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

revoke all on function public.current_hotel_id() from public;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_hotel_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security
--
-- Core rule: a hotel can only read its own data. Backend jobs (briefing
-- generation, email ingest, chaser dispatch) run with the service_role key,
-- which bypasses RLS — so the client-facing policies below stay tight.
-- ---------------------------------------------------------------------------

alter table public.hotels          enable row level security;
alter table public.users           enable row level security;
alter table public.briefings       enable row level security;
alter table public.emails          enable row level security;
alter table public.checkin_chasers enable row level security;
alter table public.hotel_settings  enable row level security;

-- hotels: members read their own hotel; owners may update it.
create policy "hotels: read own"
  on public.hotels for select to authenticated
  using (id = public.current_hotel_id());

create policy "hotels: owner updates"
  on public.hotels for update to authenticated
  using (id = public.current_hotel_id() and public.current_user_role() = 'owner')
  with check (id = public.current_hotel_id());

-- users: read everyone in your hotel; update only your own profile row.
-- (Inserting users is provisioning — done server-side with the service role.)
create policy "users: read same hotel"
  on public.users for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "users: update self"
  on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and hotel_id = public.current_hotel_id());

-- briefings: read-only for the client; written by the briefing job.
create policy "briefings: read own hotel"
  on public.briefings for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "briefings: mark opened"
  on public.briefings for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

-- emails: read + triage (edit draft / change status) within your hotel.
create policy "emails: read own hotel"
  on public.emails for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "emails: triage own hotel"
  on public.emails for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

-- checkin_chasers: read + edit drafts/status within your hotel.
create policy "checkin_chasers: read own hotel"
  on public.checkin_chasers for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "checkin_chasers: manage own hotel"
  on public.checkin_chasers for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

-- hotel_settings: members read; members create + update their hotel's settings.
create policy "hotel_settings: read own hotel"
  on public.hotel_settings for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "hotel_settings: insert own hotel"
  on public.hotel_settings for insert to authenticated
  with check (hotel_id = public.current_hotel_id());

create policy "hotel_settings: update own hotel"
  on public.hotel_settings for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());
