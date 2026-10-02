-- ============================================================================
-- APPLY 0032 -- AI problem reports (the "Report a problem" button)
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice. Creates one table; changes nothing else.
--
-- What it does, in plain language: keeps each "Report a problem with an AI
-- output" a hotel's team files — which item, what was wrong, an optional
-- note. Each report is also emailed to ai@fondas.app without guest details.
-- Until this is applied, the button says the report couldn't be sent.
--
-- Check it took, in the SQL editor:
--   select count(*) from pg_policies where tablename = 'ai_feedback';
--   -- expect 2
--
-- The authoritative text is supabase/migrations/0032_ai_feedback.sql.
-- ============================================================================

create table if not exists public.ai_feedback (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,
  item_type   text not null check (item_type in ('reply', 'chaser', 'brief', 'ask')),
  item_id     uuid not null,
  reason      text not null check (reason in ('wrong_fact', 'wrong_tone', 'should_not_draft', 'other')),
  note        text check (note is null or char_length(note) <= 1000),
  created_at  timestamptz not null default now()
);

create index if not exists ai_feedback_hotel_idx
  on public.ai_feedback (hotel_id, created_at desc);

alter table public.ai_feedback enable row level security;

drop policy if exists "ai_feedback: insert own" on public.ai_feedback;
create policy "ai_feedback: insert own"
  on public.ai_feedback for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );

drop policy if exists "ai_feedback: read own hotel" on public.ai_feedback;
create policy "ai_feedback: read own hotel"
  on public.ai_feedback for select to authenticated
  using (hotel_id = (select public.current_hotel_id()));

notify pgrst, 'reload schema';
