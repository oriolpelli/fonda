-- ============================================================================
-- Fonda — cron observability
--
-- Records the outcome of each scheduled job run, per hotel. The sync job
-- already has sync_logs; briefing/emails/checkin previously persisted nothing,
-- so a 3am failure only existed in that invocation's HTTP response and was
-- gone by morning. This table is what scripts/reliability-check.ts queries to
-- answer "did anything fail overnight?".
-- ============================================================================

create table public.cron_logs (
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

create index cron_logs_job_hotel_created_idx on public.cron_logs (job, hotel_id, created_at desc);
create index cron_logs_created_idx on public.cron_logs (created_at desc);

-- RLS: hotel members read their own job history. Writes come from the cron
-- routes via the service_role key (bypasses RLS), so no client write policies.
alter table public.cron_logs enable row level security;

create policy "cron_logs: read own hotel"
  on public.cron_logs for select to authenticated
  using (hotel_id = public.current_hotel_id());

notify pgrst, 'reload schema';
