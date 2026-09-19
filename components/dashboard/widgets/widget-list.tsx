import Link from "next/link";

import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { cn } from "@/lib/utils";

/**
 * The list card three Home widgets share — arrivals, departures, VIPs without
 * a note (APP_UX_PROPOSAL.md §3.3).
 *
 * All three are the same object: a short column of guests, each row a name, a
 * quiet detail, and one piece of right-aligned meta, each row a link. Writing
 * that out three times would guarantee they drifted apart — a different row
 * height here, a different truncation there — on a page whose whole job is to
 * read as one calm surface.
 *
 * It deliberately does *not* wrap `NeedsReplyCard`: that card carries urgency
 * notes and their one red, which none of these lists has. Same silhouette,
 * different content, so they share the shape and not the semantics.
 *
 * A server component. Rows arrive already ordered and already capped by their
 * widget; this file only draws them.
 */

/** Rows shown before a list defers to its full surface. */
export const WIDGET_LIST_ROWS = 8;

export interface WidgetListRow {
  /** Stable React key — the reservation id. */
  key: string;
  /**
   * Where the row goes. Null renders the row without a link rather than a dead
   * one: on the arrivals page a row opens the guest record, and a booking with
   * no guest profile has no record to open.
   */
  href?: string | null;
  /** Display name. Never an email address or any other contact detail. */
  name: string;
  /** Quiet second line: a room type, a room number. */
  detail?: string | null;
  /** Right-aligned mono meta: an ETA, a check-out time. */
  meta?: string | null;
  /** A small neutral tag beside the name, e.g. "returning". */
  tag?: string | null;
}

/** The row box itself: shared so a linkless row can't drift out of rhythm. */
const ROW = "flex items-start justify-between gap-4 px-6 py-4";

/** The row's contents — one copy, drawn inside a link or a plain div. */
function RowBody({ row }: { row: WidgetListRow }) {
  return (
    <>
      <span className="flex min-w-0 items-start gap-3">
        <GuestAvatar name={row.name} className="mt-0.5" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {row.name}
            </span>
            {row.tag ? (
              // A chip, so full-round is allowed (§6's corner scale) —
              // and warm-neutral, never tinted: the page's one accent
              // belongs to the occupancy strip.
              <span className="shrink-0 rounded-full bg-[var(--fonda-surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fonda-text-3)]">
                {row.tag}
              </span>
            ) : null}
          </span>
          {row.detail ? (
            <span className="truncate text-sm text-muted-foreground">
              {row.detail}
            </span>
          ) : null}
        </span>
      </span>

      {row.meta ? (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--fonda-text-3)]">
          {row.meta}
        </span>
      ) : null}
    </>
  );
}

export function WidgetList({
  rows,
  footer,
}: {
  rows: WidgetListRow[];
  /** The "+N more" door. Omitted when the list is showing everything. */
  footer?: { href: string; label: string } | null;
}) {
  return (
    // overflow-hidden so a row's hover fill is clipped by the 18px corners.
    <div className="flex flex-col overflow-hidden rounded-[18px] bg-card shadow-card">
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <li key={row.key}>
            {row.href ? (
              <Link
                href={row.href}
                className={cn(ROW, "transition-colors hover:bg-muted")}
              >
                <RowBody row={row} />
              </Link>
            ) : (
              <div className={ROW}>
                <RowBody row={row} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {footer ? (
        <Link
          href={footer.href}
          className="border-t border-border px-6 py-3.5 text-[13px] text-[var(--fonda-text-2)] transition-colors hover:bg-muted hover:text-foreground"
        >
          {footer.label}
        </Link>
      ) : null}
    </div>
  );
}
