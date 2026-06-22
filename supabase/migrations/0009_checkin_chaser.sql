-- ============================================================================
-- Fonda — check-in chasing support
--
-- Adds the guest's expected arrival time to reservations (null until known —
-- the chaser targets reservations where it is null) and a 'skipped' state for
-- chasers the GM dismissed.
-- ============================================================================

alter table public.reservations
  add column arrival_time timestamptz;

comment on column public.reservations.arrival_time is
  'Guest''s expected arrival time, if known. Null reservations are chased.';

-- New chaser state for "skip" (kept out of the dedupe window so it isn't
-- regenerated). Safe to run alongside other DDL: the value isn't used in this
-- same transaction.
alter type public.chaser_status add value if not exists 'skipped';
