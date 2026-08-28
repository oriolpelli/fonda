-- ============================================================================
-- Fonda — draft-acceptance measurement (B12/B16)
--
-- The PMF question this table exists to answer: when Fondas drafts a reply,
-- does the GM send it? PostHog carries the same events for exploration, but
-- the number we steer the company by should not live only in a third party's
-- funnel — this table is the durable copy, queryable per hotel over any date
-- range, and the source for the rolling acceptance rate.
--
-- PRIVACY — read before adding a column. Rows here are measurements, not
-- records of a conversation. There is deliberately NO message text, NO guest
-- email, NO subject, and NO foreign key to `emails` or `checkin_chasers`:
-- without a join path back to a guest, this table cannot become a shadow copy
-- of guest data no matter who queries it. That property is what the privacy
-- policy's "analytics are aggregate" claim rests on. Keep it.
-- ============================================================================

create table if not exists public.draft_edit_events (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels (id) on delete cascade,
  surface        text not null check (surface in ('email_reply', 'checkin_chaser')),
  edit_bucket    text not null check (edit_bucket in ('none', 'minor', 'major')),
  similarity_pct smallint not null check (similarity_pct between 0 and 100),
  bulk           boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table public.draft_edit_events is
  'One row per draft actually sent, recording how much it was edited first. '
  'Aggregate measurement only: no message content, no guest identifiers, and '
  'no foreign key back to the email or chaser it describes.';
comment on column public.draft_edit_events.edit_bucket is
  'none = sent verbatim; minor = >=90% of the draft survived; major = rewritten.';
comment on column public.draft_edit_events.bulk is
  'True when sent through "approve all", where the GM cannot edit — these are '
  'always bucket "none" and would flatter the rate if counted as considered '
  'approvals, so the rollup reports them separately.';

create index if not exists draft_edit_events_hotel_created_idx
  on public.draft_edit_events (hotel_id, created_at desc);

-- RLS: hotel members read their own measurements; nothing else. Writes come
-- from server actions via the service_role key (which bypasses RLS), so there
-- are deliberately no insert/update/delete policies — a client must not be
-- able to manufacture or erase its own acceptance numbers.
alter table public.draft_edit_events enable row level security;

drop policy if exists "draft_edit_events: read own hotel" on public.draft_edit_events;
create policy "draft_edit_events: read own hotel"
  on public.draft_edit_events for select to authenticated
  using (hotel_id = public.current_hotel_id());

-- ---------------------------------------------------------------------------
-- The rollup.
--
-- Both functions are SECURITY INVOKER, so RLS still applies: an authenticated
-- GM asking for another hotel's id gets zeros, not an error and not data. The
-- service_role key bypasses RLS as everywhere else, which is what lets an
-- internal dashboard read across hotels.
--
-- "Accepted" = sent with no more than a minor edit. That is the definition of
-- the PMF metric; if it changes, change it here so every caller moves at once.
-- ---------------------------------------------------------------------------

create or replace function public.draft_acceptance_summary(
  p_hotel_id uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
returns table (
  total                       bigint,
  accepted                    bigint,
  none_count                  bigint,
  minor_count                 bigint,
  major_count                 bigint,
  bulk_count                  bigint,
  considered_total            bigint,
  considered_accepted         bigint,
  acceptance_rate             numeric,
  considered_acceptance_rate  numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)                                                as total,
    count(*) filter (where edit_bucket in ('none','minor'))  as accepted,
    count(*) filter (where edit_bucket = 'none')            as none_count,
    count(*) filter (where edit_bucket = 'minor')           as minor_count,
    count(*) filter (where edit_bucket = 'major')           as major_count,
    count(*) filter (where bulk)                            as bulk_count,
    count(*) filter (where not bulk)                        as considered_total,
    count(*) filter (where not bulk and edit_bucket in ('none','minor'))
                                                            as considered_accepted,
    -- Null rather than 0 when there is nothing to measure: an empty week is
    -- "we don't know yet", and charting it as a 0% acceptance rate would be
    -- a lie in the most demoralising direction.
    case when count(*) = 0 then null
         else round(
           (count(*) filter (where edit_bucket in ('none','minor')))::numeric
             / (count(*))::numeric, 4)
    end                                                     as acceptance_rate,
    -- The honest one. A bulk "approve all" send is recorded as an unedited
    -- send because there is no editor in that path -- which means a hotel that
    -- lives on the approve-all button would read as ~100% acceptance while
    -- telling us nothing about draft quality. This rate counts only sends the
    -- GM opened and could have changed, and is the number to judge the product
    -- by. Read the two together: a wide gap between them means the hotel is
    -- approving in bulk, which is its own (good) signal, but not this one.
    case when count(*) filter (where not bulk) = 0 then null
         else round(
           (count(*) filter (where not bulk and edit_bucket in ('none','minor')))::numeric
             / (count(*) filter (where not bulk))::numeric, 4)
    end                                                     as considered_acceptance_rate
  from public.draft_edit_events
  where hotel_id = p_hotel_id
    and created_at >= p_from
    and created_at < p_to;
$$;

-- Per-day acceptance with a trailing window, for plotting the trend.
-- Every day in the range appears, including ones with no sends (rate null),
-- so a gap in the data reads as a gap rather than a dip.
create or replace function public.draft_acceptance_rolling(
  p_hotel_id    uuid,
  p_from        timestamptz,
  p_to          timestamptz,
  p_window_days int default 7
)
returns table (
  day             date,
  day_total       bigint,
  day_accepted    bigint,
  window_total    bigint,
  window_accepted bigint,
  acceptance_rate numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select generate_series(p_from::date, (p_to::date - 1), interval '1 day')::date as day
  ),
  per_day as (
    select
      created_at::date                                       as day,
      count(*)                                               as day_total,
      count(*) filter (where edit_bucket in ('none','minor')) as day_accepted
    from public.draft_edit_events
    where hotel_id = p_hotel_id
      and created_at >= (p_from - make_interval(days => p_window_days))
      and created_at < p_to
    group by 1
  ),
  joined as (
    select
      d.day,
      coalesce(p.day_total, 0)    as day_total,
      coalesce(p.day_accepted, 0) as day_accepted
    from days d
    left join per_day p on p.day = d.day
  )
  select
    j.day,
    j.day_total,
    j.day_accepted,
    w.window_total,
    w.window_accepted,
    case when w.window_total = 0 then null
         else round(w.window_accepted::numeric / w.window_total::numeric, 4)
    end as acceptance_rate
  from joined j
  cross join lateral (
    select
      coalesce(sum(p.day_total), 0)    as window_total,
      coalesce(sum(p.day_accepted), 0) as window_accepted
    from per_day p
    where p.day <= j.day
      and p.day > j.day - p_window_days
  ) w
  order by j.day;
$$;

revoke all on function public.draft_acceptance_summary(uuid, timestamptz, timestamptz) from public;
revoke all on function public.draft_acceptance_rolling(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.draft_acceptance_summary(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.draft_acceptance_rolling(uuid, timestamptz, timestamptz, int) to authenticated;

notify pgrst, 'reload schema';
