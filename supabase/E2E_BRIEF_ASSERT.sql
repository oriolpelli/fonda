-- ============================================================================
-- E2E BRIEF ASSERT — run in Supabase SQL Editor (DEV) AFTER the two curl calls.
-- Acceptance: exactly ONE delivered briefing row for the dev hotel today.
-- ============================================================================

with target as (
  select id, timezone from public.hotels where pms_connected = true
  order by created_at asc limit 1
)
select
  count(*) filter (
    where b.delivered_at is not null
      and (b.generated_at at time zone coalesce(t.timezone,'UTC'))::date
          = (now() at time zone coalesce(t.timezone,'UTC'))::date
  ) as delivered_today,   -- EXPECT 1
  count(*) filter (where b.content_json ? 'error') as error_rows  -- EXPECT 0
from public.briefings b
join target t on t.id = b.hotel_id;

-- Detail view (optional): see today's rows for the dev hotel.
with target as (
  select id, timezone from public.hotels where pms_connected = true
  order by created_at asc limit 1
)
select b.id, b.generated_at, b.delivered_at,
       (b.content_json ? 'error') as is_error
from public.briefings b
join target t on t.id = b.hotel_id
where (b.generated_at at time zone coalesce(t.timezone,'UTC'))::date
      = (now() at time zone coalesce(t.timezone,'UTC'))::date
order by b.generated_at desc;
