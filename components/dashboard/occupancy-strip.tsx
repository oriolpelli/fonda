import type { Dictionary } from "@/app/[lang]/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import type { OccupancyDay } from "@/lib/occupancy";
import { cn } from "@/lib/utils";

/**
 * The fortnight ahead: one column per night, height showing how full the hotel
 * is. Today is the single navy column — the design identity allows the signal
 * colour only for something genuinely live, and "tonight" is the most live
 * thing on this page.
 *
 * v3 (§10): that column is now the ONE accented element in the entire product.
 * Everything else here is neutral grey, and everywhere else — the to-do dots,
 * the inbox's "Arrives today", the admin chips — has been decoloured to match.
 * If you are about to add a second accent to this page, don't: use weight or
 * darkness, the way today's `%` and day number do.
 *
 * Colour is never the only tell. Today is also the only column whose `%` is
 * semibold near-black and whose day number is `font-medium text-foreground`, so
 * the strip still reads with hue removed (WCAG 1.4.1).
 *
 * The average-rate row is a deliberate placeholder. Fondas does not cache rate
 * plans yet (an August task), and a plausible-looking but invented ADR is the
 * fastest way to lose a GM's trust — they know their own numbers. So the row
 * exists, sized and positioned where the real figures will go, and says so.
 *
 * Carries `id="occupancy"` so the low-occupancy to-do item can point back here.
 */

const BAR_HEIGHT_PX = 88;

export function OccupancyStrip({
  dict,
  locale,
  outlook,
  today,
  softBelowPct,
}: {
  dict: Dictionary;
  locale: Locale;
  outlook: OccupancyDay[];
  today: string;
  /** Nights below this read as soft — muted, not alarmed. */
  softBelowPct: number;
}) {
  const weekday = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    weekday: "narrow",
  });
  const dayOfMonth = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    day: "numeric",
  });

  return (
    <section
      id="occupancy"
      // scroll-mt-20 on mobile so the to-do list's "#occupancy" jump doesn't
      // park this section underneath the fixed 56px top bar.
      // v3 (§6): white card floating on the grey ground — borderless, 18px, the
      // resting whisper shadow doing the separating, same as the stat row above.
      className="scroll-mt-20 rounded-[18px] bg-card p-6 shadow-card md:scroll-mt-8"
    >
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {dict.home.outlookTitle}
      </h2>

      {/* Fourteen 42px columns don't fit a 375px phone, so the strip scrolls
          sideways and snaps night-to-night. The negative margin lets it run to
          the card's edges — so a half-cut column reads as "there's more" — while
          the matching padding and scroll-padding keep the ends inset. */}
      <div className="-mx-6 mt-5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-px-6 px-6 pb-1">
        {outlook.map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const isToday = day.date === today;
          const soft = day.occupancyPct < softBelowPct;

          return (
            <div
              key={day.date}
              className="flex min-w-[42px] flex-1 snap-start flex-col items-center gap-2"
            >
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  // §10 allows the accent as a marker OR a number colour, once
                  // per view — the bar below is already spending it, so today's
                  // reading stands out by weight and darkness instead.
                  isToday
                    ? "font-semibold text-[var(--fonda-text)]"
                    : soft
                      ? "text-[var(--fonda-text-3)]"
                      : "text-[var(--fonda-text-2)]"
                )}
              >
                {day.occupancyPct}%
              </span>

              <div
                className="flex w-full items-end overflow-hidden rounded-[4px] bg-[var(--fonda-inset)]"
                style={{ height: BAR_HEIGHT_PX }}
                role="img"
                aria-label={`${day.date}: ${day.occupancyPct}%`}
              >
                <div
                  className={cn(
                    "w-full rounded-[4px]",
                    // ── THE one accent in the product (§10). ──────────────
                    // 6.86:1 against the inset track; the neutral bars are
                    // 4.22:1. Both clear the 3:1 floor for meaningful graphics.
                    isToday
                      ? "bg-[var(--fonda-accent)]"
                      : "bg-[var(--fonda-text-3)]"
                  )}
                  // Hairline minimum so an empty night still reads as a column.
                  style={{
                    height: `${Math.max(Math.min(day.occupancyPct, 100), 2)}%`,
                  }}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase text-[var(--fonda-text-3)]">
                  {weekday.format(date)}
                </span>
                <span
                  className={cn(
                    "text-[12px] tabular-nums",
                    isToday
                      ? "font-medium text-foreground"
                      : "text-[var(--fonda-text-2)]"
                  )}
                >
                  {dayOfMonth.format(date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Where ADR will live once the rate cache exists. `--fonda-surface` was
          grey in v2 and is white in v3, which left this well invisible inside a
          white card — it takes the nested-well token now (§6). */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--fonda-surface-2)] px-4 py-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.home.outlookRates}
        </span>
        <span className="text-sm text-[var(--fonda-text-3)]">
          {dict.home.ratesComingSoon}
        </span>
      </div>
    </section>
  );
}
