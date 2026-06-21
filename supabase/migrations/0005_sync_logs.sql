-- ============================================================================
-- Fonda — sync observability
--
-- Records the outcome of each PMS sync run and tracks when each hotel last
-- synced. Powers the dashboard connection-status dot and the admin raw-data
-- view.
-- ============================================================================

alter table public.hotels
  add column last_synced_at timestamptz;

comment on column public.hotels.last_synced_at is
  'Timestamp of the most recent successful PMS sync for this hotel.';

create table public.sync_logs (
  id                 uuid primary key default gen_random_uuid(),
  hotel_id           uuid not null references public.hotels (id) on delete cascade,
  status             text not null check (status in ('success', 'error')),
  reservations_count integer not null default 0,
  customers_count    integer not null default 0,
  error              text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index sync_logs_hotel_created_idx on public.sync_logs (hotel_id, created_at desc);

-- RLS: hotel members read their own sync history. Writes come from the sync job
-- via the service_role key (bypasses RLS), so no client write policies.
alter table public.sync_logs enable row level security;

create policy "sync_logs: read own hotel"
  on public.sync_logs for select to authenticated
  using (hotel_id = public.current_hotel_id());
