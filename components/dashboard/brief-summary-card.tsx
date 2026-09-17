import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { plural } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * The dashboard's teaser for the Morning Brief (NAV_REORG_SPEC.md §3): the
 * brief's opening line plus the two counts a GM checks first, in a card that
 * is entirely a link into Front Desk › Morning Brief.
 *
 * Deliberately not a second brief. Two lines of the summary, clamped — no
 * sections, no refresh, no history. If it grows past that it stops being a
 * reason to open the real page.
 *
 * Every value is passed in from data the dashboard already loaded: the summary
 * from lib/briefing-latest.ts (the same read the brief page does), the counts
 * from the dashboard snapshot and the inbox. Nothing is derived here, so this
 * card can't quote a number the rest of the page disagrees with.
 *
 * Colourless by design: v3 keeps the accent for data viz (§10), and a teaser
 * is not a chart. It leads with the white-on-grey float and the type.
 */
export function BriefSummaryCard({
  dict,
  locale,
  summary,
  arrivals,
  waiting,
}: {
  dict: Dictionary;
  locale: Locale;
  /** The brief's opening paragraph, or null when today has no brief yet. */
  summary: string | null;
  /**
   * Arrivals today. Null until the first PMS sync finishes — a zero there
   * would read as "nobody's coming" when the truth is "we don't know yet".
   */
  arrivals: number | null;
  /** Guest messages still waiting on a human. Independent of the PMS. */
  waiting: number;
}) {
  const facts = [
    arrivals === null
      ? null
      : plural(
          arrivals,
          dict.home.briefArrivalsOne,
          dict.home.briefArrivalsOther
        ),
    plural(waiting, dict.home.briefWaitingOne, dict.home.briefWaitingOther),
  ].filter((fact): fact is string => fact !== null);

  return (
    <Link
      href={localizedHref(locale, "/dashboard/brief")}
      className="group flex flex-col gap-3 rounded-[18px] bg-card p-6 shadow-card transition-shadow duration-[180ms] hover:shadow-card-hover"
    >
      <div className="flex items-center justify-between gap-3">
        {/* The nav's own label for the destination, not a second copy of it:
            one string means the card and the rail can never drift apart. */}
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.sidebar.brief}
        </h2>
        <ArrowRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0 text-[var(--fonda-text-3)] transition-colors group-hover:text-foreground"
        />
      </div>

      {summary ? (
        // Clamped, never truncated in JS: splitting prose on "." breaks on
        // abbreviations and doesn't survive translation. CSS clips it cleanly
        // and the full text is one click away.
        <p className="line-clamp-2 text-[15px] leading-6 text-foreground">
          {summary}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{dict.home.briefEmpty}</p>
      )}

      <p className="font-mono text-[11px] tabular-nums text-[var(--fonda-text-3)]">
        {facts.join(" · ")}
      </p>
    </Link>
  );
}
