-- ============================================================================
-- APPLY 0030 -- the rate cache: average rate, selling price and pickup
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice. Takes a second; it only creates two new tables.
--
-- What it does, in plain language:
--   * gives Fondas somewhere to keep, for each of the next 14 nights, how many
--     rooms are sold, what they are paying on average (excl. VAT), and the
--     lowest public price the hotel is still selling at;
--   * keeps a copy of those numbers at the start of each day, so the brief
--     can say what was booked yesterday ("+3 rooms for Friday").
-- No guest data goes in either table. Nothing existing is changed.
-- Until this is applied the app works exactly as before, without rates.
--
-- Check it took, in the SQL editor:
--   select table_name from information_schema.tables
--    where table_schema = 'public'
--      and table_name in ('rate_nights', 'rate_snapshots')
--    order by 1;
--   -- expect two rows
--
-- The first sync after this fills rate_nights and takes today's snapshot.
-- Pickup appears in the brief from the second day.
--
-- The authoritative text is supabase/migrations/0030_rate_cache.sql.
-- ============================================================================

create table if not exists public.rate_nights (
  hotel_id             uuid not null references public.hotels (id) on delete cascade,
  night                date not null,
  rooms_sold           integer not null default 0,
  priced_rooms         integer,
  revenue_net          numeric(12, 2),
  revenue_gross        numeric(12, 2),
  sell_from_net        numeric(12, 2),
  sell_from_gross      numeric(12, 2),
  sell_from_checked_at timestamptz,
  sell_from_attempted_at timestamptz,
  currency             text,
  updated_at           timestamptz not null default now(),
  primary key (hotel_id, night)
);

create table if not exists public.rate_snapshots (
  hotel_id      uuid not null references public.hotels (id) on delete cascade,
  as_of         date not null,
  night         date not null,
  rooms_sold    integer not null,
  priced_rooms  integer,
  revenue_net   numeric(12, 2),
  taken_at      timestamptz not null default now(),
  primary key (hotel_id, as_of, night)
);

-- The retention sweep deletes by age across all hotels.
create index if not exists rate_snapshots_as_of_idx
  on public.rate_snapshots (as_of);

alter table public.rate_nights    enable row level security;
alter table public.rate_snapshots enable row level security;

drop policy if exists "rate_nights: read own hotel" on public.rate_nights;
create policy "rate_nights: read own hotel"
  on public.rate_nights for select to authenticated
  using (hotel_id = (select public.current_hotel_id()));

drop policy if exists "rate_snapshots: read own hotel" on public.rate_snapshots;
create policy "rate_snapshots: read own hotel"
  on public.rate_snapshots for select to authenticated
  using (hotel_id = (select public.current_hotel_id()));

-- PostgREST caches the schema; reload it so the new tables are usable at once.
notify pgrst, 'reload schema';
