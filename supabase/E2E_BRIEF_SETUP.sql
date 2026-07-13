-- ============================================================================
-- E2E BRIEF SETUP — run in Supabase SQL Editor (DEV) AFTER APPLY_0012.sql.
--
-- Configures the dev hotel so the briefing cron fires on this tick:
--   briefing_language = 'es'
--   brief_recipients  = [ your email ]  (sole recipient)
--   brief_send_hour   = CURRENT MADRID HOUR   <-- EDIT the two spots below
--
-- IMPORTANT — set :send_hour to the hotel's *current* local hour, because the
-- cron only fires when localHour(tz, now) == brief_send_hour. If your dev
-- hotel's timezone is Europe/Madrid, use the current Madrid hour (0-23).
-- Check it first (run this one line, note the number):
--   select extract(hour from (now() at time zone 'Europe/Madrid'))::int as madrid_hour;
-- ============================================================================

-- >>> EDIT THESE TWO VALUES <<<
-- your_email  : the sole recipient (also lets you confirm delivery in your inbox)
-- send_hour   : the current local hour of the dev hotel (0-23)
with cfg as (
  select
    'oriolpelli@icloud.com'::text as your_email,
    -- replace the extract(...) with a hard number if you prefer, e.g. 20
    extract(hour from (now() at time zone 'Europe/Madrid'))::int as send_hour
),
-- Pick the target hotel. Uses the single pms_connected hotel. If you have more
-- than one connected hotel, replace this CTE with: select '<hotel-uuid>' as id
target as (
  select id from public.hotels where pms_connected = true
  order by created_at asc
  limit 1
)
insert into public.hotel_settings (hotel_id, briefing_language, brief_recipients, brief_send_hour)
select
  target.id,
  'es',
  jsonb_build_array(cfg.your_email),
  cfg.send_hour
from target, cfg
on conflict (hotel_id) do update set
  briefing_language = excluded.briefing_language,
  brief_recipients  = excluded.brief_recipients,
  brief_send_hour   = excluded.brief_send_hour;

-- Show what we just set, so you can eyeball it before running the cron.
select hs.hotel_id, h.name, h.timezone,
       hs.briefing_language, hs.brief_recipients, hs.brief_send_hour,
       extract(hour from (now() at time zone coalesce(h.timezone,'UTC')))::int as hotel_local_hour
from public.hotel_settings hs
join public.hotels h on h.id = hs.hotel_id
where h.pms_connected = true;
-- ^ For the cron to fire: brief_send_hour MUST equal hotel_local_hour.
