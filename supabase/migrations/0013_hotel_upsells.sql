-- ============================================================================
-- Fonda — hotel upsells / ancillary extras (v2 addition, ROADMAP.md 1.12 / B6)
--
-- Adds a configurable list of paid extras (late checkout, breakfast, transfer,
-- parking, or a custom item) to the hotel profile so drafts and chat can answer
-- "how much is late checkout?" correctly. Data model + settings form only — the
-- proactive-upselling drafting feature ships in August (Aug-1).
--
-- Follows the room_types pattern from 0011_hotel_profile.sql exactly: one jsonb
-- column, NOT NULL DEFAULT '[]', on the existing per-hotel hotel_settings row.
-- Shape per item:
--   { key: 'late_checkout'|'breakfast'|'transfer'|'parking'|'custom',
--     label: string, price: string, notes?: string, active: boolean }
-- ============================================================================

alter table public.hotel_settings
  add column upsells jsonb not null default '[]'::jsonb;

comment on column public.hotel_settings.upsells is
  'Array of { key, label, price, notes?, active } ancillary extras (late '
  'checkout, breakfast, transfer, parking, custom), entered manually in '
  'Settings. Consumed by buildHotelProfileSummary so drafts/chat can quote '
  'prices; proactive upselling (Aug-1) will build on this.';

-- No RLS policy changes needed: the existing "hotel_settings: read/insert/
-- update own hotel" policies (0001_init.sql) apply to the whole row, so any
-- authenticated hotel member can already read/write this column via the
-- session-scoped client. (Same rationale as 0011 and 0012.)

notify pgrst, 'reload schema';
