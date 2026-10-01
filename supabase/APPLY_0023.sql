-- ============================================================================
-- APPLY 0023 -- chat threads
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice: every statement skips work already done.
--
-- What it does, in plain language: Ask keeps conversations. Each question now
-- belongs to a thread owned by one user, and a GM can only read their own
-- threads -- not their colleagues' questions. Without this, the chat screen
-- fails, because the code already expects these tables.
--
-- One deliberate narrowing: chat rows written before today have no thread, so
-- after this they stop showing in the app (they stay in the table for quality
-- review). That is intended -- see migrations/0023_chat_threads.sql.
--
-- The authoritative text is supabase/migrations/0023_chat_threads.sql; this is
-- the same change written to be re-runnable. After running it, check from your
-- own terminal with:   npm run verify-migrations
-- ============================================================================

alter table public.chat_logs add column if not exists thread_id uuid;
alter table public.chat_logs add column if not exists user_id uuid references public.users (id);

create table if not exists public.chat_threads (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  title           text,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists chat_threads_user_recent_idx
  on public.chat_threads (user_id, last_message_at desc);

create index if not exists chat_logs_thread_created_idx
  on public.chat_logs (thread_id, created_at);

alter table public.chat_threads enable row level security;

drop policy if exists "chat_threads: read own" on public.chat_threads;
create policy "chat_threads: read own"
  on public.chat_threads for select to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "chat_threads: insert own" on public.chat_threads;
create policy "chat_threads: insert own"
  on public.chat_threads for insert to authenticated
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "chat_threads: update own" on public.chat_threads;
create policy "chat_threads: update own"
  on public.chat_threads for update to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id())
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "chat_logs: read own hotel" on public.chat_logs;
drop policy if exists "chat_logs: read own threads" on public.chat_logs;
create policy "chat_logs: read own threads"
  on public.chat_logs for select to authenticated
  using (
    exists (
      select 1
      from public.chat_threads t
      where t.id = public.chat_logs.thread_id
        and t.user_id = auth.uid()
        and t.hotel_id = public.current_hotel_id()
    )
  );

notify pgrst, 'reload schema';

-- ============================================================================
-- CHECK -- should return three policies on chat_threads and one on chat_logs
-- ("chat_logs: read own threads"), and no "chat_logs: read own hotel".
-- ============================================================================
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('chat_threads', 'chat_logs')
order by tablename, policyname;
