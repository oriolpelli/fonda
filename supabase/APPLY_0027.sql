-- ============================================================================
-- APPLY 0027 -- delete your own Ask conversations
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run twice.
--
-- What it does, in plain language: lets each person delete their OWN Ask
-- conversations (one at a time, "Clear history", and the automatic clean-up
-- that keeps only the latest 10). Nobody can delete a colleague's, and nothing
-- else changes. Until this runs, those buttons simply do nothing.
--
-- Check it took, in the SQL editor:
--   select tablename, policyname from pg_policies
--    where policyname in ('chat_threads: delete own', 'chat_logs: delete own threads');
--   -- expect two rows
--
-- The authoritative text is supabase/migrations/0027_chat_history_delete.sql.
-- ============================================================================

drop policy if exists "chat_threads: delete own" on public.chat_threads;
create policy "chat_threads: delete own"
  on public.chat_threads for delete to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "chat_logs: delete own threads" on public.chat_logs;
create policy "chat_logs: delete own threads"
  on public.chat_logs for delete to authenticated
  using (
    exists (
      select 1
      from public.chat_threads t
      where t.id = public.chat_logs.thread_id
        and t.user_id = auth.uid()
        and t.hotel_id = public.current_hotel_id()
    )
  );

notify pgrst, 'reload schema';
