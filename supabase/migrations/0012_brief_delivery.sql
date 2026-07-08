-- ============================================================================
-- Fonda — brief delivery (recipients + send hour)
--
-- Phase C of FONDA_REDESIGN_SPEC.md §3.2 / §5.2 / §8 "Brief delivery": the
-- morning brief should go to a configured list of recipients, at a configured
-- hour, in a configured language — instead of emailing every hotel user.
-- briefing_language already exists (migration 0001) and is reused as-is.
-- ============================================================================

alter table public.hotel_settings
  add column brief_recipients  jsonb    not null default '[]'::jsonb,
  add column brief_send_hour   smallint not null default 7;

alter table public.hotel_settings
  add constraint hotel_settings_brief_send_hour_check
  check (brief_send_hour between 0 and 23);

comment on column public.hotel_settings.brief_recipients is
  'Up to 3 email addresses the morning brief is sent to, independent of user '
  'accounts. Empty array = fall back to emailing every hotel user (legacy '
  'behavior) so existing setups do not silently stop receiving mail.';
comment on column public.hotel_settings.brief_send_hour is
  'Hour (0-23) in the hotel''s local timezone (hotels.timezone) at which the '
  'brief cron should generate and send today''s briefing.';

-- No RLS policy changes needed: the existing "hotel_settings: read/insert/
-- update own hotel" policies (migration 0001_init.sql) apply to the whole
-- row, so any authenticated hotel member can already read/write these new
-- columns via the session-scoped client.

notify pgrst, 'reload schema';
