-- ============================================================================
-- Fonda — hotel profile & tone
--
-- Broadens hotel_settings with a "who we are, how we sound" profile so the
-- briefing, chat, guest email drafts, and check-in chasers can speak in the
-- hotel's actual voice instead of generic copy. All new columns are nullable
-- (room_types defaults to an empty array) so the existing hotel_settings row
-- per hotel and the existing briefing/tone columns are unaffected.
-- ============================================================================

alter table public.hotel_settings
  add column star_rating           smallint,
  add column property_type         text,
  add column check_in_time         time,
  add column check_out_time        time,
  add column policies              text,
  add column positioning_vibe      text,
  add column target_guest          text,
  add column local_recommendations text,
  add column preferred_greeting    text,
  add column signoff_name          text,
  add column languages_spoken      text,
  add column tripadvisor_url       text,
  add column review_highlights     text,
  add column review_summary        text,
  add column parking_transport     text,
  add column wifi_info             text,
  add column breakfast_info        text,
  add column room_types            jsonb not null default '[]'::jsonb;

alter table public.hotel_settings
  add constraint hotel_settings_star_rating_check
  check (star_rating is null or star_rating between 1 and 5);

comment on column public.hotel_settings.room_types is
  'Array of { name, count, category }, entered manually in Settings today. '
  'TODO(future phase): a "pull from PMS" action could auto-fill this instead.';
comment on column public.hotel_settings.review_summary is
  'Claude-generated condensation of review_highlights, produced once via the '
  '"Summarize" action in Settings — never regenerated automatically or scraped live.';

-- No RLS policy changes needed: the existing "hotel_settings: read/insert/
-- update own hotel" policies (migration 0001_init.sql) apply to the whole
-- row, so any authenticated hotel member can already read/write these new
-- columns via the session-scoped client.

notify pgrst, 'reload schema';
