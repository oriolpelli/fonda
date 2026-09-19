import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Past briefs — the history list, moved off the Morning Brief page
 * (APP_UX_PROPOSAL.md §5.1). Thirty rows of dates below the delivery form was a
 * lot of page for something read rarely; it is reached now from a quiet link in
 * the brief's hero.
 *
 * No gradient hero here. The sunrise belongs to a brief, and this is an index
 * of briefs — the page's job is to get out of the way of the one row you came
 * to open.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.briefing.historyTitle };
}

function formatShortDate(intl: string, tz: string, d: Date): string {
  return new Intl.DateTimeFormat(intl, {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** The brief's opening sentence, so a date has something to be recognised by. */
function firstLine(content: unknown): string {
  const summary = (content as BriefingContent | null)?.summary ?? "";
  return summary.split("\n").find((line) => line.trim())?.trim() ?? "";
}

/** How far back the list reaches. */
const HISTORY_DAYS = 30;

export default async function BriefingHistoryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("timezone")
    .single();
  const tz = hotel?.timezone || "UTC";

  const now = new Date();
  const cutoff = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const { data: history } = await supabase
    .from("briefings")
    .select("id, generated_at, content_json")
    .not("content_json->>summary", "is", null)
    .gte("generated_at", cutoff.toISOString())
    .order("generated_at", { ascending: false })
    .limit(HISTORY_DAYS);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3 self-start text-muted-foreground"
        >
          <Link href={localizedHref(locale, "/dashboard/brief")}>
            <ChevronLeft className="size-4" />
            {dict.briefing.backToToday}
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.briefing.historyTitle}
        </h1>
      </div>

      {history && history.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {history.map((row) => (
            <li key={row.id}>
              <Link
                href={localizedHref(locale, `/dashboard/brief/history/${row.id}`)}
                className="flex items-baseline gap-4 py-3 transition-colors hover:bg-muted"
              >
                <span className="shrink-0 text-sm text-foreground/80">
                  {formatShortDate(intlLocale[locale], tz, new Date(row.generated_at))}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {firstLine(row.content_json)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {dict.briefing.historyEmpty}
        </p>
      )}
    </div>
  );
}
