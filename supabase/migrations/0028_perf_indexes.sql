-- ============================================================================
-- Fondas — indexes for the reads every signed-in page makes (1 Oct 2026)
--
-- Speed pass S1, prompt P3 (docs/audits/2026-10-01-performance.md §4.13).
-- ADDS INDEXES ONLY. No table, column, row or policy changes; dropping them
-- would put every query back exactly as it was.
--
-- 1. reservations (hotel_id, end_utc)
--    Home and the brief read "every stay overlapping the next fortnight" —
--    start_utc < window end AND end_utc > window start
--    (lib/dashboard-snapshot.ts, lib/hotel-context.ts, lib/briefing.ts), and
--    today's departures filter on end_utc alone (lib/arrivals.ts). Until now
--    only (hotel_id, start_utc) existed, and "started before the window ends"
--    excludes nothing in the past: Postgres walked every booking the hotel
--    has ever had, a set that grows every day because sync never prunes.
--    With this index it reads only stays that haven't ended.
--    Measured on Postgres 16, a 45,500-reservation hotel: the Home window
--    read 40 ms → 7 ms (with the slim select and end_utc ordering that ship
--    alongside it), today's departures 47 ms → under 10 ms.
--
-- 2. emails (hotel_id, created_at desc)
--    The inbox is "the newest 200 messages" (lib/inbox.ts). Only
--    (hotel_id, status) and (hotel_id, reservation_mews_id) existed, so every
--    inbox load sorted the hotel's whole mailbox to keep 200. RLS's
--    `hotel_id = current_hotel_id()` is used as the index condition directly
--    (checked with EXPLAIN as the authenticated role), so the query needs no
--    change. 3.8 ms → 0.9 ms on 3,000 emails, and flat as the mailbox grows.
--
-- 3. emails (hotel_id, customer_mews_id)
--    A guest's record lists their mail newest-first (lib/guests.ts,
--    loadGuestRecord); nothing indexed customer_mews_id on emails.
--
-- Plain CREATE INDEX, not CONCURRENTLY: CONCURRENTLY cannot run inside a
-- transaction, and both the Supabase SQL editor (a pasted script runs as one)
-- and migration tooling use one. At today's sizes each build takes well under
-- a second, during which writes to that table (the sync, the email cron)
-- wait. Re-runnable.
-- ============================================================================

create index if not exists reservations_hotel_end_idx
  on public.reservations (hotel_id, end_utc);

create index if not exists emails_hotel_created_idx
  on public.emails (hotel_id, created_at desc);

create index if not exists emails_hotel_customer_idx
  on public.emails (hotel_id, customer_mews_id);

analyze public.reservations;
analyze public.emails;
