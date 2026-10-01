-- ============================================================================
-- Fondas — AI provenance (EU AI Act Art. 50(2) evidence) — AI_ACT_PROMPTS.md A1
--
-- Every piece of text a model writes in Fondas should be able to answer, later,
-- "which model wrote this, from which prompt version, and when". These columns
-- are that record, stamped at generation time from lib/ai-provenance.ts. They
-- back three things:
--   • the machine-readable marking on outbound mail (A2) — the headers are
--     built from these columns, not recomputed at send time;
--   • `npm run verify-ai-mark` — "did Fondas write this?", answered from
--     draft_sha256 for a DPO, without anyone reading a guest's message;
--   • the AI activity log (A8).
--
-- PRIVACY — read before adding a column. None of these columns may ever hold
-- guest text, a name, an email address or a booking reference. They hold a
-- model id, a prompt version, timestamps, a hash, a boolean and an enum —
-- nothing else. draft_sha256 is constrained to 64 hex characters so that it
-- cannot become a place guest text ends up, whatever a future caller writes.
-- A SHA-256 of a draft is not reversible into the draft.
--
-- Additive only: every column is nullable and nothing is backfilled. Rows
-- written before this migration have no provenance, which is the honest
-- answer — we did not record it. In particular emails.updated_at is added
-- WITHOUT a default first, so existing rows stay NULL rather than all claiming
-- the moment this migration ran; the default applies to new rows only.
--
-- There is no updated_at trigger anywhere in this schema; the app sets
-- updated_at explicitly on every write (as guest_profiles already does). This
-- follows that pattern rather than inventing one.
--
-- RLS is unchanged: every table touched here already has its policies, and new
-- columns inherit them. Writes come from the same server code as today.
--
-- Re-runnable: every statement skips work already done.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- emails — the guest reply drafts (and drafts started from Ask)
-- ---------------------------------------------------------------------------
alter table public.emails
  add column if not exists draft_model          text,
  add column if not exists draft_prompt_version text,
  add column if not exists draft_generated_at   timestamptz,
  add column if not exists draft_sha256         text,
  add column if not exists draft_edited         boolean,
  add column if not exists sent_via             text,
  add column if not exists updated_at           timestamptz;

alter table public.emails alter column updated_at set default now();

alter table public.emails drop constraint if exists emails_sent_via_check;
alter table public.emails add constraint emails_sent_via_check
  check (sent_via in ('single', 'bulk'));

alter table public.emails drop constraint if exists emails_draft_sha256_check;
alter table public.emails add constraint emails_draft_sha256_check
  check (draft_sha256 ~ '^[0-9a-f]{64}$');

comment on column public.emails.draft_model is
  'Model id that wrote draft_reply (lib/ai-provenance.ts AI_MODELS). Null for '
  'rows drafted before migration 0025, or never drafted.';
comment on column public.emails.draft_prompt_version is
  'Dated prompt version the draft was written from (PROMPT_VERSIONS).';
comment on column public.emails.draft_generated_at is
  'When the model returned the draft.';
comment on column public.emails.draft_sha256 is
  'Hex SHA-256 of draft_reply exactly as stored. Lets verify-ai-mark answer '
  '"did Fondas write this?" without reading message text. Never guest text.';
comment on column public.emails.draft_edited is
  'Set on send: true when the GM changed the draft before sending (edit bucket '
  'minor or major), false when sent as drafted, null when there was no draft.';
comment on column public.emails.sent_via is
  'single = sent one at a time from the editor; bulk = sent by "approve all".';
comment on column public.emails.updated_at is
  'Last status change (sent, flagged, ignored, processed). Null on rows last '
  'touched before migration 0025.';

create index if not exists emails_draft_sha256_idx
  on public.emails (draft_sha256) where draft_sha256 is not null;

-- ---------------------------------------------------------------------------
-- checkin_chasers — arrival-time request drafts
-- ---------------------------------------------------------------------------
alter table public.checkin_chasers
  add column if not exists draft_model          text,
  add column if not exists draft_prompt_version text,
  add column if not exists draft_generated_at   timestamptz,
  add column if not exists draft_sha256         text,
  add column if not exists draft_edited         boolean,
  add column if not exists sent_via             text;

alter table public.checkin_chasers drop constraint if exists checkin_chasers_sent_via_check;
alter table public.checkin_chasers add constraint checkin_chasers_sent_via_check
  check (sent_via in ('single', 'bulk'));

alter table public.checkin_chasers drop constraint if exists checkin_chasers_draft_sha256_check;
alter table public.checkin_chasers add constraint checkin_chasers_draft_sha256_check
  check (draft_sha256 ~ '^[0-9a-f]{64}$');

comment on column public.checkin_chasers.draft_model is
  'Model id that wrote draft_content (lib/ai-provenance.ts AI_MODELS).';
comment on column public.checkin_chasers.draft_sha256 is
  'Hex SHA-256 of draft_content exactly as stored. Never guest text.';
comment on column public.checkin_chasers.draft_edited is
  'Set on send: true when edited before sending, false when sent as drafted.';
comment on column public.checkin_chasers.sent_via is
  'single = sent one at a time; bulk = sent by "approve all".';

create index if not exists checkin_chasers_draft_sha256_idx
  on public.checkin_chasers (draft_sha256) where draft_sha256 is not null;

-- ---------------------------------------------------------------------------
-- briefings — the morning brief (generated_at already exists)
-- ---------------------------------------------------------------------------
alter table public.briefings
  add column if not exists model          text,
  add column if not exists prompt_version text;

comment on column public.briefings.model is
  'Model id that wrote the brief. Null on failed runs and pre-0025 briefs.';

-- ---------------------------------------------------------------------------
-- guest_profiles — inferred trip purpose / occasion / preferences
-- (inferred_at already exists)
-- ---------------------------------------------------------------------------
alter table public.guest_profiles
  add column if not exists inference_model          text,
  add column if not exists inference_prompt_version text;

comment on column public.guest_profiles.inference_model is
  'Model id behind the most recent inference run (see inferred_at). Staff-'
  'entered values are never written by inference; this describes the rest.';

-- Who set each of the two tags. Without these, the guest record could only
-- guess from inferred_at, and labelled a tag a GM picked by hand as "Inferred
-- by Fondas AI" — a false AI claim (A3). 'staff' from setGuestTag, 'inferred'
-- when inference fills a blank. Null on rows written before 0025, which the
-- UI shows with no attribution rather than a guess.
alter table public.guest_profiles
  add column if not exists trip_purpose_source text,
  add column if not exists occasion_source     text;

alter table public.guest_profiles drop constraint if exists guest_profiles_trip_purpose_source_check;
alter table public.guest_profiles add constraint guest_profiles_trip_purpose_source_check
  check (trip_purpose_source in ('staff', 'inferred'));
alter table public.guest_profiles drop constraint if exists guest_profiles_occasion_source_check;
alter table public.guest_profiles add constraint guest_profiles_occasion_source_check
  check (occasion_source in ('staff', 'inferred'));

-- ---------------------------------------------------------------------------
-- chat_logs — Ask. Assistant rows only; user rows stay null.
-- ---------------------------------------------------------------------------
alter table public.chat_logs
  add column if not exists model text;

comment on column public.chat_logs.model is
  'Model id that wrote this answer. Set on assistant rows only.';

-- ---------------------------------------------------------------------------
-- hotel_settings — the review summary written in Settings. Not in the A1
-- prompt's list, but it is model-written text stored for later use (it feeds
-- the house profile every draft is written with), so it gets the same record.
-- ---------------------------------------------------------------------------
alter table public.hotel_settings
  add column if not exists review_summary_model          text,
  add column if not exists review_summary_prompt_version text,
  add column if not exists review_summary_generated_at   timestamptz;

comment on column public.hotel_settings.review_summary_model is
  'Model id that wrote review_summary. Null when the summary is empty or '
  'predates migration 0025.';

-- ---------------------------------------------------------------------------
-- Write-protection: the provenance on outbound text is the SERVER's record.
--
-- The existing RLS policies let a signed-in hotel user update any column of
-- their hotel's emails, chasers and briefings ("triage", "mark opened") — and
-- Postgres can't narrow that per column while the table-level grant stands.
-- Without this guard, anyone with a session could rewrite draft_edited,
-- sent_via or draft_model on their own rows through the REST API, which is
-- the AI Act evidence and also what the X-Fondas-AI header is built from.
--
-- So: for the `authenticated` and `anon` roles, these columns cannot be set on
-- insert or changed on update. The server writes them with the service role,
-- which this does not touch, and every other column behaves exactly as before.
-- Column names are passed as trigger arguments so one function serves all
-- three tables.
-- ---------------------------------------------------------------------------
create or replace function public.guard_ai_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
  new_row jsonb := to_jsonb(new);
  old_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  foreach col in array tg_argv loop
    if tg_op = 'INSERT' then
      if coalesce(new_row -> col, 'null'::jsonb) <> 'null'::jsonb then
        raise exception using
          errcode = '42501',
          message = format('%s.%s is written by the server only (AI provenance)', tg_table_name, col);
      end if;
    elsif (new_row -> col) is distinct from (old_row -> col) then
      raise exception using
        errcode = '42501',
        message = format('%s.%s is written by the server only (AI provenance)', tg_table_name, col);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists emails_guard_ai_provenance on public.emails;
create trigger emails_guard_ai_provenance
  before insert or update on public.emails
  for each row execute function public.guard_ai_provenance(
    'draft_model', 'draft_prompt_version', 'draft_generated_at',
    'draft_sha256', 'draft_edited', 'sent_via'
  );

drop trigger if exists checkin_chasers_guard_ai_provenance on public.checkin_chasers;
create trigger checkin_chasers_guard_ai_provenance
  before insert or update on public.checkin_chasers
  for each row execute function public.guard_ai_provenance(
    'draft_model', 'draft_prompt_version', 'draft_generated_at',
    'draft_sha256', 'draft_edited', 'sent_via'
  );

drop trigger if exists briefings_guard_ai_provenance on public.briefings;
create trigger briefings_guard_ai_provenance
  before insert or update on public.briefings
  for each row execute function public.guard_ai_provenance(
    'model', 'prompt_version'
  );

notify pgrst, 'reload schema';
