-- ============================================================================
-- Fonda — PMS cache tables
--
-- A thin local cache of MEWS reservations and customer profiles, kept in sync
-- by lib/mews-sync.ts. The canonical source of truth stays in MEWS; these
-- tables exist so the app (briefings, check-in chasing, hotel chat) can query
-- guest data fast and offline from the connector. `raw` holds the full MEWS
-- payload so nothing is lost in mapping.
-- ============================================================================

-- Reservations -------------------------------------------------------------
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

-- Customers ----------------------------------------------------------------
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

-- RLS: hotel members read their own cached PMS data. Writes are done by the
-- sync job with the service_role key (which bypasses RLS), so there are no
-- client-facing insert/update policies.
alter table public.reservations enable row level security;
alter table public.customers    enable row level security;

create policy "reservations: read own hotel"
  on public.reservations for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "customers: read own hotel"
  on public.customers for select to authenticated
  using (hotel_id = public.current_hotel_id());
