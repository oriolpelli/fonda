import "server-only";

import { intlLocale, type Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

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

/** This user's conversations, most recent first. */
export async function loadChatThreads(
  locale: Locale
): Promise<ChatThreadSummary[]> {
  const supabase = await createClient();
  const [{ data }, { data: hotel }] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabase.from("hotels").select("timezone").maybeSingle(),
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
