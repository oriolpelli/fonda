-- ============================================================================
-- APPLY 0018 — spreadsheet PMS source (Google Sheet / CSV connector)
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice.
--
-- What it does: lets a hotel connect a spreadsheet as its PMS source instead of
-- MEWS/Apaleo. hotels.pms_type is already free text, so "sheet" needs no
-- change; this only adds the encrypted column that stores the sheet's CSV URL.
-- ============================================================================

alter table public.hotels
  add column if not exists sheet_url_encrypted text;

comment on column public.hotels.sheet_url_encrypted is
  'Encrypted CSV export URL of the connected Google Sheet, when pms_type = sheet.';

notify pgrst, 'reload schema';

-- CHECK -- should return: sheet_url_encrypted
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'hotels'
  and column_name = 'sheet_url_encrypted';
