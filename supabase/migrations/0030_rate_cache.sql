-- ============================================================================
-- Fondas — the rate cache (B17, 2 Oct 2026)
--
-- Two new tables. Nothing existing is altered, and no row anywhere is changed
-- or removed. The app runs with or without this migration: the sync and every
-- reader ask lib/schema-features.ts whether it is applied, and without it the
-- brief, Ask and Home behave exactly as before (no rates).
--
-- 1. rate_nights — the live cache, one row per hotel per night
--    Written by the PMS sync (lib/rate-sync.ts) with the service role, at most
--    once per run and only for nights whose numbers changed. For each of the
--    next 14 hotel-local nights:
--      rooms_sold        stays covering that night (lib/occupancy.ts's rule)
--      priced_rooms      of those, how many carry a positive room charge in
--                        the PMS. NULL = the source has no charges at all
--                        (the Sheet import), which is not the same as zero
--      revenue_net/gross the room charges of those priced rooms, excl./incl.
--                        VAT. ADR = revenue_net / priced_rooms
--      sell_from_net/... the lowest public price the hotel is selling that
--                        night at: an active public rate, open that night, in a
--                        room type with a room left. NULL = none open, or the
--                        source can't say. Checked about hourly, not every run
--      currency          ISO-4217, as the PMS reports it
--    Past nights are left as last written: the row stops changing once the
--    night leaves the window, which makes it that night's final figure.
--
-- 2. rate_snapshots — the cache as it stood at the start of each local day
--    Written once per hotel per hotel-local day, at the first sync after
--    midnight, and never updated. Pickup is the difference between two of
--    them: "yesterday" is today's snapshot minus yesterday's. No guest data:
--    counts and money per night only. Kept 400 days (the retention cron), so a
--    same-night-last-year comparison becomes possible after a year.
--
-- RLS: hotel members read their own hotel's rows. There are no client write
-- policies — only the sync (service role) writes, like reservations (0003).
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
