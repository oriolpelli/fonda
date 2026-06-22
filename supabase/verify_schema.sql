-- ============================================================================
-- Fonda — schema catch-up verification
--
-- Read-only diagnostic. Run in the Supabase SQL Editor to see which expected
-- tables / columns / functions / enums / RLS flags are missing from your
-- database (i.e. which migrations under supabase/migrations haven't been
-- applied). Anything with status <> 'ok' needs attention; rows sort missing
-- first. This script changes nothing.
-- ============================================================================

with
-- Expected tables (public schema) ------------------------------------------
expected_tables(name) as (
  values
    ('hotels'), ('users'), ('briefings'), ('emails'), ('checkin_chasers'),
    ('hotel_settings'), ('reservations'), ('customers'), ('sync_logs')
),
-- Expected columns (table, column) -----------------------------------------
expected_columns(tbl, col) as (
  values
    -- hotels (0001, 0002, 0005, 0006)
    ('hotels', 'id'), ('hotels', 'name'), ('hotels', 'rooms_count'),
    ('hotels', 'timezone'), ('hotels', 'pms_type'), ('hotels', 'pms_connected'),
    ('hotels', 'created_at'),
    ('hotels', 'mews_client_token_encrypted'),
    ('hotels', 'mews_access_token_encrypted'),
    ('hotels', 'last_synced_at'),
    ('hotels', 'apaleo_refresh_token_encrypted'),
    -- users (0001)
    ('users', 'id'), ('users', 'hotel_id'), ('users', 'email'),
    ('users', 'role'), ('users', 'created_at'),
    -- briefings (0001)
    ('briefings', 'id'), ('briefings', 'hotel_id'), ('briefings', 'content_json'),
    ('briefings', 'generated_at'), ('briefings', 'delivered_at'),
    ('briefings', 'opened_at'),
    -- emails (0001)
    ('emails', 'id'), ('emails', 'hotel_id'), ('emails', 'external_id'),
    ('emails', 'from_email'), ('emails', 'subject'), ('emails', 'body'),
    ('emails', 'classification'), ('emails', 'draft_reply'), ('emails', 'status'),
    ('emails', 'created_at'), ('emails', 'sent_at'),
    -- checkin_chasers (0001)
    ('checkin_chasers', 'id'), ('checkin_chasers', 'hotel_id'),
    ('checkin_chasers', 'reservation_id'), ('checkin_chasers', 'guest_email'),
    ('checkin_chasers', 'draft_content'), ('checkin_chasers', 'status'),
    ('checkin_chasers', 'sent_at'), ('checkin_chasers', 'created_at'),
    -- hotel_settings (0001)
    ('hotel_settings', 'id'), ('hotel_settings', 'hotel_id'),
    ('hotel_settings', 'briefing_time'), ('hotel_settings', 'briefing_language'),
    ('hotel_settings', 'gm_name'), ('hotel_settings', 'arrival_instructions'),
    ('hotel_settings', 'tone_guidelines'),
    -- reservations (0003)
    ('reservations', 'id'), ('reservations', 'hotel_id'), ('reservations', 'mews_id'),
    ('reservations', 'service_id'), ('reservations', 'group_id'),
    ('reservations', 'number'), ('reservations', 'state'),
    ('reservations', 'customer_mews_id'), ('reservations', 'requested_category_id'),
    ('reservations', 'assigned_space_id'), ('reservations', 'rate_id'),
    ('reservations', 'start_utc'), ('reservations', 'end_utc'),
    ('reservations', 'adult_count'), ('reservations', 'child_count'),
    ('reservations', 'raw'), ('reservations', 'mews_updated_utc'),
    ('reservations', 'synced_at'),
    -- customers (0003)
    ('customers', 'id'), ('customers', 'hotel_id'), ('customers', 'mews_id'),
    ('customers', 'first_name'), ('customers', 'last_name'), ('customers', 'email'),
    ('customers', 'phone'), ('customers', 'nationality_code'),
    ('customers', 'language_code'), ('customers', 'raw'),
    ('customers', 'mews_updated_utc'), ('customers', 'synced_at'),
    -- sync_logs (0005)
    ('sync_logs', 'id'), ('sync_logs', 'hotel_id'), ('sync_logs', 'status'),
    ('sync_logs', 'reservations_count'), ('sync_logs', 'customers_count'),
    ('sync_logs', 'error'), ('sync_logs', 'started_at'),
    ('sync_logs', 'finished_at'), ('sync_logs', 'created_at')
),
-- Expected functions (0001, 0004) ------------------------------------------
expected_functions(name) as (
  values ('current_hotel_id'), ('current_user_role'), ('provision_hotel')
),
-- Expected enum types (0001) -----------------------------------------------
expected_enums(name) as (
  values ('user_role'), ('email_status'), ('chaser_status')
),
-- Catalog snapshots --------------------------------------------------------
public_functions as (
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
public_enums as (
  select t.typname
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e'
),
public_rls as (
  select c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
report as (

-- Tables
select 'table' as category, e.name as object,
  case when t.table_name is null then 'MISSING' else 'ok' end as status
from expected_tables e
left join information_schema.tables t
  on t.table_schema = 'public' and t.table_name = e.name

union all
-- Columns
select 'column', e.tbl || '.' || e.col,
  case when c.column_name is null then 'MISSING' else 'ok' end
from expected_columns e
left join information_schema.columns c
  on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col

union all
-- Functions
select 'function', e.name,
  case when f.proname is null then 'MISSING' else 'ok' end
from expected_functions e
left join public_functions f on f.proname = e.name

union all
-- Enums
select 'enum', e.name,
  case when t.typname is null then 'MISSING' else 'ok' end
from expected_enums e
left join public_enums t on t.typname = e.name

union all
-- Row-Level Security enabled per table
select 'rls', e.name,
  case
    when r.relname is null then 'MISSING (table absent)'
    when not r.relrowsecurity then 'RLS DISABLED'
    else 'ok'
  end
from expected_tables e
left join public_rls r on r.relname = e.name
)
select category, object, status
from report
order by (status <> 'ok') desc, category, object;
