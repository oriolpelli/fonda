-- ============================================================================
-- Fonda — full schema (combined migrations 0001–0007)
--
-- Paste this entire file into the Supabase SQL Editor and run it once to build
-- the complete schema on a FRESH database. It applies migrations in order:
--   0001 init (enums, tables, helpers, RLS)
--   0002 MEWS credential columns
--   0003 reservations + customers cache
--   0004 provision_hotel() function
--   0005 last_synced_at + sync_logs
--   0006 Apaleo credential column
--   0007 PostgREST schema-cache reload
--
-- Uses plain CREATE statements (no IF NOT EXISTS), so it expects an empty
-- public schema. If objects already exist, drop them first or apply the
-- individual migrations instead.
-- ============================================================================


-- ############################################################################
-- 0001 — initial schema
-- ############################################################################

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Enums --------------------------------------------------------------------
create type public.user_role as enum ('owner', 'manager');
create type public.email_status as enum ('pending', 'sent', 'ignored', 'needs_attention');
create type public.chaser_status as enum ('pending', 'sent', 'replied');

-- Tables -------------------------------------------------------------------

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

-- Helper functions (SECURITY DEFINER so they bypass RLS — this is what lets
-- the public.users policy reference the same table without infinite recursion).

create or replace function public.current_hotel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hotel_id from public.users where id = auth.uid();
$$;

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

-- Row-Level Security -------------------------------------------------------

alter table public.hotels          enable row level security;
alter table public.users           enable row level security;
alter table public.briefings       enable row level security;
alter table public.emails          enable row level security;
alter table public.checkin_chasers enable row level security;
alter table public.hotel_settings  enable row level security;

create policy "hotels: read own"
  on public.hotels for select to authenticated
  using (id = public.current_hotel_id());

create policy "hotels: owner updates"
  on public.hotels for update to authenticated
  using (id = public.current_hotel_id() and public.current_user_role() = 'owner')
  with check (id = public.current_hotel_id());

create policy "users: read same hotel"
  on public.users for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "users: update self"
  on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and hotel_id = public.current_hotel_id());

create policy "briefings: read own hotel"
  on public.briefings for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "briefings: mark opened"
  on public.briefings for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

create policy "emails: read own hotel"
  on public.emails for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "emails: triage own hotel"
  on public.emails for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

create policy "checkin_chasers: read own hotel"
  on public.checkin_chasers for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "checkin_chasers: manage own hotel"
  on public.checkin_chasers for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

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


-- ############################################################################
-- 0002 — MEWS credential columns (encrypted at rest)
-- ############################################################################

alter table public.hotels
  add column mews_client_token_encrypted text,
  add column mews_access_token_encrypted text;

comment on column public.hotels.mews_client_token_encrypted is
  'AES-256-GCM ciphertext of the MEWS ClientToken. Decrypt only server-side.';
comment on column public.hotels.mews_access_token_encrypted is
  'AES-256-GCM ciphertext of the MEWS AccessToken. Decrypt only server-side.';

-- Clients never receive these columns; only service_role can read/write them.
-- Consequence: client-side reads of `hotels` must select explicit columns.
revoke select (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;
revoke update (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;
revoke insert (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;


-- ############################################################################
-- 0003 — reservations + customers cache
-- ############################################################################

create table public.reservations (
  id                     uuid primary key default gen_random_uuid(),
  hotel_id               uuid not null references public.hotels (id) on delete cascade,
  mews_id                text not null,            -- MEWS reservation Id
  service_id             text,
  group_id               text,
  number                 text,
  state                  text,
  customer_mews_id       text,                     -- AccountId on the MEWS reservation
  requested_category_id  text,
  assigned_space_id      text,
  rate_id                text,
  start_utc              timestamptz,
  end_utc                timestamptz,
  adult_count            integer,
  child_count            integer,
  raw                    jsonb not null default '{}'::jsonb,
  mews_updated_utc       timestamptz,
  synced_at              timestamptz not null default now(),
  unique (hotel_id, mews_id)
);

create index reservations_hotel_start_idx on public.reservations (hotel_id, start_utc);
create index reservations_hotel_customer_idx on public.reservations (hotel_id, customer_mews_id);

create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references public.hotels (id) on delete cascade,
  mews_id           text not null,                 -- MEWS customer Id
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  nationality_code  text,
  language_code     text,
  raw               jsonb not null default '{}'::jsonb,
  mews_updated_utc  timestamptz,
  synced_at         timestamptz not null default now(),
  unique (hotel_id, mews_id)
);

create index customers_hotel_email_idx on public.customers (hotel_id, email);

alter table public.reservations enable row level security;
alter table public.customers    enable row level security;

create policy "reservations: read own hotel"
  on public.reservations for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "customers: read own hotel"
  on public.customers for select to authenticated
  using (hotel_id = public.current_hotel_id());


-- ############################################################################
-- 0004 — provision_hotel(): atomic hotel + owner user + settings
-- ############################################################################

create or replace function public.provision_hotel(
  p_user_id    uuid,
  p_email      text,
  p_hotel_name text,
  p_rooms_count integer,
  p_timezone   text,
  p_pms_type   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  -- Guard against double-provisioning (and avoid leaving an orphan hotel).
  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'User % is already provisioned', p_user_id
      using errcode = 'unique_violation';
  end if;

  insert into public.hotels (name, rooms_count, timezone, pms_type)
  values (p_hotel_name, p_rooms_count, p_timezone, p_pms_type)
  returning id into v_hotel_id;

  insert into public.users (id, hotel_id, email, role)
  values (p_user_id, v_hotel_id, p_email, 'owner');

  insert into public.hotel_settings (hotel_id)
  values (v_hotel_id);

  return v_hotel_id;
end;
$$;

revoke all on function
  public.provision_hotel(uuid, text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function
  public.provision_hotel(uuid, text, text, integer, text, text)
  to service_role;


-- ############################################################################
-- 0005 — last_synced_at + sync_logs
-- ############################################################################

alter table public.hotels
  add column last_synced_at timestamptz;

comment on column public.hotels.last_synced_at is
  'Timestamp of the most recent successful PMS sync for this hotel.';

create table public.sync_logs (
  id                 uuid primary key default gen_random_uuid(),
  hotel_id           uuid not null references public.hotels (id) on delete cascade,
  status             text not null check (status in ('success', 'error')),
  reservations_count integer not null default 0,
  customers_count    integer not null default 0,
  error              text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index sync_logs_hotel_created_idx on public.sync_logs (hotel_id, created_at desc);

alter table public.sync_logs enable row level security;

create policy "sync_logs: read own hotel"
  on public.sync_logs for select to authenticated
  using (hotel_id = public.current_hotel_id());


-- ############################################################################
-- 0006 — Apaleo credential column (encrypted refresh token)
-- ############################################################################

alter table public.hotels
  add column apaleo_refresh_token_encrypted text;

comment on column public.hotels.apaleo_refresh_token_encrypted is
  'AES-256-GCM ciphertext of the Apaleo OAuth refresh token. Decrypt only server-side.';

revoke select (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke update (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke insert (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;


-- ############################################################################
-- 0008 — Gmail credential columns (encrypted refresh token + connected address)
-- ############################################################################

alter table public.hotels
  add column gmail_refresh_token_encrypted text,
  add column gmail_email text;

comment on column public.hotels.gmail_refresh_token_encrypted is
  'AES-256-GCM ciphertext of the Gmail OAuth refresh token. Decrypt only server-side.';
comment on column public.hotels.gmail_email is
  'The connected Gmail address (safe to show to hotel members).';

revoke select (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke update (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke insert (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;


-- ############################################################################
-- 0009 — check-in chasing (arrival_time + chaser 'skipped' state)
-- ############################################################################

alter table public.reservations
  add column arrival_time timestamptz;

comment on column public.reservations.arrival_time is
  'Guest''s expected arrival time, if known. Null reservations are chased.';

alter type public.chaser_status add value if not exists 'skipped';


-- ############################################################################
-- reload PostgREST schema cache so RPCs resolve immediately
-- ############################################################################

notify pgrst, 'reload schema';
