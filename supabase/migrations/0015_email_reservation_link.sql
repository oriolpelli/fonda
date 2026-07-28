-- ============================================================================
-- Fonda — link ingested emails to the reservation/guest they matched
--
-- Phase E of FONDA_REDESIGN_SPEC.md splits the inbox into Concierge (in-house)
-- and Communications (pre-arrival / general) by *stay phase*:
--   in-house  ⟺  arrival ≤ today ≤ departure, in hotel-local dates.
--
-- Stay phase is deliberately NOT stored. It is a function of today's date, so a
-- stored value silently rots the moment a guest checks out. What we store here
-- is the durable half of the derivation — *which* reservation and guest the
-- email matched — resolved once by lib/email-processor.ts at classification
-- time. The phase itself is computed at query time from these ids plus the
-- hotel's local date (see lib/stay-phase.ts).
--
-- Both columns hold PMS-side ids (MEWS ids), matching the convention in
-- public.reservations / public.customers. They are not foreign keys for the
-- same reason reservations.customer_mews_id isn't: the PMS is the source of
-- truth and a row may be cached before (or after) its counterpart.
-- ============================================================================

alter table public.emails
  add column reservation_mews_id text,
  add column customer_mews_id    text;

comment on column public.emails.reservation_mews_id is
  'MEWS reservation Id this email was matched to at classification time, or '
  'null if no reservation matched. Used with reservations.start_utc/end_utc to '
  'derive stay phase at query time — never store the phase itself.';
comment on column public.emails.customer_mews_id is
  'MEWS customer Id of the matched guest, or null. Supplies guest context '
  '(name) inline in the Concierge / Communications inbox.';

create index emails_hotel_reservation_idx
  on public.emails (hotel_id, reservation_mews_id);

-- RLS is unchanged: public.emails already restricts every select/update to
-- hotel_id = public.current_hotel_id(), and new columns inherit those policies.
-- Writes to these columns come from the email processor via the service_role
-- key, exactly like classification/draft_reply.

notify pgrst, 'reload schema';
