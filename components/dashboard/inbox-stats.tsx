import type { Dictionary } from "@/app/[lang]/dictionaries";
import { plural, t } from "@/lib/i18n/format";

/**
 * The one-line summary under a Concierge / Communications heading:
 * "3 drafts ready · 5 sent today · Average response time: 1.4 hours".
 *
 * Shared by both pages so the wording stays identical; the numbers themselves
 * are computed server-side in lib/inbox.ts.
 */
export function InboxStats({
  dict,
  draftsReady,
  sentToday,
  avgResponseHours,
}: {
  dict: Dictionary;
  draftsReady: number;
  sentToday: number;
  avgResponseHours: number | null;
}) {
  return (
    <p className="text-muted-foreground">
      {plural(draftsReady, dict.emails.draftsReadyOne, dict.emails.draftsReadyOther)}{" "}
      · {t(dict.emails.sentToday, { count: sentToday })} ·{" "}
      {t(dict.emails.avgResponse, {
        time:
          avgResponseHours === null
            ? dict.emails.noData
            : t(dict.emails.hours, { count: avgResponseHours.toFixed(1) }),
      })}
    </p>
  );
}
