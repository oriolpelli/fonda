-- ============================================================================
-- APPLY 0016 — the newsletter list behind the footer sign-up
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice: every statement skips work already done.
--
-- What it does, in plain language: the "Product notes, once a month" box in
-- the website footer used to be a dummy — you could type an address into it
-- and nothing happened. This creates the list it now writes to.
--
-- How the list works. When someone types their address, they are NOT
-- subscribed. They are stored as "pending" and sent an email asking them to
-- confirm. Only when they act on that email do they become "subscribed". This
-- is called double opt-in and it is what makes the list lawful to email under
-- EU rules — it proves the person asked, rather than someone typing a rival's
-- address into your form.
--
-- Who can see it. Nobody, through the website. This table is locked so that
-- neither a logged-out visitor nor a logged-in hotel can read a single row.
-- Only Fondas' own server code can touch it. That is different from every
-- other table, which hotels can read their own slice of — here there is no
-- hotel involved, these are members of the public.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  status             text not null default 'pending'
                       check (status in ('pending', 'subscribed', 'unsubscribed')),
  locale             text not null default 'en'
                       check (locale in ('en', 'es', 'ca')),
  confirm_token_hash text,
  confirm_sent_at    timestamptz,
  confirmed_at       timestamptz,
  unsubscribed_at    timestamptz,
  created_at         timestamptz not null default now()
);

comment on table public.newsletter_subscribers is
  'Marketing newsletter list, double opt-in. Public PII: no hotel owns these '
  'rows, so RLS denies all client access and only the service_role key writes.';
comment on column public.newsletter_subscribers.status is
  'pending = confirmation email sent, no consent yet — NEVER send marketing to '
  'a pending row. subscribed = confirmed via the emailed link. unsubscribed = '
  'opted out; keep the row so a later re-subscribe is still auditable.';
comment on column public.newsletter_subscribers.confirm_token_hash is
  'SHA-256 of the confirmation token, never the token itself. The raw token '
  'exists only in the emailed link, so a leak of this table cannot be used to '
  'confirm anyone. Cleared once confirmed.';

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_token_idx
  on public.newsletter_subscribers (confirm_token_hash)
  where confirm_token_hash is not null;

alter table public.newsletter_subscribers enable row level security;

notify pgrst, 'reload schema';

-- ============================================================================
-- CHECK — this should return one row, reading:
--   newsletter_subscribers | true | 0
-- meaning: the table exists, it is locked down (RLS on), and it has no
-- policies, so no website visitor can read it.
-- ============================================================================
select
  c.relname                             as table_name,
  c.relrowsecurity                      as rls_enabled,
  (select count(*) from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = 'newsletter_subscribers') as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'newsletter_subscribers';
