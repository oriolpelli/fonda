-- ============================================================================
-- Fonda — account-wide default language
--
-- Until now the UI language existed only in the URL (`/en`, `/es`, `/ca`),
-- resolved per request from the cookie / Accept-Language / geo. Nothing was
-- stored, so a Spanish GM had no way to say "this account is Spanish" — they
-- re-derived it on every device. `briefing_language` was the only persisted
-- language, and it means something narrower: the language Claude *writes* in.
--
-- Three distinct things, now that this column exists:
--   • UI locale          — the /[lang] segment. What the interface renders in.
--   • default_locale     — THIS. The account's stored preference. Seeds the UI
--                          locale at login, and seeds briefing_language for
--                          newly provisioned hotels.
--   • briefing_language  — the language of generated content (morning brief,
--                          chaser drafts, chat answers). Seeded from
--                          default_locale at provisioning, then an independent
--                          override: an English-speaking GM at a Spanish hotel
--                          may legitimately want the UI in English and the
--                          guest-facing drafts in Spanish.
--
-- RLS: none needed. `hotel_settings` already carries the per-hotel policies
-- from 0001 (read/insert/update where hotel_id = current_hotel_id()), and a new
-- column on an existing table inherits them — there is no way to read this
-- column without passing the row policy.
-- ============================================================================

alter table public.hotel_settings
  add column if not exists default_locale text not null default 'en';

-- Added separately and guarded so re-running is safe (ADD CONSTRAINT has no
-- IF NOT EXISTS in the Postgres versions Supabase ships).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hotel_settings_default_locale_check'
      and conrelid = 'public.hotel_settings'::regclass
  ) then
    alter table public.hotel_settings
      add constraint hotel_settings_default_locale_check
      check (default_locale in ('en', 'es', 'ca'));
  end if;
end $$;

comment on column public.hotel_settings.default_locale is
  'The account''s preferred UI language (en/es/ca). Seeds the interface locale '
  'at login and seeds briefing_language when a hotel is provisioned. Distinct '
  'from briefing_language, which is the language generated content is written '
  'in and remains an independent override.';

-- ---------------------------------------------------------------------------
-- provision_hotel gains the locale.
--
-- The parameter list changes, so this is a DROP + CREATE rather than a plain
-- CREATE OR REPLACE (Postgres treats a different signature as an overload, and
-- leaving both would let PostgREST resolve either one). `p_locale` carries a
-- DEFAULT so a six-argument call still resolves to this function — that keeps
-- the deploy window safe if the migration lands before the new app code.
-- ---------------------------------------------------------------------------
drop function if exists public.provision_hotel(uuid, text, text, integer, text, text);

create or replace function public.provision_hotel(
  p_user_id     uuid,
  p_email       text,
  p_hotel_name  text,
  p_rooms_count integer,
  p_timezone    text,
  p_pms_type    text,
  p_locale      text default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
  v_locale   text;
begin
  -- Never trust the caller's locale: fall back rather than raise, so a bad
  -- value can't strand someone mid-signup with no hotel.
  v_locale := case when p_locale in ('en', 'es', 'ca') then p_locale else 'en' end;

  -- Guard against double-provisioning (and avoid leaving an orphan hotel).
  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'User % is already provisioned', p_user_id
      using errcode = 'unique_violation';
  end if;

  insert into public.hotels (name, rooms_count, timezone, pms_type)
  values (p_hotel_name, p_rooms_count, p_timezone, p_pms_type)
  returning id into v_hotel_id;

  insert into public.users (id, hotel_id, email, role)
  values (p_user_id, v_hotel_id, p_email, 'owner');

  -- Both languages start from the one answer given during onboarding. They can
  -- diverge afterwards; this only decides where they begin.
  insert into public.hotel_settings (hotel_id, default_locale, briefing_language)
  values (v_hotel_id, v_locale, v_locale);

  return v_hotel_id;
end;
$$;

-- Only the service_role (server-side admin client) may provision — a client
-- that could call this could attach itself to any hotel.
revoke all on function
  public.provision_hotel(uuid, text, text, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function
  public.provision_hotel(uuid, text, text, integer, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
