-- ============================================================================
-- Fonda — ensure provision_hotel exists (recovery migration)
--
-- Fixes: "Could not find the function public.provision_hotel(...) in the schema
-- cache" during onboarding. This happens when migration 0004 was never applied
-- to the database, or when PostgREST's schema cache is stale after the function
-- was created.
--
-- This migration is idempotent (CREATE OR REPLACE) — safe to run even if 0004
-- was already applied. The final NOTIFY forces PostgREST to reload its schema
-- cache so `.rpc('provision_hotel', ...)` resolves immediately.
-- ============================================================================

create or replace function public.provision_hotel(
  p_user_id    uuid,
  p_email      text,
  p_hotel_name text,
  p_rooms_count integer,
  p_timezone   text,
  p_pms_type   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
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

  insert into public.hotel_settings (hotel_id)
  values (v_hotel_id);

  return v_hotel_id;
end;
$$;

-- Only the service_role (server-side admin client) may provision.
revoke all on function
  public.provision_hotel(uuid, text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function
  public.provision_hotel(uuid, text, text, integer, text, text)
  to service_role;

-- Force PostgREST to refresh its schema cache so the RPC resolves right away.
notify pgrst, 'reload schema';
