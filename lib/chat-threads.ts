import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { intlLocale, type Locale } from "@/lib/i18n/config";
import { getHotel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/** A user-scoped (RLS) client — never the admin one. */
type UserClient = SupabaseClient<Database>;

/**
 * The thread list and transcript behind /dashboard/chat (APP_UX_PROPOSAL.md
 * §4.1).
 *
 * Reads go through the ANON client, not the admin one, on purpose: migration
 * 0023's RLS is what scopes a thread to the user who had the conversation, and
 * reading past it with the service role would quietly undo the thing that
 * migration exists to do. A colleague's threads are not yours to read.
 */

export interface ChatThreadSummary {
  id: string;
  title: string | null;
  /**
   * Already formatted, in the HOTEL's timezone and the user's locale.
   *
   * Formatted here rather than in the list component, which is where it started
   * and where it cannot correctly live. A relative time ("2 hours ago") read
   * from `Date.now()` during render is impure, and it is computed on the server
   * against one clock and re-computed in the browser against another, so every
   * row is a hydration mismatch. An absolute time formatted once, server-side,
   * in the timezone the hotel actually works in, is both deterministic and the
   * more useful answer at a front desk: "yesterday 18:40" is something a GM can
   * line up against a shift.
   */
  lastMessageLabel: string;
}

export interface StoredChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * How many conversations a user keeps. Older ones are deleted when a new one
 * starts (pruneOwnThreads, from the chat route), so the list — and what we
 * store — can't grow without bound. Oriol's call, 1 Oct 2026; recorded in
 * APP_UX_PROPOSAL.md §11 #11. The list shows exactly this many.
 */
export const CHAT_HISTORY_LIMIT = 10;

/** This user's conversations, most recent first — at most CHAT_HISTORY_LIMIT. */
export async function loadChatThreads(
  locale: Locale
): Promise<ChatThreadSummary[]> {
  const supabase = await createClient();
  const [{ data }, hotel] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(CHAT_HISTORY_LIMIT),
    // The request's one hotels read (lib/auth.ts), shared with the layout.
    getHotel(),
  ]);

  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat(intlLocale[locale], {
      timeZone: hotel?.timezone || "UTC",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // One hotel with a bad `hotels.timezone` must not take down the page —
    // the same guard lib/stay-phase.ts applies.
    fmt = new Intl.DateTimeFormat(intlLocale[locale], {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (data ?? []).map((row) => {
    const at = new Date(row.last_message_at);
    return {
      id: row.id,
      title: row.title,
      lastMessageLabel: Number.isNaN(at.getTime()) ? "" : fmt.format(at),
    };
  });
}

/**
 * One conversation's transcript, oldest first.
 *
 * What comes back is the PSEUDONYMISED copy — surnames reduced to an initial
 * when the turn was written (lib/pseudonymise.ts). That is not a bug to fix at
 * read time: there is no un-reduced copy to restore from, by design. The UI
 * says so on a restored thread rather than letting a GM wonder why yesterday's
 * conversation reads differently from today's.
 *
 * RLS does the scoping. An id belonging to someone else returns nothing rather
 * than erroring, which is also what a deleted thread does, and the caller
 * treats both the same way.
 */
export async function loadThreadMessages(
  threadId: string
): Promise<StoredChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_logs")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (data ?? [])
    .filter((row): row is { role: "user" | "assistant"; content: string } =>
      row.role === "user" || row.role === "assistant"
    )
    .map((row) => ({ role: row.role, content: row.content }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deletes conversations — transcript first, then the thread — AS THE SIGNED-IN
 * USER. RLS (migration 0027) is what limits this to the user's own threads in
 * their own hotel: an id that isn't theirs deletes nothing, it doesn't error.
 * No service role here on purpose.
 *
 * Returns false when either delete reported an error.
 */
export async function deleteOwnThreads(
  ids: string[],
  client?: UserClient
): Promise<boolean> {
  const clean = [...new Set(ids.filter((id) => UUID.test(id)))];
  if (clean.length === 0) return true;
  const supabase = client ?? (await createClient());
  const { error: logsError } = await supabase
    .from("chat_logs")
    .delete()
    .in("thread_id", clean);
  if (logsError) return false;
  const { error: threadsError } = await supabase
    .from("chat_threads")
    .delete()
    .in("id", clean);
  return !threadsError;
}

/** Every conversation the signed-in user owns ("Clear history"). */
export async function deleteAllOwnThreads(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_threads").select("id");
  if (error) return false;
  return deleteOwnThreads((data ?? []).map((row) => row.id));
}

/**
 * Keeps the user's CHAT_HISTORY_LIMIT most recent conversations and deletes
 * the rest. Called by the chat route when a new conversation starts, so the
 * count never exceeds the limit for long. Best-effort: a failure here leaves
 * one conversation too many, which the next new conversation tidies up.
 *
 * `client` lets the chat route pass the user client it already made before
 * its stream started, rather than reading cookies again from inside it.
 */
export async function pruneOwnThreads(
  keep: number = CHAT_HISTORY_LIMIT,
  client?: UserClient
): Promise<void> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("chat_threads")
    .select("id")
    .order("last_message_at", { ascending: false })
    .range(keep, keep + 199);
  const stale = (data ?? []).map((row) => row.id);
  if (stale.length > 0) await deleteOwnThreads(stale, supabase);
}
