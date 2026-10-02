-- ============================================================================
-- Fondas — AI problem reports — AI_ACT_PROMPTS.md A8
--
-- "Report a problem with an AI output": under every draft, every Ask answer
-- and every item on AI activity (/dashboard/oversight/ai). This table is the
-- AI incident channel's record; each report is also emailed to
-- COMPANY.aiContact, without any guest data (lib/ai-feedback.ts).
--
--   item_type  'reply' (emails.id) · 'chaser' (checkin_chasers.id) ·
--              'brief' (briefings.id) · 'ask' (chat_threads.id — the
--              conversation; Ask's turns carry no id on the client)
--   reason     'wrong_fact' · 'wrong_tone' · 'should_not_draft' · 'other'
--   note       the reporter's own words, optional, ≤ 1000 characters. Kept
--              here only: the email says how long it is, never what it says,
--              because a note can quote a guest
--
-- RLS: a hotel member files reports for their own hotel as themselves, and
-- reads their hotel's reports. No updates and no deletes from clients. The
-- AI activity page never shows who filed what (ROADMAP §5 #10).
-- Additive; the app runs without it (the report button says it failed).
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
