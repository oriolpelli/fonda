-- ============================================================================
-- Fondas — speed pass C (1 Oct 2026)
--
-- Speed pass S3. Four additive columns and ten policy rewrites. No table is
-- created or dropped, no row is changed or removed, and no policy admits or
-- refuses anyone it didn't before. The app runs with or without this
-- migration: every use of a new column checks that the column exists
-- (lib/schema-features.ts) and falls back to the old behaviour without it.
--
-- 1. reservations.content_hash, customers.content_hash
--    The PMS sync (lib/mews-sync.ts) rewrote every reservation in today ±14
--    days, and every guest profile they reference, every 15 minutes, with
--    the full PMS payload, whether anything had changed or not. In
--    production that was 97% of all database time (Supabase → Query
--    Performance, 1 Oct). On a 0.5 GB instance it is what sends the disk to
--    ~90% I/O wait every quarter of an hour, and every dashboard read waits
--    behind it. The sync now stores a SHA-256 of each row's content here,
--    reads the stored hashes back, and writes only rows that are new or
--    changed. NULL until a row's first write after this migration.
--
-- 2. emails.gmail_thread_id
--    Sending a reply looked up the original message in Gmail to find its
--    thread: one Gmail round trip per send, before the send itself. Stored
--    at ingest (lib/gmail.ts) and on a reply's first send, so it is looked
--    up once at most. NULL for mail ingested before this migration until it
--    is first replied to.
--
-- 3. guest_profiles.inference_failed_at
--    When guest inference fails, the server pauses it for 10 minutes. Until
--    now that pause lived only in one server instance's memory
--    (lib/guest-inference.ts). Stamped here, the pause holds across
--    instances and cold starts. Operational only: not guest data, never
--    shown.
--
-- 4. RLS: auth.uid() evaluated once per query, not once per row
--    Supabase's Performance Advisor flags ten policies on users,
--    dashboard_layouts, chat_threads and chat_logs ("Auth RLS Initialization
--    Plan"). Each is rewritten with the same expression, wrapped as
--    `(select auth.uid())` / `(select public.current_hotel_id())`, so
--    Postgres computes it once per statement. The rule each policy enforces
--    is unchanged. The larger tables (reservations, emails) are not flagged
--    and are not touched; ROADMAP §3.6 keeps that rewrite as a triggered
--    item.
-- ============================================================================

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.reservations add column if not exists content_hash text;
alter table public.customers add column if not exists content_hash text;

-- 2 ─────────────────────────────────────────────────────────────────────────
alter table public.emails add column if not exists gmail_thread_id text;

-- 3 ─────────────────────────────────────────────────────────────────────────
alter table public.guest_profiles
  add column if not exists inference_failed_at timestamptz;

-- 4 ─────────────────────────────────────────────────────────────────────────
-- users (0001)
alter policy "users: update self" on public.users
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );

-- dashboard_layouts (0022)
alter policy "dashboard_layouts: read own" on public.dashboard_layouts
  using (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );
alter policy "dashboard_layouts: insert own" on public.dashboard_layouts
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );
alter policy "dashboard_layouts: update own" on public.dashboard_layouts
  using (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  )
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );

-- chat_threads (0023, 0027)
alter policy "chat_threads: read own" on public.chat_threads
  using (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );
alter policy "chat_threads: insert own" on public.chat_threads
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );
alter policy "chat_threads: update own" on public.chat_threads
  using (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  )
  with check (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );
alter policy "chat_threads: delete own" on public.chat_threads
  using (
    user_id = (select auth.uid())
    and hotel_id = (select public.current_hotel_id())
  );

-- chat_logs (0023, 0027)
alter policy "chat_logs: read own threads" on public.chat_logs
  using (
    exists (
      select 1
      from public.chat_threads t
      where t.id = public.chat_logs.thread_id
        and t.user_id = (select auth.uid())
        and t.hotel_id = (select public.current_hotel_id())
    )
  );
alter policy "chat_logs: delete own threads" on public.chat_logs
  using (
    exists (
      select 1
      from public.chat_threads t
      where t.id = public.chat_logs.thread_id
        and t.user_id = (select auth.uid())
        and t.hotel_id = (select public.current_hotel_id())
    )
  );

-- PostgREST caches the schema; reload it so the new columns are usable at
-- once (as every migration that adds columns does).
notify pgrst, 'reload schema';
