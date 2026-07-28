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
      className="scroll-mt-8 rounded-[16px] border border-border bg-card p-6"
    >
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {dict.home.outlookTitle}
      </h2>

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {outlook.map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const isToday = day.date === today;
          const soft = day.occupancyPct < softBelowPct;

          return (
            <div
              key={day.date}
              className="flex min-w-[42px] flex-1 flex-col items-center gap-2"
            >
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  isToday
                    ? "font-medium text-[var(--fonda-accent)]"
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

      {/* Where ADR will live once the rate cache exists. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--fonda-surface)] px-4 py-3">
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
