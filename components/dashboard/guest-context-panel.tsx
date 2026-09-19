import Link from "next/link";

import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import type { GuestContext } from "@/lib/guest-context";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import { guestHref } from "@/lib/i18n/navigation";
import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * The third pane: who you are talking to (APP_UX_PROPOSAL.md §1.5, §5.3).
 *
 * A SERVER COMPONENT, deliberately, and this is the only interesting thing
 * about its shape. The inbox is a Client Component — it owns selection, the
 * draft textarea and the sort/queue toggles — so the obvious build would pass
 * the guest's nationality, language and party size down as props and render
 * them there. That would put a pile of guest data into the client payload for
 * every message in the list, most of which is never looked at.
 *
 * Instead the panes are rendered here, on the server, one per guest, and handed
 * to the inbox as ready-made slots (`contextPanes`). The client boundary is
 * `"use client"` at the top of components/dashboard/email-inbox.tsx; the only
 * thing about the guest that crosses it for this feature is
 * `InboxEmail.contextKey`, an opaque string. Nothing here is serialised.
 *
 * Nothing in it is editable. It answers "who is this?", and every way to change
 * a guest lives on the guest record.
 */

/** A fact row, rendered only when there is a value. Never a "—". */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="shrink-0 text-[12px] text-[var(--fonda-text-3)]">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[13px] text-[var(--fonda-text)]">
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
        {title}
      </p>
      <dl>{children}</dl>
    </div>
  );
}

/** "12–15 Sep" — one line, the way a GM says a stay. */
function stayDates(
  locale: Locale,
  arrival: string | null,
  departure: string | null
): string | null {
  if (!arrival || !departure) return arrival ?? departure ?? null;
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(`${arrival}T00:00:00Z`))} – ${fmt.format(
    new Date(`${departure}T00:00:00Z`)
  )}`;
}

/**
 * "ES" → "Spain", "de" → "German". Falls back to the raw code rather than
 * hiding the row: a PMS code a GM half-recognises beats no answer, and
 * Intl.DisplayNames throws on codes it does not know.
 */
function displayName(
  locale: Locale,
  type: "region" | "language",
  code: string | null
): string | null {
  if (!code) return null;
  try {
    return (
      new Intl.DisplayNames([intlLocale[locale]], { type }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

export function GuestContextPanel({
  context,
  dict,
  locale,
}: {
  context: GuestContext;
  dict: Dictionary;
  locale: Locale;
}) {
  const g = dict.guestContext;
  const name = context.displayName ?? "";

  return (
    <aside
      aria-label={g.label}
      className="flex w-[280px] shrink-0 flex-col gap-5 border-l border-[var(--fonda-border-2)] bg-[var(--fonda-surface)] p-5"
    >
      <div className="flex items-start gap-3">
        <GuestAvatar name={name || "?"} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[var(--fonda-text)]">
            {name || g.notMatched}
          </p>
          {context.priorStays > 0 ? (
            <p className="mt-0.5 text-[12px] text-[var(--fonda-text-3)]">
              {t(
                plural(context.priorStays, g.returningOne, g.returningOther),
                { count: context.priorStays }
              )}
            </p>
          ) : null}
        </div>
      </div>

      {/* No booking matched: say so once, quietly, and offer nothing. There is
          no action that would help — the guest record does not exist either. */}
      {!context.matched ? (
        <p className="text-[13px] leading-relaxed text-[var(--fonda-text-3)]">
          {g.notMatched}
        </p>
      ) : (
        <>
          <Section title={g.stay}>
            <Fact
              label={g.stay}
              value={stayDates(locale, context.arrival, context.departure)}
            />
            <Fact
              label={g.nights}
              value={
                context.nights
                  ? t(plural(context.nights, g.nightsOne, g.nights), {
                      count: context.nights,
                    })
                  : null
              }
            />
            <Fact label={g.roomType} value={context.roomType} />
          </Section>

          <Section title={g.facts}>
            <Fact
              label={g.nationality}
              value={displayName(locale, "region", context.nationalityCode)}
            />
            <Fact
              label={g.language}
              value={displayName(locale, "language", context.languageCode)}
            />
            <Fact
              label={g.adults}
              value={context.adults ? String(context.adults) : null}
            />
            <Fact
              label={g.children}
              value={context.children ? String(context.children) : null}
            />
          </Section>

          {context.customerId ? (
            <Link
              href={guestHref(locale, context.customerId)}
              className="text-[13px] font-medium text-[var(--fonda-text)] underline-offset-4 transition-colors hover:text-[var(--fonda-text-2)] hover:underline"
            >
              {g.openRecord}
            </Link>
          ) : null}
        </>
      )}
    </aside>
  );
}
