-- ============================================================================
-- Fondas — let a user delete their own Ask conversations (1 Oct 2026)
--
-- Ask keeps a user's 10 most recent conversations and deletes older ones
-- automatically, and the conversation list gets "delete" on each thread and a
-- "Clear history" (decision in APP_UX_PROPOSAL.md §11, #11). Both run as the
-- signed-in user, through RLS — not with the service role — so these two
-- policies are what make them possible, and what keep them narrow:
--
--   • a user deletes only threads they own, inside their own hotel — the same
--     two-halves rule as the read policies in 0023;
--   • a chat_logs row can be deleted only if it belongs to such a thread.
--     Rows with a null thread_id (written before 0023) match no thread and
--     stay untouchable from the client, as they are unreadable today.
--
-- Until this is applied, the delete buttons and the automatic pruning are
-- silent no-ops: RLS denies the delete and zero rows change. Nothing errors.
--
-- Numbering: 0026 stays reserved for Reputation's `reviews`
-- (APP_UX_PROMPTS.md P-2), so this takes 0027. They are independent.
--
-- Re-runnable.
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
