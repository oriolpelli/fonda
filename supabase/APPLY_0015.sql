-- ============================================================================
-- APPLY 0015 — link ingested emails to the reservation/guest they matched
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice: every statement skips work already done.
--
-- What it does, in plain language: the inbox is being split into "guests
-- staying now" (Concierge) and "guests arriving later" (Communications). To
-- know which is which, each email needs to remember which booking it belongs
-- to. This adds those two remembering columns. It does NOT store "in-house" or
-- "pre-arrival" as a value — that is worked out fresh from today's date every
-- time the page loads, so it can never go stale as guests check out.
-- ============================================================================

alter table public.emails
  add column if not exists reservation_mews_id text,
  add column if not exists customer_mews_id    text;

comment on column public.emails.reservation_mews_id is
  'MEWS reservation Id this email was matched to at classification time, or '
  'null if no reservation matched. Used with reservations.start_utc/end_utc to '
  'derive stay phase at query time — never store the phase itself.';
comment on column public.emails.customer_mews_id is
  'MEWS customer Id of the matched guest, or null. Supplies guest context '
  '(name) inline in the Concierge / Communications inbox.';

create index if not exists emails_hotel_reservation_idx
  on public.emails (hotel_id, reservation_mews_id);

notify pgrst, 'reload schema';

-- VERIFY — expect two rows: customer_mews_id, reservation_mews_id
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'emails'
  and column_name in ('reservation_mews_id', 'customer_mews_id')
order by column_name;
