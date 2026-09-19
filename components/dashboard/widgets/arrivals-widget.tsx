import type { Dictionary } from "@/app/[lang]/dictionaries";
import {
  WidgetEmpty,
  WidgetSection,
} from "@/components/dashboard/widgets/widget-section";
import {
  WidgetList,
  WIDGET_LIST_ROWS,
  type WidgetListRow,
} from "@/components/dashboard/widgets/widget-list";
import type { Arrival } from "@/lib/arrivals";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { arrivalsHref } from "@/lib/i18n/navigation";

/**
 * Who is checking in today (APP_UX_PROPOSAL.md §3.3).
 *
 * The list behind `checkinsToday`, which has been a digit in the stat row with
 * nothing underneath it. Ordered the way the desk works the day: confirmed
 * clock times first, then the vaguer ones, then whoever never said — so the top
 * of the card is the next few hours.
 *
 * "no ETA" is printed rather than left blank. A blank cell reads as data we
 * forgot to load; the missing arrival time *is* the fact, and it is the one the
 * check-in chaser exists to fix.
 */
export function ArrivalsWidget({
  dict,
  locale,
  arrivals,
  syncedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  arrivals: Arrival[];
  syncedAt: string | null;
}) {
  const href = arrivalsHref(locale);
  const shown = arrivals.slice(0, WIDGET_LIST_ROWS);
  const more = arrivals.length - shown.length;

  const rows: WidgetListRow[] = shown.map((arrival) => ({
    key: arrival.reservationId,
    href,
    name: arrival.name || dict.home.movements.guest,
    detail: arrival.roomType,
    meta: arrival.eta || dict.home.arrivals.noEta,
    tag: arrival.returning ? dict.home.arrivals.returning : null,
  }));

  return (
    <WidgetSection
      title={dict.home.widgets["arrivals-today"].title}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      {rows.length === 0 ? (
        <WidgetEmpty icon="arrivals" message={dict.home.arrivals.empty} />
      ) : (
        <WidgetList
          rows={rows}
          footer={
            more > 0
              ? { href, label: t(dict.home.movements.more, { count: more }) }
              : null
          }
        />
      )}
    </WidgetSection>
  );
}
