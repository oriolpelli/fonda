import type { Dictionary } from "@/app/[lang]/dictionaries";
import { BriefSummaryCard } from "@/components/dashboard/brief-summary-card";
import { WidgetSection } from "@/components/dashboard/widgets/widget-section";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";

/**
 * The Morning Brief teaser as a Home widget (APP_UX_PROPOSAL.md §3.3).
 *
 * The one widget whose freshness is not the PMS sync: a brief is generated once
 * a morning, so "generated 06:40" is the honest provenance — the numbers inside
 * it are as old as the brief, not as old as the last sync.
 *
 * No empty branch here. `BriefSummaryCard` renders its own "not ready yet" copy
 * *and stays a link*, which is the useful thing: the brief page explains what is
 * holding it up. An `EmptyState` would replace a working door with a shrug.
 */
export function BriefWidget({
  dict,
  locale,
  summary,
  generatedAt,
  arrivals,
  waiting,
}: {
  dict: Dictionary;
  locale: Locale;
  summary: string | null;
  generatedAt: string | null;
  arrivals: number | null;
  waiting: number;
}) {
  return (
    <WidgetSection
      title={dict.home.widgets.brief.title}
      freshness={
        generatedAt ? t(dict.home.generatedAt, { time: generatedAt }) : null
      }
    >
      <BriefSummaryCard
        dict={dict}
        locale={locale}
        summary={summary}
        arrivals={arrivals}
        waiting={waiting}
      />
    </WidgetSection>
  );
}
