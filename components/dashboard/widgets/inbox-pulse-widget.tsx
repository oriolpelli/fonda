import type { Dictionary } from "@/app/[lang]/dictionaries";
import { StatRow, type Stat } from "@/components/dashboard/stat-row";
import { WidgetSection } from "@/components/dashboard/widgets/widget-section";
import { t } from "@/lib/i18n/format";

/**
 * How the inbox is doing — drafts ready, sent today, average first reply
 * (APP_UX_PROPOSAL.md §3.3).
 *
 * The three numbers `loadInbox` already computes, which until now nothing
 * rendered. Deliberately the same `StatRow` the page-wide numbers use, in its
 * three-cell variant: these are readings of the same kind, and giving them
 * their own visual language would imply they were a different sort of fact.
 *
 * No empty branch. Three zeroes on a quiet morning is a true reading — and the
 * honest one, since "nothing waiting" is good news here, not missing data. An
 * inbox with nothing ever sent shows "—" for the average rather than a zero
 * that would claim instant replies.
 */
export function InboxPulseWidget({
  dict,
  draftsReady,
  sentToday,
  avgResponseHours,
  updatedAt,
}: {
  dict: Dictionary;
  draftsReady: number;
  sentToday: number;
  /** Null until at least one reply has been sent. */
  avgResponseHours: number | null;
  updatedAt: string | null;
}) {
  const pulse = dict.home.inboxPulse;

  const stats: Stat[] = [
    { key: "drafts", label: pulse.drafts, value: String(draftsReady) },
    { key: "sent", label: pulse.sent, value: String(sentToday) },
    {
      key: "response",
      label: pulse.response,
      value: formatResponse(dict, avgResponseHours),
    },
  ];

  return (
    <WidgetSection
      title={dict.home.widgets["inbox-pulse"].title}
      // Inbox-backed like "Needs a reply", so its freshness is the newest
      // message, not the PMS sync.
      freshness={updatedAt ? t(dict.home.updatedAt, { time: updatedAt }) : null}
    >
      <StatRow stats={stats} columns={3} />
    </WidgetSection>
  );
}

/**
 * An average response time a GM can read at a glance: minutes under the hour,
 * one decimal of an hour above it. "0.4h" is a worse answer than "24m" for the
 * number this hotel most wants to keep small.
 */
function formatResponse(dict: Dictionary, hours: number | null): string {
  const pulse = dict.home.inboxPulse;
  if (hours === null || !Number.isFinite(hours)) return pulse.none;
  if (hours < 1) return t(pulse.minutes, { value: Math.round(hours * 60) });
  return t(pulse.hours, { value: hours.toFixed(1) });
}
