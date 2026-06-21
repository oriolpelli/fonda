-- ============================================================================
-- Fonda — Apaleo (PMS) credentials
--
-- Apaleo connects via OAuth2 (authorization code). We persist the long-lived
-- refresh token per hotel, encrypted at the application layer (same scheme as
-- the MEWS tokens). Access tokens are short-lived and fetched on demand, so
-- they are never stored.
-- ============================================================================

alter table public.hotels
  add column apaleo_refresh_token_encrypted text;

comment on column public.hotels.apaleo_refresh_token_encrypted is
  'AES-256-GCM ciphertext of the Apaleo OAuth refresh token. Decrypt only server-side.';

-- Same defense-in-depth as the MEWS tokens: clients never receive this column.
revoke select (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke update (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;
revoke insert (apaleo_refresh_token_encrypted) on public.hotels from authenticated, anon;
