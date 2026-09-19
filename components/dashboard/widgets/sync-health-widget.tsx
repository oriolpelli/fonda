import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import {
  WidgetEmpty,
  WidgetSection,
  clockTime,
} from "@/components/dashboard/widgets/widget-section";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { hotelToday, localDateOf } from "@/lib/stay-phase";
import type { SourceHealth } from "@/lib/sync-health";

/**
 * Is the data still arriving? (APP_UX_PROPOSAL.md §3.3 — "quiet by default".)
 *
 * One line per connected source and nothing more. There is no healthy state to
 * draw: a source that is working says when it last worked, in the same muted
 * mono as every other freshness line on the page, and that is the whole widget
 * on a normal morning. **Green means nothing** — no dot, no tint, no "Healthy".
 *
 * A failure is a plain word, "Failed", in ink rather than red, plus the door to
 * fix it. Red is reserved for a guest-facing error (a complaint, a broken
 * connection in the rail); a sync that missed a run is a fact about freshness,
 * and dressing it as an alarm would make the widget shout every time a cron
 * slipped. The source's *state* still comes from `deriveConnectionState`, the
 * same rule the rail's dot uses — it just chooses a word here, not a colour.
 */
export function SyncHealthWidget({
  dict,
  locale,
  sources,
  timezone,
}: {
  dict: Dictionary;
  locale: Locale;
  sources: SourceHealth[];
  timezone: string;
}) {
  const copy = dict.home.syncHealth;
  const settingsHref = localizedHref(locale, "/dashboard/settings/connections");

  return (
    <WidgetSection title={dict.home.widgets["sync-health"].title}>
      {sources.length === 0 ? (
        <WidgetEmpty icon="upcoming" message={copy.empty} />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-[16px] bg-card">
          <ul className="flex flex-col divide-y divide-border">
            {sources.map((source) => (
              <li
                key={source.key}
                className="flex flex-col gap-1 px-6 py-4"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">
                    {source.pms
                      ? dict.settings.pmsNames[source.pms]
                      : copy.email}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--fonda-text-3)]">
                    {lastRunLine(dict, locale, timezone, source)}
                  </span>
                </div>

                {source.lastFailureAt ? (
                  <div className="flex items-baseline justify-between gap-4">
                    {/* Ink, not destructive: see the note at the top of the
                        file. It leads by darkness, like every other emphasis
                        in v3 chrome. */}
                    <span className="text-[13px] text-[var(--fonda-text)]">
                      {t(copy.failed, {
                        time:
                          stamp(locale, timezone, source.lastFailureAt) ?? "",
                      })}
                    </span>
                    <Link
                      href={settingsHref}
                      className="shrink-0 text-[13px] text-[var(--fonda-text-2)] underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {copy.settings}
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetSection>
  );
}

/**
 * What the source last did, in words. The state decides the wording — "synced"
 * for a source inside its freshness window, "last synced" for one that has
 * fallen behind — so a stale source reads differently without reading alarming.
 */
function lastRunLine(
  dict: Dictionary,
  locale: Locale,
  timezone: string,
  source: SourceHealth
): string {
  const when = stamp(locale, timezone, source.lastSuccessAt);
  if (!when) return dict.home.syncHealth.never;
  if (source.state === "red") return dict.settings.notConnected;
  return source.state === "green"
    ? t(dict.home.syncedAt, { time: when })
    : t(dict.home.syncHealth.stale, { time: when });
}

/**
 * A timestamp as the desk would say it: the wall clock for something that
 * happened today, the date as well for anything older. A bare "06:40" against
 * a sync that last ran on Tuesday is the one reading this widget must not give.
 */
function stamp(
  locale: Locale,
  timezone: string,
  iso: string | null
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;

  const tz = timezone || "UTC";
  if (localDateOf(tz, iso) === hotelToday(tz)) {
    return clockTime(locale, tz, iso);
  }

  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}
