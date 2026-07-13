-- ============================================================================
-- APPLY 0012 — brief delivery columns  (paste this whole file into the
-- Supabase dashboard → SQL Editor → Run, on the DEV project).
--
-- This is migration 0012_brief_delivery.sql made idempotent so it is safe to
-- run once, or re-run if you're unsure whether it already applied. Deploy
-- ORDER: run this FIRST, then deploy/run the B1 code.
-- ============================================================================

-- 1) Add the two new columns (skip if they already exist) --------------------
alter table public.hotel_settings
  add column if not exists brief_recipients jsonb    not null default '[]'::jsonb,
  add column if not exists brief_send_hour  smallint not null default 7;

-- 2) Range constraint on the send hour (guard the duplicate-name error) ------
do $$
begin
  alter table public.hotel_settings
    add constraint hotel_settings_brief_send_hour_check
    check (brief_send_hour between 0 and 23);
exception
  when duplicate_object then null;  -- constraint already there, fine
end $$;

-- 3) Column comments (documentation only) ------------------------------------
comment on column public.hotel_settings.brief_recipients is
  'Up to 3 email addresses the morning brief is sent to, independent of user '
  'accounts. Empty array = fall back to emailing every hotel user (legacy '
  'behavior) so existing setups do not silently stop receiving mail.';
comment on column public.hotel_settings.brief_send_hour is
  'Hour (0-23) in the hotel''s local timezone (hotels.timezone) at which the '
  'brief cron should generate and send today''s briefing.';

-- 4) Tell PostgREST to reload its schema cache so the API sees the columns ---
notify pgrst, 'reload schema';

-- ============================================================================
-- VERIFY — run this after the block above. Expect two rows:
--   brief_recipients | jsonb    | '[]'::jsonb
--   brief_send_hour  | smallint | '7'::smallint
-- If you get zero rows, the ALTER did not take — check the messages pane.
-- ============================================================================
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'hotel_settings'
  and column_name in ('brief_recipients', 'brief_send_hour')
order by column_name;
