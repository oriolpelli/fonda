-- ============================================================================
-- Fonda — MEWS (PMS) credentials
--
-- Stores the per-hotel MEWS Connector API tokens, encrypted at the application
-- layer (AES-256-GCM, see lib/encryption.ts). The plaintext never touches the
-- database; only the versioned ciphertext is stored.
-- ============================================================================

alter table public.hotels
  add column mews_client_token_encrypted text,
  add column mews_access_token_encrypted text;

comment on column public.hotels.mews_client_token_encrypted is
  'AES-256-GCM ciphertext of the MEWS ClientToken. Decrypt only server-side.';
comment on column public.hotels.mews_access_token_encrypted is
  'AES-256-GCM ciphertext of the MEWS AccessToken. Decrypt only server-side.';

-- Defense in depth: although these columns hold ciphertext, clients should
-- never receive them. Revoke column-level SELECT/UPDATE from the client roles
-- so even a `select *` from an authenticated session cannot read or write the
-- tokens. Only the service_role (used by lib/supabase/admin.ts) can touch them.
--
-- NOTE: because of this, client-side reads of `hotels` must select explicit
-- columns rather than `*`.
revoke select (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;
revoke update (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;
revoke insert (mews_client_token_encrypted, mews_access_token_encrypted)
  on public.hotels from authenticated, anon;
