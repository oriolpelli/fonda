import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { t } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import type { InboxEmail } from "@/lib/inbox";
import { urgencyNoteFor } from "@/lib/urgency-note";
import { cn } from "@/lib/utils";

/**
 * The few guest messages actually waiting on the GM — complaints first, then
 * whoever arrives soonest, then whoever has waited longest.
 *
 * The ranking is not re-derived here: these rows arrive already sorted by the
 * B7.1 rules (lib/email-urgency.ts), and the note wording is shared with the
 * inbox via lib/urgency-note.ts, so a message described as "Arrives today" on
 * this card says exactly the same thing when you open it.
 *
 * A server component — every row is a link, nothing here is interactive.
 */

// Quiet by default. A complaint stays the one red note — that is a semantic
// status colour, not the accent. "Arrives today" used to be navy; in v3 the
// accent is content-only (§10), so it leads by darkness instead. Same palette as
// the inbox, deliberately.
const NOTE_CLASS: Record<string, string> = {
  complaint: "text-destructive",
  arrives_today: "text-[var(--fonda-text)]",
};

export function NeedsReplyCard({
  dict,
  locale,
  emails,
}: {
  dict: Dictionary;
  locale: Locale;
  emails: InboxEmail[];
}) {
  const inboxHref = localizedHref(locale, "/dashboard/communications");

  return (
    <section className="flex flex-col rounded-[18px] bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 px-6 pt-6">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.home.needsReply}
        </h2>
        {emails.length > 0 ? (
          <Link
            href={inboxHref}
            className="text-[13px] text-[var(--fonda-text-2)] transition-colors hover:text-foreground"
          >
            {dict.home.needsReplyAll}
          </Link>
        ) : null}
      </div>

      {emails.length === 0 ? (
        <p className="px-6 pb-6 pt-4 text-sm text-muted-foreground">
          {dict.home.needsReplyEmpty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
          {emails.map((email) => {
            const note = urgencyNoteFor(email.urgency);
            const sender =
              email.guest_name || email.from_email || dict.emails.unknownSender;
            return (
              <li key={email.id}>
                <Link
                  href={`${inboxHref}?email=${email.id}`}
                  className="flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <GuestAvatar name={sender} className="mt-0.5" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {sender}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {email.subject || dict.emails.noSubject}
                      </span>
                    </span>
                  </span>
                  {note ? (
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[11px] font-medium",
                        NOTE_CLASS[email.urgency.kind] ??
                          "text-[var(--fonda-text-3)]"
                      )}
                    >
                      {t(dict.emails.urgency[note.key], note.vars)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
