import "server-only";

/**
 * The Home widget registry (APP_UX_PROPOSAL.md §3.2–§3.3).
 *
 * Home used to be a hand-stacked page: whatever order `page.tsx` happened to
 * render its cards in *was* the layout. This is the same ten-second snapshot,
 * but the order now lives in data — one ordered array — so the page becomes a
 * composer over it rather than the layout itself.
 *
 * Two rules the registry encodes, both deliberate:
 *
 * - **Width is declared per widget, never chosen by the user.** §3.2: "pick and
 *   order, not resize". A GM who can also resize can make Home ugly, and a
 *   half-width occupancy strip is unreadable at 375px.
 * - **"Needs you today" is pinned.** It is the product's promise — the answer to
 *   the one question a GM opens this page with — so it is always first and
 *   cannot be removed. Everything below it is the user's.
 *
 * All ten keys are declared here even though only five have renderers today.
 * Freezing the key set now means the persistence layer (§3.5, a later step)
 * never has to migrate a stored layout when the remaining renderers land: an
 * unknown key is ignored on read, and a declared-but-unrendered key simply
 * doesn't appear.
 */

export type HomeWidgetKey =
  | "needs-you"
  | "brief"
  | "numbers"
  | "outlook"
  | "needs-reply"
  | "arrivals-today"
  | "departures-today"
  | "vip-no-note"
  | "inbox-pulse"
  | "sync-health";

export interface HomeWidgetDef {
  key: HomeWidgetKey;
  /** `full` spans both columns of Home's 2-col grid; `half` takes one. */
  width: "full" | "half";
  /** Pinned widgets sort first and can never be removed. */
  pinned?: boolean;
}

/**
 * Home's default order. This is the whole layout: the page walks this array and
 * renders what it can.
 */
export const HOME_WIDGETS: readonly HomeWidgetDef[] = [
  { key: "needs-you", width: "full", pinned: true },
  { key: "brief", width: "full" },
  { key: "numbers", width: "full" },
  { key: "outlook", width: "full" },
  { key: "needs-reply", width: "half" },
  { key: "arrivals-today", width: "half" },
  { key: "departures-today", width: "half" },
  { key: "vip-no-note", width: "half" },
  { key: "inbox-pulse", width: "half" },
  { key: "sync-health", width: "half" },
];

/**
 * The registry in the order the page renders it — pinned widgets first, the
 * rest in declaration order. Sorting here rather than trusting the array's
 * shape means a future reorder (or a stored per-user layout) can't demote the
 * pinned widget by accident.
 */
export function orderedHomeWidgets(
  widgets: readonly HomeWidgetDef[] = HOME_WIDGETS
): HomeWidgetDef[] {
  // Array.prototype.sort is stable, so equal-priority widgets keep their
  // declared order.
  return [...widgets].sort(
    (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  );
}
