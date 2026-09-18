import type { Dictionary } from "@/app/[lang]/dictionaries";
import { StatRow, type Stat } from "@/components/dashboard/stat-row";
import { WidgetSection } from "@/components/dashboard/widgets/widget-section";
import { t } from "@/lib/i18n/format";

/**
 * Today's four numbers (APP_UX_PROPOSAL.md §3.3).
 *
 * No empty branch: four zeroes are a legitimate reading for a genuinely empty
 * hotel, and the pre-sync case — where zero means "we don't know yet" — is
 * already handled by the footnote below the row rather than by hiding it.
 */
export function NumbersWidget({
  dict,
  stats,
  hasSyncedData,
  syncedAt,
}: {
  dict: Dictionary;
  stats: Stat[];
  hasSyncedData: boolean;
  syncedAt: string | null;
}) {
  return (
    <WidgetSection
      title={dict.home.widgets.numbers.title}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      <div className="flex flex-col gap-3">
        <StatRow stats={stats} />
        {!hasSyncedData ? (
          <p className="text-xs text-[var(--fonda-text-3)]">
            {dict.home.firstSyncNote}
          </p>
        ) : null}
      </div>
    </WidgetSection>
  );
}
