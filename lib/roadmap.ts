import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * Product surfaces that started life as roadmap items — the single place that
 * decides what is real yet.
 *
 * One row per feature drives:
 *   1. the quiet gray "Coming soon" badge on its sidebar item (`status`),
 *   2. its page's coming-soon state (`components/dashboard/coming-soon.tsx`),
 *   3. the label and blurb both of those read, in all three languages.
 *
 * When a feature ships, flip `status` to "live": the badge disappears
 * everywhere and the item stops reading as secondary. The four surfaces that
 * were live from day one (dashboard, brief, check-ins, communications) are not
 * listed here — they're the hand-written nav list in the dashboard layout.
 *
 * NOTE (APP_UX_PROPOSAL.md §2.2): the nav is a two-pillar tree, written by
 * hand in `app/[lang]/dashboard/layout.tsx`, and that tree is the *only*
 * source of nav structure — a flat list can't express which pillar owns which
 * sub-page. This file owns label + blurb + coming-soon status per key, and
 * nothing else. Adding a row here does NOT put it in the nav; add it to the
 * tree in the layout as well.
 *
 * Copy is held as `(dict) => …` accessors rather than literal strings so every
 * label and blurb comes from dictionaries/{en,es,ca}.json and all three
 * languages stay in step.
 */

export type FeatureStatus = "live" | "coming-soon";

export interface RoadmapFeature {
  /**
   * Stable id. Doubles as the sidebar icon key (the ICONS map in
   * components/dashboard/sidebar.tsx) and as the empty-state icon key.
   */
  key: string;
  /**
   * Route below the locale prefix, e.g. "/dashboard/reputation".
   *
   * Absent for a **copy-only row**: a future *Home widget* rather than a future
   * page (see `HOME_LOCKED_WIDGETS` below). Those rows exist so the customize
   * panel's locked tiles have a label and a blurb in three languages; there is
   * no page to link to and there never will be, so inventing a route for them
   * would only invite someone to wire a nav row at a URL that 404s.
   */
  route?: string;
  status: FeatureStatus;
  /** Sidebar label and page title. */
  label: (dict: Dictionary) => string;
  /**
   * One line naming what the feature will do, shown on its page while the
   * status is "coming-soon". Say what a GM will get, not "coming soon" again.
   */
  blurb: (dict: Dictionary) => string;
}

/**
 * Not every row below has a page.
 *
 * The eight parked sections — housekeeping, fnb, staff, procurement,
 * finance-reporting, chargeback, ai-management, team-activity — lost their
 * stub pages and their nav rows (APP_UX_PROPOSAL.md §2.4, deletion 0); their
 * routes are redirects to Home now. The rows stay because the customize
 * panel's locked tiles (§3.4, landing in W4) render their label and blurb:
 * that panel is where the roadmap gets sold from here on. The canonical list
 * of what is parked and when each returns is ROADMAP.md §6.
 *
 * So a row here means "this key has copy", not "this key has a page".
 */
export const ROADMAP = [
  {
    // Live since the v3 chat work: /dashboard/chat is the full conversation
    // surface, and the docked bar on every other page is a shortcut into it.
    // The blurb below is kept for the row's shape; it no longer renders.
    // "Ask" in the rail (APP_UX_PROPOSAL.md §2.1) — a place, second icon,
    // above the hairline.
    key: "chat",
    route: "/dashboard/chat",
    status: "live",
    label: (dict: Dictionary) => dict.sidebar.chat,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.chat,
  },

  // --- Operation, the first pillar (APP_UX_PROPOSAL.md §2.2) ---------------
  {
    key: "front-desk-info",
    route: "/dashboard/front-desk/information",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.frontDeskInfo,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.frontDeskInfo,
  },
  {
    // Shared between both pillars (APP_UX_PROPOSAL.md §2.2), so it sits under
    // neither one's path: /dashboard/reputation, not the old
    // /dashboard/front-desk/reputation — "front-desk" is not a section any more.
    key: "reputation",
    route: "/dashboard/reputation",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.reputation,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.reputation,
  },
  {
    // The Guest Experience surface (APP_UX_PROPOSAL.md §5.4).
    key: "guests",
    route: "/dashboard/guests",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.guests,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.guests,
  },

  // --- Commercial, the second pillar (APP_UX_PROPOSAL.md §2.2) -------------
  {
    key: "revenue-management",
    route: "/dashboard/revenue/management",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.revenueManagement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.revenueManagement,
  },
  {
    key: "demand-forecasting",
    route: "/dashboard/revenue/forecasting",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.demandForecasting,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.demandForecasting,
  },
  {
    key: "ota-parity",
    route: "/dashboard/revenue/parity",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.otaParity,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.otaParity,
  },
  {
    key: "upsell-ai",
    route: "/dashboard/revenue/upsell",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.upsellAi,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.upsellAi,
  },
  {
    key: "room-upgrade-ai",
    route: "/dashboard/revenue/upgrades",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.roomUpgradeAi,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.roomUpgradeAi,
  },
  {
    key: "sales-marketing",
    route: "/dashboard/sales-marketing",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.salesMarketing,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.salesMarketing,
  },

  // --- The eight parked sections -------------------------------------------
  //
  // No page and no nav row (see the note above ROADMAP). Their routes redirect
  // to Home; these rows exist so the customize panel's locked tiles have copy.
  {
    key: "staff",
    route: "/dashboard/operations/staff",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.staff,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.staff,
  },
  {
    key: "housekeeping",
    route: "/dashboard/operations/housekeeping",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.housekeeping,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.housekeeping,
  },
  {
    key: "fnb",
    route: "/dashboard/operations/fnb",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.fnb,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.fnb,
  },
  {
    key: "procurement",
    route: "/dashboard/operations/procurement",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.procurement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.procurement,
  },
  {
    key: "finance-reporting",
    route: "/dashboard/finance/reporting",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.financeReporting,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.financeReporting,
  },
  {
    key: "chargeback",
    route: "/dashboard/finance/chargeback",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.chargeback,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.chargeback,
  },
  {
    key: "ai-management",
    route: "/dashboard/oversight/ai",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.aiManagement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.aiManagement,
  },
  {
    key: "team-activity",
    route: "/dashboard/oversight/team",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.sidebar.teamActivity,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.teamActivity,
  },

  // --- Future Home widgets (APP_UX_PROPOSAL.md §3.4) ------------------------
  //
  // No page, no nav row and no route: these are the locked tiles at the foot of
  // Home's customize panel, and a locked tile is a *widget* someone will one day
  // tick on — not a section they can navigate to. They are here for the same
  // reason the parked eight are: this file owns roadmap copy in three languages,
  // and the panel is where the roadmap is sold from now on.
  //
  // `HOME_LOCKED_WIDGETS` below is the list the panel actually renders; two of
  // its seven (ota-parity, housekeeping) are parked *sections* above that happen
  // to make good widgets too, so they are reused rather than duplicated.
  {
    key: "adr-revpar",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.roadmap.label["adr-revpar"],
    blurb: (dict: Dictionary) => dict.roadmap.blurb["adr-revpar"],
  },
  {
    key: "pickup-pace",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.roadmap.label["pickup-pace"],
    blurb: (dict: Dictionary) => dict.roadmap.blurb["pickup-pace"],
  },
  {
    key: "review-score",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.roadmap.label["review-score"],
    blurb: (dict: Dictionary) => dict.roadmap.blurb["review-score"],
  },
  {
    key: "upsell-revenue",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.roadmap.label["upsell-revenue"],
    blurb: (dict: Dictionary) => dict.roadmap.blurb["upsell-revenue"],
  },
  {
    key: "labour-cost",
    status: "coming-soon",
    label: (dict: Dictionary) => dict.roadmap.label["labour-cost"],
    blurb: (dict: Dictionary) => dict.roadmap.blurb["labour-cost"],
  },

  // --- How to add a future roadmap feature ---------------------------------
  //
  // The nav is a two-pillar tree, so a new feature is a *sub-page of a pillar*
  // — decide whether Operation or Commercial owns it before you start. Copy
  // the row below, uncomment it, and edit the four values.
  //
  // {
  //   key: "groups",
  //   route: "/dashboard/revenue/groups",
  //   status: "coming-soon",
  //   label: (dict: Dictionary) => dict.sidebar.groups,
  //   blurb: (dict: Dictionary) => dict.roadmap.blurb.groups,
  // },
  //
  // Three small things have to exist alongside it:
  //
  //   · the two strings, in all three dictionaries — `sidebar.groups` and
  //     `roadmap.blurb.groups`. Keep en/es/ca structurally identical.
  //
  //   · a page file at app/[lang]/dashboard/revenue/groups/page.tsx — copy
  //     app/[lang]/dashboard/guests/page.tsx and swap the key (5 lines).
  //
  //   · an entry in the owning pillar's `children` array in
  //     app/[lang]/dashboard/layout.tsx — for the example above, Commercial's.
  //     THIS is what puts it in the nav (see the note at the top of this file).
  //     Use the `soon()` helper there:
  //     `soon("groups", { sectionKey: "commercial" })`. No child route sits
  //     under a pillar's path — the pillars are groupings, not pages — so
  //     `sectionKey` is required on every child, and an icon under the new key
  //     in the ICONS map in components/dashboard/sidebar.tsx is what keeps the
  //     panel row from falling back to a bullet.
  //
  // Optionally, a marquee feature can claim its own empty-state glyph by adding
  // its key to EmptyStateIcon in components/dashboard/empty-state.tsx. Without
  // one it falls back to the generic clock, which is the intended default —
  // most rows should not have one.
] as const satisfies readonly RoadmapFeature[];

/** Keys of the rows above — a typo in a page or nav lookup won't compile. */
export type RoadmapKey = (typeof ROADMAP)[number]["key"];

/**
 * The locked tiles at the foot of Home's customize panel, in the order they are
 * drawn (APP_UX_PROPOSAL.md §3.4).
 *
 * A GM meets each of these at the moment they are deciding what they want to
 * see every morning, which is both the honest place to show an unbuilt feature
 * and the one place a click on it means something: the panel logs it
 * (`home_locked_widget_clicked`), so what gets built next is settled by demand
 * rather than by this file.
 *
 * `satisfies readonly RoadmapKey[]` is the guard that matters — a tile can only
 * name a key that has a row above, so a tile can never render blank.
 */
export const HOME_LOCKED_WIDGETS = [
  "adr-revpar",
  "pickup-pace",
  "ota-parity",
  "review-score",
  "upsell-revenue",
  "housekeeping",
  "labour-cost",
] as const satisfies readonly RoadmapKey[];

/** One of the seven tiles above. Narrow on purpose: it is an analytics payload. */
export type HomeLockedWidgetKey = (typeof HOME_LOCKED_WIDGETS)[number];

/** The row for one key. Throws only if a row was deleted without its page. */
export function roadmapFeature(key: RoadmapKey): RoadmapFeature {
  const feature = ROADMAP.find((item) => item.key === key);
  if (!feature) {
    throw new Error(`No roadmap feature named "${key}" — see lib/roadmap.ts`);
  }
  return feature;
}
