-- ============================================================================
-- APPLY 0013 — hotel upsells column  (paste into Supabase dashboard → SQL
-- Editor → Run, on the DEV project). Idempotent; safe to run once or re-run.
-- Deploy ORDER: run this FIRST, then deploy the B6 code.
-- ============================================================================

alter table public.hotel_settings
  add column if not exists upsells jsonb not null default '[]'::jsonb;

comment on column public.hotel_settings.upsells is
  'Array of { key, label, price, notes?, active } ancillary extras (late '
  'checkout, breakfast, transfer, parking, custom), entered manually in '
  'Settings. Consumed by buildHotelProfileSummary so drafts/chat can quote '
  'prices; proactive upselling (Aug-1) will build on this.';

notify pgrst, 'reload schema';

-- VERIFY — expect one row: upsells | jsonb | '[]'::jsonb
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'hotel_settings'
  and column_name  = 'upsells';
