-- ============================================================================
-- Fonda — newsletter subscribers (double opt-in)
--
-- Backs the footer capture on the marketing site. Every address here is
-- marketing PII belonging to a member of the public, not to a hotel, so the
-- per-hotel RLS pattern used everywhere else does NOT apply: there is no
-- hotel_id to scope by, and no signed-in user at the moment of capture.
--
-- The protection is stricter instead — see the RLS block at the bottom: RLS is
-- enabled and NO policy is created, which under Postgres means every request
-- carrying the anon or authenticated key is denied. The only way in is the
-- service_role key, which bypasses RLS, used exclusively from the server
-- action in app/[lang]/newsletter/actions.ts. Do not add a policy here to make
-- something "work" — if a client needs this data, the answer is a server
-- action, not a policy.
--
-- Double opt-in: a row is created as 'pending' and only becomes 'subscribed'
-- when the recipient acts on the link in the confirmation email. A pending row
-- is NOT consent and must never receive a marketing send.
-- ============================================================================

create table public.newsletter_subscribers (
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
comment on column public.newsletter_subscribers.email is
  'Stored lower-cased and trimmed by the server action. The unique index is on '
  'lower(email) so casing can never create a duplicate subscription.';
comment on column public.newsletter_subscribers.status is
  'pending = confirmation email sent, no consent yet — NEVER send marketing to '
  'a pending row. subscribed = confirmed via the emailed link. unsubscribed = '
  'opted out; keep the row so a later re-subscribe is still auditable.';
comment on column public.newsletter_subscribers.locale is
  'Language the address subscribed in. Determines the language of the '
  'confirmation email and of any later send.';
comment on column public.newsletter_subscribers.confirm_token_hash is
  'SHA-256 of the confirmation token, never the token itself. The raw token '
  'exists only in the emailed link, so a leak of this table cannot be used to '
  'confirm anyone. Cleared once confirmed.';
comment on column public.newsletter_subscribers.confirm_sent_at is
  'When the last confirmation email went out. Used to rate-limit resends, so '
  'the public form cannot be used to mail-bomb an address.';

-- One subscription per address regardless of casing.
create unique index newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

-- Confirmation lookups are by token hash.
create index newsletter_subscribers_token_idx
  on public.newsletter_subscribers (confirm_token_hash)
  where confirm_token_hash is not null;

-- RLS: enabled with NO policies — a deliberate deny-all for both the anon and
-- the authenticated key. Reads and writes happen only through the server
-- action using the service_role key. See the header comment before changing.
alter table public.newsletter_subscribers enable row level security;

notify pgrst, 'reload schema';
