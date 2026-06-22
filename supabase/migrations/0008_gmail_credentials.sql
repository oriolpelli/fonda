-- ============================================================================
-- Fonda — Gmail (inbox) credentials
--
-- The hotel connects their Gmail inbox via OAuth2. We persist the long-lived
-- refresh token (encrypted, same scheme as the PMS tokens) plus the connected
-- email address. Access tokens are short-lived and fetched on demand.
-- ============================================================================

alter table public.hotels
  add column gmail_refresh_token_encrypted text,
  add column gmail_email text;

comment on column public.hotels.gmail_refresh_token_encrypted is
  'AES-256-GCM ciphertext of the Gmail OAuth refresh token. Decrypt only server-side.';
comment on column public.hotels.gmail_email is
  'The connected Gmail address (safe to show to hotel members).';

-- The refresh token never reaches the client; only service_role can read it.
-- gmail_email is intentionally left readable for the connection UI.
revoke select (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke update (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke insert (gmail_refresh_token_encrypted) on public.hotels from authenticated, anon;
