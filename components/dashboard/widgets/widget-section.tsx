import type { ReactNode } from "react";

import {
  EmptyState,
  type EmptyStateIcon,
} from "@/components/dashboard/empty-state";
import { intlLocale, type Locale } from "@/lib/i18n/config";

/**
 * The chrome every Home widget shares (APP_UX_PROPOSAL.md §3.2, §7.4).
 *
 * One quiet heading above the card: the widget's title on the left, a freshness
 * line on the right. A *line*, not a `SourceChip` — ten chips stacked down a
 * page makes it rattle, and Home is the one surface where the whole point is
 * calm. The chip stays for brief sections and draft replies, where there is one
 * of them.
 *
 * The heading lives out here rather than inside each card because it is the
 * thing the registry owns: a widget that can be reordered needs a label that
 * travels with its slot, and the cards themselves must not each invent one.
 * That is why the underlying cards no longer render their own `h2`.
 *
 * Titles are `text-sm font-medium` ink — not the Geist Mono uppercase eyebrow
 * the cards used to carry. An eyebrow is a label *inside* a surface; this is a
 * heading *above* one, and at ten of them the uppercase tracking reads as
 * shouting.
 */
export function WidgetSection({
  id,
  title,
  count,
  countLabel,
  freshness,
  className,
  children,
}: {
  /** Anchor target, e.g. `#occupancy` for the low-occupancy to-do's jump. */
  id?: string;
  title: string;
  /** Rendered as Rox's "(3)". Omit — or pass 0 — to show no badge. */
  count?: number;
  /** Screen-reader wording for `count`; the parenthesised digits are decorative. */
  countLabel?: string;
  /** "synced 06:40" style. Null when the loader has no timestamp to stand on. */
  freshness?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const showCount = typeof count === "number" && count > 0;

  return (
    <section id={id} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        {/* font-medium beats the global `h1,h2,h3 { font-weight:600 }` rule on
            specificity — a class always outranks a type selector. */}
        <h2 className="text-sm font-medium text-foreground">
          {title}
          {showCount ? (
            <>
              <span
                aria-hidden="true"
                className="ml-1.5 tabular-nums text-[var(--fonda-text-3)]"
              >
                ({count})
              </span>
              {countLabel ? (
                <span className="sr-only"> {countLabel}</span>
              ) : null}
            </>
          ) : null}
        </h2>

        {freshness ? (
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--fonda-text-3)]">
            {freshness}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  );
}

/**
 * A widget with nothing to show still renders a card — never a blank gap under
 * its heading (§7.5). `EmptyState` in its compact size: the full size is a
 * gradient panel, and §7.2 allows one gradient per screen, which Home spends on
 * the first-run state.
 */
export function WidgetEmpty({
  icon,
  message,
}: {
  icon: EmptyStateIcon;
  message: string;
}) {
  return (
    <div className="rounded-[16px] bg-card">
      <EmptyState icon={icon} message={message} size="compact" />
    </div>
  );
}

/**
 * A timestamp as the wall clock at the hotel — "06:40". Fixed to 24h (`h23`)
 * in every locale: hotel handover times are written that way on every rota in
 * Europe, and "6:40 AM" in a 11px mono line is three characters of noise.
 *
 * Returns null for a missing or unparseable timestamp, which is the signal for
 * the heading to print no freshness line at all rather than a guess.
 */
export function clockTime(
  locale: Locale,
  timezone: string,
  iso: string | null | undefined
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;

  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}
