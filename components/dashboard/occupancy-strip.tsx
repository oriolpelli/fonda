import type { Dictionary } from "@/app/[lang]/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import type { OccupancyDay } from "@/lib/occupancy";
import type { HomeRates } from "@/lib/rate-outlook";
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
 * The average-rate row (B17). Under each night: what the rooms already sold
 * are paying on average, excl. VAT, from the PMS's own room charges
 * (lib/rate-math.ts). Below the columns, one quiet line: the lowest public
 * price still on sale tonight and yesterday's pickup. No accent anywhere in
 * it — tonight's rate stands out the way tonight's `%` does, by weight and
 * darkness. A night with no priced room shows a dash, never a zero, and a
 * source with no rates (the Sheet import) says so: a plausible-looking but
 * invented ADR is the fastest way to lose a GM's trust.
 *
 * No heading of its own: on Home that belongs to `outlook-widget.tsx`, which
 * also carries the `id="occupancy"` the low-occupancy to-do jumps to — the
 * anchor moved up with the label so the jump lands on the title, not under it.
 */

const BAR_HEIGHT_PX = 88;

/** Whole units, with the currency's narrow symbol where there is one. */
function moneyFormatter(locale: Locale, currency: string | null) {
  try {
    return new Intl.NumberFormat(intlLocale[locale], {
      ...(currency
        ? { style: "currency", currency, currencyDisplay: "narrowSymbol" }
        : {}),
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
  } catch {
    return new Intl.NumberFormat(intlLocale[locale], {
      maximumFractionDigits: 0,
    });
  }
}

export function OccupancyStrip({
  dict,
  locale,
  outlook,
  today,
  softBelowPct,
  rates,
}: {
  dict: Dictionary;
  locale: Locale;
  outlook: OccupancyDay[];
  today: string;
  /** Nights below this read as soft — muted, not alarmed. */
  softBelowPct: number;
  /** The rate cache (B17). Null: not read, or no PMS. */
  rates: HomeRates | null;
}) {
  const weekday = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    weekday: "narrow",
  });
  const dayOfMonth = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    day: "numeric",
  });

  const rateOutlook = rates?.outlook ?? null;
  const showAdr = Boolean(rateOutlook?.hasRevenue);
  const money = moneyFormatter(locale, rateOutlook?.currency ?? null);
  const adrByNight = new Map(
    (rateOutlook?.nights ?? []).map((n) => [n.date, n.adr])
  );
  const tonight = rateOutlook?.nights.find((n) => n.date === today) ?? null;

  const fallback =
    rates && !rates.sourceHasRates
      ? dict.home.ratesNoSource
      : dict.home.ratesPending;

  // The line under the columns: what is on sale tonight, and what was booked
  // yesterday — whichever the cache knows. Without any rate, it first says
  // why (a Sheet hotel still gets its pickup after that), so the row's label
  // is never left heading a line that has no rate in it.
  const facts: string[] = [];
  const hasAnyRate = Boolean(
    rateOutlook?.hasRevenue || rateOutlook?.hasSellingPrice
  );
  if (rateOutlook?.hasSellingPrice) {
    facts.push(
      tonight?.sellFrom != null
        ? t(dict.home.ratesSellingFrom, { price: money.format(tonight.sellFrom) })
        : dict.home.ratesNothingOnSale
    );
  }
  const pickup = rateOutlook?.pickupYesterdayTotal ?? null;
  if (pickup !== null) {
    facts.push(
      plural(
        Math.abs(pickup),
        dict.home.ratesPickupOne,
        dict.home.ratesPickupOther,
        { signed: pickup > 0 ? `+${pickup}` : pickup < 0 ? `\u2212${-pickup}` : "0" }
      )
    );
  }

  return (
    // v3 (§6): white card floating on the grey ground — borderless, 18px, the
    // resting whisper shadow doing the separating, same as the stat row above.
    <div className="rounded-[16px] bg-card p-6">
      {/* Fourteen 42px columns don't fit a 375px phone, so the strip scrolls
          sideways and snaps night-to-night. The negative margin lets it run to
          the card's edges — so a half-cut column reads as "there's more" — while
          the matching padding and scroll-padding keep the ends inset. */}
      <div className="-mx-6 flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-px-6 px-6 pb-1">
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

              {showAdr && (
                <NightRate
                  value={adrByNight.get(day.date) ?? null}
                  isToday={isToday}
                  label={(price) => t(dict.home.ratesNightLabel, { price })}
                  format={(v) => money.format(v)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* The rates line. A nested well (§6): `--fonda-surface` is the card's
          own fill in v4, so the line takes the next step down the ladder. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[10px] bg-[var(--fonda-surface-2)] px-4 py-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.home.outlookRates}
        </span>
        <span className="text-sm text-[var(--fonda-text-2)]">
          {!hasAnyRate && (
            <span className="text-[var(--fonda-text-3)]">
              {fallback}
              {facts.length > 0 ? " · " : ""}
            </span>
          )}
          {facts.join(" · ")}
        </span>
      </div>
    </div>
  );
}

/**
 * One night's average rate, under its column. Mono and small, like the `%`
 * above the bar; tonight's is darker and heavier, never coloured. A night
 * with no priced room is a dash — zero would be a claim.
 */
function NightRate({
  value,
  isToday,
  label,
  format,
}: {
  value: number | null;
  isToday: boolean;
  label: (price: string) => string;
  format: (value: number) => string;
}) {
  if (value === null) {
    return (
      <span
        aria-hidden="true"
        className="font-mono text-[10px] text-[var(--fonda-text-3)]"
      >
        –
      </span>
    );
  }
  const price = format(value);
  return (
    <span
      aria-label={label(price)}
      title={label(price)}
      className={cn(
        "whitespace-nowrap font-mono text-[10px] tabular-nums",
        isToday
          ? "font-semibold text-[var(--fonda-text)]"
          : "text-[var(--fonda-text-2)]"
      )}
    >
      {price}
    </span>
  );
}
