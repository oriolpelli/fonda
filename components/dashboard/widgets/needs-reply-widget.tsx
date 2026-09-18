import type { Dictionary } from "@/app/[lang]/dictionaries";
import { NeedsReplyCard } from "@/components/dashboard/needs-reply-card";
import {
  WidgetEmpty,
  WidgetSection,
} from "@/components/dashboard/widgets/widget-section";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import type { InboxEmail } from "@/lib/inbox";

/**
 * The few guest messages waiting on a human (APP_UX_PROPOSAL.md §3.3).
 *
 * Inbox-backed, so its freshness is not a sync: mail arrives continuously and
 * the ranking is derived per read. The honest line is when the newest message
 * landed — "updated 09:12" — which is also the number a GM checks the card
 * against.
 */
export function NeedsReplyWidget({
  dict,
  locale,
  emails,
  updatedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  /** Already ranked and capped by the page. */
  emails: InboxEmail[];
  updatedAt: string | null;
}) {
  return (
    <WidgetSection
      title={dict.home.widgets["needs-reply"].title}
      freshness={updatedAt ? t(dict.home.updatedAt, { time: updatedAt }) : null}
    >
      {emails.length === 0 ? (
        <WidgetEmpty icon="emails" message={dict.home.needsReplyEmpty} />
      ) : (
        <NeedsReplyCard dict={dict} locale={locale} emails={emails} />
      )}
    </WidgetSection>
  );
}
