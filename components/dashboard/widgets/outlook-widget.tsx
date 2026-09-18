import type { Dictionary } from "@/app/[lang]/dictionaries";
import { OccupancyStrip } from "@/components/dashboard/occupancy-strip";
import { WidgetSection } from "@/components/dashboard/widgets/widget-section";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import type { OccupancyDay } from "@/lib/occupancy";
import { LOW_OCCUPANCY_PCT } from "@/lib/todo-rules";

/**
 * The next 14 nights (APP_UX_PROPOSAL.md §3.3).
 *
 * This widget carries the product's ONE accent — tonight's column in the strip
 * (FONDA_SANA_REDESIGN.md §10). Nothing else on Home may take a second one: if
 * a future widget wants to stand out, it does it with weight and darkness, the
 * way tonight's `%` already does.
 *
 * Owns `id="occupancy"` so the low-occupancy to-do's `#occupancy` jump lands on
 * the heading rather than parking it above the fold — it used to sit on the
 * strip itself, back when the strip had no heading above it.
 */
export function OutlookWidget({
  dict,
  locale,
  outlook,
  today,
  syncedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  outlook: OccupancyDay[];
  today: string;
  syncedAt: string | null;
}) {
  return (
    <WidgetSection
      id="occupancy"
      // scroll-mt-20 on mobile so the jump doesn't land under the fixed 56px
      // top bar.
      className="scroll-mt-20 md:scroll-mt-8"
      title={dict.home.widgets.outlook.title}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      <OccupancyStrip
        dict={dict}
        locale={locale}
        outlook={outlook}
        today={today}
        softBelowPct={LOW_OCCUPANCY_PCT}
      />
    </WidgetSection>
  );
}
