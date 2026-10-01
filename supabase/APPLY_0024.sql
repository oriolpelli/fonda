-- ============================================================================
-- APPLY 0024 -- guest profiles
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice: every statement skips work already done.
--
-- What it does, in plain language: adds the table where Fondas keeps what it
-- has worked out about a guest (trip purpose, occasion, preferences) plus the
-- front desk's own notes. Nothing existing changes. Without this, the Guests
-- screen fails, because the code already expects the table.
--
-- Hotel-scoped by RLS; rows are hard-deleted 24 months after the last stay by
-- the retention cron. The authoritative text, with the reasoning, is
-- supabase/migrations/0024_guest_profiles.sql; this is the same change written
-- to be re-runnable. After running it, check from your own terminal with:
--   npm run verify-migrations
-- ============================================================================

create table if not exists public.guest_profiles (
  hotel_id         uuid not null references public.hotels (id) on delete cascade,
  customer_mews_id text not null,

  trip_purpose text check (
    trip_purpose in ('leisure', 'business', 'family', 'romantic', 'group', 'unknown')
  ),
  occasion text check (
    occasion in ('birthday', 'anniversary', 'honeymoon') or occasion is null
  ),

  preferences jsonb,
  notes text,

  inferred_at    timestamptz,
  last_stay_end  timestamptz,
  updated_at     timestamptz not null default now(),

  primary key (hotel_id, customer_mews_id)
);

create index if not exists guest_profiles_last_stay_idx
  on public.guest_profiles (last_stay_end)
  where last_stay_end is not null;

alter table public.guest_profiles enable row level security;

drop policy if exists "guest_profiles: read own hotel" on public.guest_profiles;
create policy "guest_profiles: read own hotel"
  on public.guest_profiles for select to authenticated
  using (hotel_id = public.current_hotel_id());

drop policy if exists "guest_profiles: insert own hotel" on public.guest_profiles;
create policy "guest_profiles: insert own hotel"
  on public.guest_profiles for insert to authenticated
  with check (hotel_id = public.current_hotel_id());

drop policy if exists "guest_profiles: update own hotel" on public.guest_profiles;
create policy "guest_profiles: update own hotel"
  on public.guest_profiles for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());

notify pgrst, 'reload schema';

-- ============================================================================
-- CHECK -- should return three policies, all on guest_profiles.
-- ============================================================================
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'guest_profiles'
order by policyname;
