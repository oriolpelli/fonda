-- ============================================================================
-- APPLY 0028 -- three indexes that make the dashboard's reads fast
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice.
--
-- What it does, in plain language: adds three indexes — lookup tables
-- Postgres keeps for itself — so Home, the brief, Arrivals, the inbox and a
-- guest's record find their rows directly instead of reading through every
-- booking and every email the hotel has ever had. Nothing you can see
-- changes except speed. No data is added, changed or removed.
--
-- Apply it BEFORE the speed pass (branch perf/pass-a) reaches production: the
-- new code orders Home's read so that it uses the first index. Without the
-- index that read still works, just no faster than today.
--
-- Check it took, in the SQL editor:
--   select indexname from pg_indexes
--    where indexname in ('reservations_hotel_end_idx',
--                        'emails_hotel_created_idx',
--                        'emails_hotel_customer_idx');
--   -- expect three rows
--
-- The authoritative text is supabase/migrations/0028_perf_indexes.sql.
-- ============================================================================

create index if not exists reservations_hotel_end_idx
  on public.reservations (hotel_id, end_utc);

create index if not exists emails_hotel_created_idx
  on public.emails (hotel_id, created_at desc);

create index if not exists emails_hotel_customer_idx
  on public.emails (hotel_id, customer_mews_id);

analyze public.reservations;
analyze public.emails;
