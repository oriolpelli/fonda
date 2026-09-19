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
import type { Departure } from "@/lib/arrivals";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { arrivalsHref } from "@/lib/i18n/navigation";
import { clockTime } from "@/components/dashboard/widgets/widget-section";

/**
 * Who is checking out today — the mirror of `ArrivalsWidget`
 * (APP_UX_PROPOSAL.md §3.3).
 *
 * Two columns the proposal explicitly rules out until the data exists:
 *
 * - **Late check-out.** No reservation carries one. `late_checkout` exists only
 *   as an *upsell* key in Settings (lib/settings-groups.ts), which is a price
 *   list, not a per-booking flag — so the column is absent rather than
 *   invented. When a PMS starts sending it, `lib/pms-fields.ts` is where it
 *   gets read and this row grows a third field.
 * - **Outstanding balance.** §3.3 parks it until there is finance data.
 */
export function DeparturesWidget({
  dict,
  locale,
  departures,
  timezone,
  syncedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  departures: Departure[];
  /** The hotel's timezone — check-out is a wall-clock time at the desk. */
  timezone: string;
  syncedAt: string | null;
}) {
  // Straight to the departures tab: the "+N more" door has to open on the half
  // of the day the card is showing (APP_UX_PROPOSAL.md §5.2).
  const href = arrivalsHref(locale, "departures");
  const shown = departures.slice(0, WIDGET_LIST_ROWS);
  const more = departures.length - shown.length;

  const rows: WidgetListRow[] = shown.map((departure) => ({
    key: departure.reservationId,
    href,
    name: departure.name || dict.home.movements.guest,
    detail: departure.room
      ? t(dict.home.departures.room, { room: departure.room })
      : null,
    meta: clockTime(locale, timezone, departure.endUtc),
  }));

  return (
    <WidgetSection
      title={dict.home.widgets["departures-today"].title}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      {rows.length === 0 ? (
        <WidgetEmpty icon="arrivals" message={dict.home.departures.empty} />
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
