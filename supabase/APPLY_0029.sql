-- ============================================================================
-- APPLY 0029 -- the sync writes only what changed; four small speed fixes
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice. Takes a second; nothing is locked for longer.
--
-- What it does, in plain language:
--   * gives reservations and guest profiles a fingerprint, so the PMS sync
--     can skip the rows that haven't changed instead of rewriting all of them
--     every 15 minutes (that rewrite was 97% of the database's work);
--   * remembers each email's Gmail thread, so a reply doesn't have to look it
--     up in Gmail first;
--   * remembers when Fondas AI last failed for a guest, so every server waits
--     10 minutes before trying again, not just the one that saw it fail;
--   * lets ten access rules check "who is asking" once per query instead of
--     once per row. Who can see what does not change.
-- No data is changed or removed. The app works the same before and after;
-- after, the sync and sending get lighter.
--
-- Check it took, in the SQL editor:
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public'
--      and column_name in ('content_hash', 'gmail_thread_id', 'inference_failed_at')
--    order by 1;
--   -- expect four rows: customers, emails, guest_profiles, reservations
--
-- The first sync after this runs writes every row once, to store its
-- fingerprint. The ones after that write only what changed.
--
-- The authoritative text is supabase/migrations/0029_speed_pass_c.sql.
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
