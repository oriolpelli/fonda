-- ============================================================================
-- APPLY 0014 — cron_logs table  (paste into Supabase dashboard → SQL Editor →
-- Run). Idempotent; safe to run once or re-run.
-- Deploy ORDER: run this FIRST, then deploy the B5 code.
-- ============================================================================

create table if not exists public.cron_logs (
  id         uuid primary key default gen_random_uuid(),
  job        text not null check (job in ('briefing', 'emails', 'checkin')),
  hotel_id   uuid references public.hotels (id) on delete cascade,
  status     text not null check (status in ('success', 'error')),
  message    text,
  created_at timestamptz not null default now()
);

comment on column public.cron_logs.hotel_id is
  'Nullable: a job can fail before it resolves any hotel (e.g. the hotels '
  'query itself errors). Those rows record a systemic failure and are '
  'deliberately invisible to hotel members under RLS.';
comment on column public.cron_logs.message is
  'Error message on failure; null on success.';

create index if not exists cron_logs_job_hotel_created_idx
  on public.cron_logs (job, hotel_id, created_at desc);
create index if not exists cron_logs_created_idx
  on public.cron_logs (created_at desc);

alter table public.cron_logs enable row level security;

drop policy if exists "cron_logs: read own hotel" on public.cron_logs;
create policy "cron_logs: read own hotel"
  on public.cron_logs for select to authenticated
  using (hotel_id = public.current_hotel_id());

notify pgrst, 'reload schema';

-- VERIFY — expect six rows: id, job, hotel_id, status, message, created_at
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'cron_logs'
order by ordinal_position;
