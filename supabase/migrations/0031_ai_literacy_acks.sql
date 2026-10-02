-- ============================================================================
-- Fondas — AI literacy record (EU AI Act Art. 4) — AI_ACT_PROMPTS.md A6
--
-- Art. 4 (as amended 27 Jul 2026): providers AND deployers of AI systems
-- "take measures to support" AI literacy among the staff who use them. Hotels
-- are deployers. Fondas gives them the measure — five short cards, "Working
-- with Fondas AI", shown once to each person after they sign in — and this
-- table is the evidence: who completed which version, and when.
--
-- COMPLETION ONLY. One row per time a person finished (or skipped) the cards:
-- no score, no time spent per card, no ranking. Evaluating or monitoring
-- individual staff is Annex III point 4 (ROADMAP §5 #10); this records that
-- the measure was offered and taken, and nothing about how anyone did.
--
--   status        'completed' — read to the end; 'skipped' — closed early,
--                 recorded so the cards aren't forced on them twice. Only
--                 'completed' counts as the Art. 4 record.
--   completed_at  set for 'completed' only
--   version       the cards' version (lib/ai-literacy.ts). A new version is
--                 shown to everyone again
--
-- RLS: a person inserts and reads their own rows; the hotel's owner and
-- managers read every row of their hotel (the record, and its CSV). No
-- updates and no deletes from clients — a record you can edit isn't one —
-- and the timestamps are set by a trigger, not by whoever inserts.
-- A person's rows go when their user does (on delete cascade): the record is
-- of the team as it is, and a leaver's training is not kept about them.
-- Additive; the app runs without it (the cards simply aren't shown).
-- ============================================================================

create table if not exists public.ai_literacy_acks (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  version       text not null,
  status        text not null check (status in ('completed', 'skipped')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null))
);

create index if not exists ai_literacy_acks_user_idx
  on public.ai_literacy_acks (user_id, version);
create index if not exists ai_literacy_acks_hotel_idx
  on public.ai_literacy_acks (hotel_id, created_at desc);

alter table public.ai_literacy_acks enable row level security;

drop policy if exists "ai_literacy_acks: insert own" on public.ai_literacy_acks;
create policy "ai_literacy_acks: insert own"
  on public.ai_literacy_acks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );

drop policy if exists "ai_literacy_acks: read own or as manager" on public.ai_literacy_acks;
create policy "ai_literacy_acks: read own or as manager"
  on public.ai_literacy_acks for select to authenticated
  using (
    hotel_id = (select public.current_hotel_id())
    and (
      user_id = (select auth.uid())
      or (select public.current_user_role()) in ('owner', 'manager')
    )
  );

-- The record's times are the database's, never the client's: a person can
-- only say THAT they finished, not WHEN (no backdating the evidence).
create or replace function public.ai_literacy_acks_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := now();
  new.completed_at := case when new.status = 'completed' then now() else null end;
  return new;
end;
$$;

drop trigger if exists ai_literacy_acks_stamp on public.ai_literacy_acks;
create trigger ai_literacy_acks_stamp
  before insert on public.ai_literacy_acks
  for each row execute function public.ai_literacy_acks_stamp();

notify pgrst, 'reload schema';
