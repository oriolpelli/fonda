-- ============================================================================
-- APPLY 0017 — unsubscribe support for the newsletter list
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice: every statement skips work already done.
--
-- What it does: adds the column that stores the SHA-256 of a subscriber's
-- current unsubscribe token. The raw token lives only inside the link in each
-- newsletter email, so a dump of this table can't be used to unsubscribe
-- anyone -- exactly the same design as the confirmation token in 0016.
-- ============================================================================

alter table public.newsletter_subscribers
  add column if not exists unsubscribe_token_hash text;

comment on column public.newsletter_subscribers.unsubscribe_token_hash is
  'SHA-256 of the current unsubscribe token, never the token itself. Set when a '
  'newsletter is sent to this row; cleared the moment the person unsubscribes.';

create index if not exists newsletter_subscribers_unsub_token_idx
  on public.newsletter_subscribers (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;

notify pgrst, 'reload schema';

-- ============================================================================
-- CHECK -- this should return one row reading:  unsubscribe_token_hash
-- ============================================================================
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'newsletter_subscribers'
  and column_name = 'unsubscribe_token_hash';
