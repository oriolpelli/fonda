-- ============================================================================
-- Fondas — chat threads (APP_UX_PROPOSAL.md §4.1, §4.2)
--
-- Ask Your Hotel keeps conversations now. Until this migration a chat turn was
-- a loose row in chat_logs scoped to the hotel: there was no conversation to
-- return to, and every member of a hotel could read every other member's
-- questions.
--
-- WHY EXISTING ROWS KEEP A NULL thread_id. They are not backfilled into
-- synthetic threads. A thread is a conversation someone had, and grouping old
-- rows by hotel and time would be inventing conversations that never happened
-- — with titles taken from whichever message the guess put first. The rows stay
-- for quality review, and the RLS policy below stops them appearing in anyone's
-- thread list: `thread_id is null` matches no thread the user owns. They are
-- readable only through the service role, which is where quality review already
-- happens.
--
-- AT-REST PSEUDONYMISATION (§11 decision 6, point 2). chat_logs.content is
-- written with guest SURNAMES REDUCED TO AN INITIAL — "María Villanueva" is
-- stored as "María V." The live request to Claude keeps real names, and the GM
-- sees real names on screen; only the durable copy is reduced. Before this
-- migration's companion route change, the user's own question was stored
-- verbatim, so a question naming a guest put that guest's full name in the
-- table in plaintext. The rule lives in lib/pseudonymise.ts and is applied in
-- app/api/chat/route.ts before insert. If you add another writer to this table,
-- it applies there too.
-- ============================================================================

alter table public.chat_logs add column thread_id uuid;
alter table public.chat_logs add column user_id uuid references public.users (id);

create table public.chat_threads (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  -- Trimmed from the first user message. Null only if that trim came back empty.
  title           text,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- The thread list's only query: this user's threads, most recent first.
create index chat_threads_user_recent_idx
  on public.chat_threads (user_id, last_message_at desc);

-- Reading a thread's transcript in order.
create index chat_logs_thread_created_idx
  on public.chat_logs (thread_id, created_at);

alter table public.chat_threads enable row level security;

-- A user reads and writes only their OWN threads, and only inside their hotel.
-- Both halves matter: hotel_id alone would let colleagues read each other's
-- conversations, and user_id alone would survive a user being moved between
-- hotels. Writes still come from the chat route via the service role; these
-- policies exist so that a future client-side write cannot widen the scope.
create policy "chat_threads: read own"
  on public.chat_threads for select to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id());

create policy "chat_threads: insert own"
  on public.chat_threads for insert to authenticated
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

create policy "chat_threads: update own"
  on public.chat_threads for update to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id())
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

-- chat_logs narrows from "my hotel" to "threads I own".
--
-- This is a DELIBERATE REDUCTION in what an authenticated user can read, and it
-- is the point of the change: a GM's questions are not their colleagues' to
-- read. Rows with a null thread_id (everything written before this migration)
-- match no thread and so become unreadable through the client — see the header.
drop policy if exists "chat_logs: read own hotel" on public.chat_logs;

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
