import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { HOME_WIDGETS, type HomeWidgetDef, type HomeWidgetKey } from "@/lib/home-widgets";
import type { Database } from "@/types/database";

/**
 * Home's per-user layout (APP_UX_PROPOSAL.md §3.5).
 *
 * `lib/home-widgets.ts` says what the widgets *are* — their keys, their widths,
 * which one is pinned. This says what one user wants to see and in what order.
 * The two are deliberately separate: width and pinning are product decisions
 * and never the user's, order and visibility are the user's and never ours.
 *
 * The contract with the database is loose on purpose, because the stored array
 * is a snapshot of a registry that keeps moving:
 *
 * - **No row means defaults**, resolved from `users.role`. Nothing is written
 *   at signup, so a user who never opens Customize has no row for their whole
 *   life with the product.
 * - **Unknown keys are dropped on read.** Retiring a widget is a one-line edit
 *   to the registry, not a migration over everyone's saved layout.
 * - **Missing keys are appended, enabled.** Ship a new widget and every
 *   existing user sees it at the bottom of Home rather than never seeing it.
 *
 * Read through the RLS-scoped server client, never the service role: this runs
 * for a signed-in user and the row *is* that user's (CLAUDE.md). The table
 * holds widget keys and booleans — no guest data — but the tenant scoping is
 * the database's job either way.
 */

type Db = SupabaseClient<Database>;
type Role = Database["public"]["Enums"]["user_role"];

/** What's in the `widgets` column: order is render order, `enabled` is the checkbox. */
export type StoredLayout = { key: HomeWidgetKey; enabled: boolean }[];

/**
 * Every key a stored layout may contain — the registry minus the pinned ones.
 * "needs-you" is pinned by the registry and is never in the array: a user who
 * could reorder it could bury the one thing Home exists to answer.
 */
const STORABLE_KEYS: readonly HomeWidgetKey[] = HOME_WIDGETS.filter(
  (def) => !def.pinned
).map((def) => def.key);

const STORABLE = new Set<HomeWidgetKey>(STORABLE_KEYS);

/**
 * The role defaults. Both orders contain every storable key — the difference is
 * sequence and a single toggle each, not which widgets exist, so switching role
 * never makes a widget vanish from the Customize list.
 *
 * An owner opens Home for the shape of the business: occupancy first, then the
 * fortnight ahead. A manager opens it for the shape of the day: who is arriving,
 * who is waiting on an answer. That is the whole of §3.5's "defaults come from
 * `users.role`".
 *
 * The two off-by-default toggles are the ones that would otherwise read as
 * noise: sync health is plumbing an owner may want to see and a manager can do
 * nothing about, and the VIP-without-a-note nudge is a front-desk task an owner
 * is not the one to action.
 */
const DEFAULTS: Record<Role, StoredLayout> = {
  owner: [
    { key: "numbers", enabled: true },
    { key: "outlook", enabled: true },
    { key: "brief", enabled: true },
    { key: "needs-reply", enabled: true },
    { key: "inbox-pulse", enabled: true },
    { key: "arrivals-today", enabled: true },
    { key: "departures-today", enabled: true },
    { key: "sync-health", enabled: true },
    { key: "vip-no-note", enabled: false },
  ],
  manager: [
    { key: "arrivals-today", enabled: true },
    { key: "needs-reply", enabled: true },
    { key: "brief", enabled: true },
    { key: "numbers", enabled: true },
    { key: "departures-today", enabled: true },
    { key: "vip-no-note", enabled: true },
    { key: "outlook", enabled: true },
    { key: "inbox-pulse", enabled: true },
    { key: "sync-health", enabled: false },
  ],
};

/** The layout a user gets before they have ever opened Customize. */
export function defaultLayoutFor(role: Role): StoredLayout {
  // Copied, not shared: callers append to the result (see `reconcile`), and a
  // module-level constant that grows on read is a bug that only shows up on the
  // second request.
  return DEFAULTS[role].map((entry) => ({ ...entry }));
}

/**
 * Brings a stored array back in step with today's registry: drops what no
 * longer exists, drops "needs-you" if an old client ever wrote it, dedupes, and
 * appends anything shipped since the user last saved.
 */
function reconcile(stored: StoredLayout): StoredLayout {
  const seen = new Set<HomeWidgetKey>();
  const resolved: StoredLayout = [];

  for (const entry of stored) {
    if (!STORABLE.has(entry.key) || seen.has(entry.key)) continue;
    seen.add(entry.key);
    resolved.push(entry);
  }

  // New widgets land at the end, switched on. Enabled rather than off because a
  // widget nobody can see is a widget nobody can judge — and it is one drag
  // away from wherever they want it.
  for (const key of STORABLE_KEYS) {
    if (!seen.has(key)) resolved.push({ key, enabled: true });
  }

  return resolved;
}

/** Narrows the untyped `jsonb` to the entries we recognise. Anything else is dropped. */
function parseStored(widgets: unknown): StoredLayout | null {
  if (!Array.isArray(widgets)) return null;

  const entries: StoredLayout = [];
  for (const raw of widgets) {
    if (typeof raw !== "object" || raw === null) continue;
    const { key, enabled } = raw as { key?: unknown; enabled?: unknown };
    if (typeof key !== "string") continue;
    // `enabled` absent is treated as on: a hand-written row that lists keys
    // without the flag reads as "these, in this order", which is what it means.
    entries.push({
      key: key as HomeWidgetKey,
      enabled: enabled === undefined ? true : Boolean(enabled),
    });
  }
  return entries;
}

/**
 * The user's resolved layout — their stored order reconciled with the registry,
 * or the role defaults when they have no row.
 *
 * Never throws and never returns an empty array: a failed read is a Home that
 * looks like a fresh account's, not a blank page at 7am.
 */
export async function loadHomeLayout(
  supabase: Db,
  userId: string,
  role: Role
): Promise<StoredLayout> {
  const { data, error } = await supabase
    .from("dashboard_layouts")
    .select("widgets")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return defaultLayoutFor(role);

  const stored = parseStored(data.widgets);
  if (!stored) return defaultLayoutFor(role);

  return reconcile(stored);
}

/**
 * The registry entries Home should actually render, in order: the pinned
 * widgets first whatever the user did, then their enabled ones.
 *
 * This is the pair to `loadHomeLayout` — the page composes from it rather than
 * from `orderedHomeWidgets()`, which is now only the unpersonalised fallback.
 */
export function homeWidgetsForLayout(layout: StoredLayout): HomeWidgetDef[] {
  const byKey = new Map(HOME_WIDGETS.map((def) => [def.key, def]));
  return [
    ...HOME_WIDGETS.filter((def) => def.pinned),
    ...layout
      .filter((entry) => entry.enabled)
      .map((entry) => byKey.get(entry.key))
      .filter((def): def is HomeWidgetDef => def !== undefined),
  ];
}

export type SaveLayoutResult = { ok: true } | { error: string };

/**
 * Persists a layout. Validates against the registry before writing so a
 * malformed or hostile payload can never put a key in the column that read-time
 * reconciliation would then silently drop — a saved layout the user cannot see
 * is worse than a rejected save.
 *
 * Upsert on `user_id` (the primary key): the row's existence is an
 * implementation detail the caller shouldn't have to track.
 */
export async function saveHomeLayout(
  supabase: Db,
  userId: string,
  hotelId: string,
  layout: StoredLayout
): Promise<SaveLayoutResult> {
  const seen = new Set<HomeWidgetKey>();
  for (const entry of layout) {
    if (entry.key === "needs-you") {
      return { error: "\"Needs you today\" can't be moved or removed." };
    }
    if (!STORABLE.has(entry.key)) {
      return { error: `Unknown widget "${entry.key}".` };
    }
    if (seen.has(entry.key)) {
      return { error: `Widget "${entry.key}" appears twice.` };
    }
    seen.add(entry.key);
  }

  const { error } = await supabase.from("dashboard_layouts").upsert(
    {
      user_id: userId,
      hotel_id: hotelId,
      widgets: layout.map((entry) => ({ key: entry.key, enabled: entry.enabled })),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: `Couldn't save your layout: ${error.message}` };

  return { ok: true };
}
