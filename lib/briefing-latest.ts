import "server-only";

import type { BriefingContent } from "@/lib/briefing";
import { localDate } from "@/lib/stay-phase";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading today's morning briefing — the one place that decides whether a
 * brief counts as "today's".
 *
 * `lib/briefing.ts` writes briefings (and pulls in the Anthropic SDK to do it);
 * this module only reads them, so a surface that wants to *show* the brief
 * doesn't drag a model client into its module graph. The only import shared
 * with the writer is the `BriefingContent` type, which erases at compile time.
 *
 * Both the Morning Brief page and the dashboard's summary card go through
 * here, so the card can never claim a brief the page then says doesn't exist.
 */

export interface TodaysBriefing {
  content: BriefingContent;
  /** When it was generated, ISO-8601 UTC. */
  generatedAt: string;
}

/**
 * The most recent briefing, but only if it was generated on today's *hotel-local*
 * calendar date. Yesterday's brief is not today's news, so it comes back null and
 * the caller shows its own empty state.
 *
 * `timezone` is the hotel's; callers already hold it (the dashboard snapshot and
 * the brief page's hotel row both carry one), which keeps this to a single query.
 * RLS scopes the read to the caller's hotel.
 */
export async function loadTodaysBriefing(
  timezone: string
): Promise<TodaysBriefing | null> {
  const supabase = await createClient();

  // `not(...->>summary, is, null)` skips rows a failed generation left behind:
  // the row exists but its content has no summary, and rendering that is worse
  // than rendering nothing.
  const { data } = await supabase
    .from("briefings")
    .select("content_json, generated_at")
    .not("content_json->>summary", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const tz = timezone || "UTC";
  if (localDate(tz, new Date(data.generated_at)) !== localDate(tz, new Date())) {
    return null;
  }

  return {
    content: data.content_json as unknown as BriefingContent,
    generatedAt: data.generated_at,
  };
}
