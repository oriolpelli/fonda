-- ============================================================================
-- APPLY 0031 -- the AI literacy record (EU AI Act Art. 4)
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice. Creates one table; changes nothing else.
--
-- What it does, in plain language: keeps a note each time someone on a
-- hotel's team finishes (or skips) the five "Working with Fondas AI" cards,
-- so the hotel can show it helped its staff understand the AI it uses. Only
-- who, which version and when — no scores.
-- Until this is applied the cards aren't shown and the record is empty.
--
-- Check it took, in the SQL editor:
--   select count(*) from pg_policies where tablename = 'ai_literacy_acks';
--   -- expect 2
--   select count(*) from pg_trigger where tgname = 'ai_literacy_acks_stamp';
--   -- expect 1
--
-- The authoritative text is supabase/migrations/0031_ai_literacy_acks.sql.
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
