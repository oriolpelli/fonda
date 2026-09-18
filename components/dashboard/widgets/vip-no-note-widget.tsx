import type { Dictionary } from "@/app/[lang]/dictionaries";
import {
  WidgetEmpty,
  WidgetSection,
} from "@/components/dashboard/widgets/widget-section";
import {
  WidgetList,
  type WidgetListRow,
} from "@/components/dashboard/widgets/widget-list";
import type { VipArrival } from "@/lib/dashboard-snapshot";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { checkinsHref, communicationsHref } from "@/lib/i18n/navigation";

/**
 * VIPs arriving today whose booking carries no note for the desk
 * (APP_UX_PROPOSAL.md §3.3).
 *
 * The same `vipArrivalsWithoutNote` the to-do list already reads — but whole.
 * `buildTodoList` caps it at two (`PER_RULE_CAP`) so one busy VIP morning can't
 * flood a six-item list; a property where this is a daily concern gets the full
 * list here instead, and everyone else's to-do list stays short. Uncapped on
 * purpose: a fourth VIP with no note is exactly as actionable as the first.
 *
 * Each row opens the guest's conversation when there is one to open, so the GM
 * can read what they asked for before writing the note. When no mail is linked
 * there is nothing to read, and the row goes to the arrivals surface instead.
 *
 * No tag, no second line: the heading already says these are VIPs and already
 * says what is missing. Repeating it on every row would be decoration.
 */
export function VipNoNoteWidget({
  dict,
  locale,
  vips,
  threads,
  syncedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  vips: VipArrival[];
  /** `reservationId -> emailId`, from `loadReservationThreads`. */
  threads: Map<string, string>;
  syncedAt: string | null;
}) {
  const fallbackHref = checkinsHref(locale);

  const rows: WidgetListRow[] = vips.map((vip) => {
    const emailId = threads.get(vip.reservationId);
    return {
      key: vip.reservationId,
      href: emailId ? communicationsHref(locale, emailId) : fallbackHref,
      name: vip.name || dict.home.movements.guest,
    };
  });

  return (
    <WidgetSection
      title={dict.home.widgets["vip-no-note"].title}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      {rows.length === 0 ? (
        <WidgetEmpty icon="concierge" message={dict.home.vipNoNoteEmpty} />
      ) : (
        <WidgetList rows={rows} />
      )}
    </WidgetSection>
  );
}
