-- ============================================================================
-- Fondas — guest profiles (APP_UX_PROPOSAL.md §5.4, §11 decision 6)
--
-- What Fondas has worked out about a guest, kept separately from what the PMS
-- says about them. `customers` and `reservations` are synced and are the PMS's
-- to own; this table is ours, and nothing in it is ever written back.
--
-- THREE RULES, all load-bearing.
--
-- 1. RETENTION — 24 MONTHS. A row is hard-deleted 24 months after
--    `last_stay_end`, nightly, by app/api/cron/retention. Not archived, not
--    soft-deleted: deleted. The policy is stated on /trust because it is
--    exactly what a hotel's DPO asks about, and it is cheap to keep — a 30-room
--    property reaches roughly 6,000 rows over the full 24 months, which is
--    about ten days' worth of cron logs.
--
-- 2. `notes` IS STAFF-WRITTEN AND INFERENCE NEVER TOUCHES IT. Not "tries not
--    to" — the inference writer does not include the column. A GM has to be
--    able to write "difficult about noise, do not put in 204" and find it there
--    tomorrow, unedited. The moment a model can rewrite that, nobody writes
--    anything worth having.
--
-- 3. INFERENCE NEVER OVERWRITES A STAFF EDIT. Every preference carries a
--    `source`, and a field whose current value came from a human is left alone.
--    Inference fills blanks and refreshes what it wrote before; it does not
--    argue with the front desk.
--
-- PII. This is the most sensitive table in the product: it holds guesses about
-- people. It is hotel-scoped by RLS, never reachable with the service-role key
-- from page code, and nothing here is logged in plaintext. The inference input
-- is pseudonymised the same way the briefing's is (lib/pseudonymise.ts).
-- ============================================================================

create table public.guest_profiles (
  hotel_id         uuid not null references public.hotels (id) on delete cascade,
  customer_mews_id text not null,

  trip_purpose text check (
    trip_purpose in ('leisure', 'business', 'family', 'romantic', 'group', 'unknown')
  ),
  occasion text check (
    occasion in ('birthday', 'anniversary', 'honeymoon') or occasion is null
  ),

  -- [{ text, source: 'email' | 'reservation' | 'staff', at }]
  -- `source` is what rule 3 reads. A preference a human typed is source
  -- 'staff' and is never replaced by a later inference run.
  preferences jsonb,

  -- Rule 2. Free text, written by the front desk, never by a model.
  notes text,

  inferred_at    timestamptz,
  -- Rule 1 reads this. Null means no completed stay yet, and a null is never
  -- deleted — a future booking is not stale data.
  last_stay_end  timestamptz,
  updated_at     timestamptz not null default now(),

  primary key (hotel_id, customer_mews_id)
);

-- The retention sweep's only query.
create index guest_profiles_last_stay_idx
  on public.guest_profiles (last_stay_end)
  where last_stay_end is not null;

alter table public.guest_profiles enable row level security;

-- Hotel-scoped, and that is the whole boundary. Unlike chat_threads this is
-- NOT per-user: a guest profile is the property's knowledge about a guest, and
-- the night manager needs what the day manager wrote.
create policy "guest_profiles: read own hotel"
  on public.guest_profiles for select to authenticated
  using (hotel_id = public.current_hotel_id());

create policy "guest_profiles: insert own hotel"
  on public.guest_profiles for insert to authenticated
  with check (hotel_id = public.current_hotel_id());

create policy "guest_profiles: update own hotel"
  on public.guest_profiles for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());
