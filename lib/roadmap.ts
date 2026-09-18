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
 * NOTE (nav reorg, NAV_REORG_SPEC.md §3): the sidebar is a two-level tree now,
 * and that tree is written by hand in `app/[lang]/dashboard/layout.tsx` — a
 * flat list can't express which section owns which sub-page. So `inNav` no
 * longer decides what the rail shows; it is false on every row below, and this
 * file's job is to be the source of truth for label + blurb + coming-soon
 * status per key. Adding a row here does NOT put it in the nav; add it to the
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
  /** Route below the locale prefix, e.g. "/dashboard/analytics". */
  route: string;
  status: FeatureStatus;
  /**
   * Legacy flag from the flat rail. The grouped tree in the dashboard layout
   * decides placement now (see the note at the top), so this is false
   * everywhere; `roadmapNavFeatures()` reads it and is kept for the one
   * caller that may still want a flat list.
   */
  inNav: boolean;
  /** Sidebar label and page title. */
  label: (dict: Dictionary) => string;
  /**
   * One line naming what the feature will do, shown on its page while the
   * status is "coming-soon". Say what a GM will get, not "coming soon" again.
   */
  blurb: (dict: Dictionary) => string;
}

export const ROADMAP = [
  {
    // Superseded by Revenue › Dashboard (NAV_REORG_SPEC.md §6, decision 1).
    // The route still resolves — old links and bookmarks keep working — but it
    // is out of the nav tree; Revenue's own dashboard is the surface now.
    key: "analytics",
    route: "/dashboard/analytics",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.analytics,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.analytics,
  },
  {
    // Live since the v3 chat work: /dashboard/chat is the full conversation
    // surface, and the docked bar on every other page is a shortcut into it.
    // The blurb below is kept for the row's shape; it no longer renders.
    // Cross-cutting, so it is deliberately not one of the eight rail sections
    // (NAV_REORG_SPEC.md §6, decision 2) — it is reached from the docked bar.
    key: "chat",
    route: "/dashboard/chat",
    status: "live",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.chat,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.chat,
  },
  {
    // Back in the nav under Front Desk (NAV_REORG_SPEC.md §3), still a stub:
    // in-house guests email rarely enough that their mail stays in
    // Communications until real in-house messaging (WhatsApp and the like)
    // exists. Its placement comes from the tree in the layout, not `inNav`.
    key: "concierge",
    route: "/dashboard/concierge",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.concierge,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.concierge,
  },

  // --- The grouped sections (NAV_REORG_SPEC.md §3) -------------------------
  //
  // Every row below is a stub the nav tree in app/[lang]/dashboard/layout.tsx
  // points at. A section's own row IS its "Dashboard" sub-page: the route is
  // the bare section path, and `label` is the *section* name because that is
  // what the page's own heading should say — the submenu calls it
  // "Dashboard" instead, from `sidebar.dashboard`.

  // Front Desk
  {
    key: "front-desk",
    route: "/dashboard/front-desk",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.frontDesk,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.frontDesk,
  },
  {
    key: "front-desk-info",
    route: "/dashboard/front-desk/information",
    status: "coming-soon",
    inNav: false,
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
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.reputation,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.reputation,
  },

  // --- Operation, the new pillar (APP_UX_PROPOSAL.md §2.2) -----------------
  //
  // Two surfaces that don't exist yet but have a place in the tree from day
  // one. `communications-in-house` is the second Communications window and
  // supersedes `concierge`; `guests` is the Guest Experience surface (§5.4).
  {
    key: "communications-in-house",
    route: "/dashboard/communications/in-house",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.inHouse,
    blurb: (dict: Dictionary) => dict.roadmap.blurb["communications-in-house"],
  },
  {
    key: "guests",
    route: "/dashboard/guests",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.guests,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.guests,
  },

  // Revenue — supersedes the standalone Analytics item (§6, decision 1).
  {
    key: "revenue",
    route: "/dashboard/revenue",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.revenue,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.revenue,
  },
  {
    key: "revenue-management",
    route: "/dashboard/revenue/management",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.revenueManagement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.revenueManagement,
  },
  {
    key: "demand-forecasting",
    route: "/dashboard/revenue/forecasting",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.demandForecasting,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.demandForecasting,
  },
  {
    key: "ota-parity",
    route: "/dashboard/revenue/parity",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.otaParity,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.otaParity,
  },
  {
    key: "upsell-ai",
    route: "/dashboard/revenue/upsell",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.upsellAi,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.upsellAi,
  },
  {
    key: "room-upgrade-ai",
    route: "/dashboard/revenue/upgrades",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.roomUpgradeAi,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.roomUpgradeAi,
  },

  // Sales & Marketing — one coming-soon page, no sub-pages.
  {
    key: "sales-marketing",
    route: "/dashboard/sales-marketing",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.salesMarketing,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.salesMarketing,
  },

  // Operations
  {
    key: "operations",
    route: "/dashboard/operations",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.operations,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.operations,
  },
  {
    key: "staff",
    route: "/dashboard/operations/staff",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.staff,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.staff,
  },
  {
    key: "housekeeping",
    route: "/dashboard/operations/housekeeping",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.housekeeping,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.housekeeping,
  },
  {
    key: "fnb",
    route: "/dashboard/operations/fnb",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.fnb,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.fnb,
  },
  {
    key: "procurement",
    route: "/dashboard/operations/procurement",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.procurement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.procurement,
  },

  // Finance
  {
    key: "finance",
    route: "/dashboard/finance",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.finance,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.finance,
  },
  {
    key: "finance-reporting",
    route: "/dashboard/finance/reporting",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.financeReporting,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.financeReporting,
  },
  {
    key: "chargeback",
    route: "/dashboard/finance/chargeback",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.chargeback,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.chargeback,
  },

  // Oversight / Management
  {
    key: "oversight",
    route: "/dashboard/oversight",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.oversight,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.oversight,
  },
  {
    key: "ai-management",
    route: "/dashboard/oversight/ai",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.aiManagement,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.aiManagement,
  },
  {
    key: "team-activity",
    route: "/dashboard/oversight/team",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.teamActivity,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.teamActivity,
  },

  // --- How to add a future roadmap feature ---------------------------------
  //
  // The nav is a two-level tree now, so a new feature is a *sub-page of a
  // section* — decide which of the eight sections owns it before you start.
  // Copy the row below, uncomment it, and edit the four values.
  //
  // {
  //   key: "groups",
  //   route: "/dashboard/revenue/groups",
  //   status: "coming-soon",
  //   inNav: false,
  //   label: (dict: Dictionary) => dict.sidebar.groups,
  //   blurb: (dict: Dictionary) => dict.roadmap.blurb.groups,
  // },
  //
  // Four small things have to exist alongside it:
  //
  //   · the two strings, in all three dictionaries — `sidebar.groups` and
  //     `roadmap.blurb.groups`. Keep en/es/ca structurally identical.
  //
  //   · a page file at app/[lang]/dashboard/revenue/groups/page.tsx — copy
  //     app/[lang]/dashboard/analytics/page.tsx and swap the key (5 lines).
  //
  //   · an entry in the owning section's `children` array in
  //     app/[lang]/dashboard/layout.tsx — for the example above, Revenue's.
  //     THIS is what puts it in the nav; `inNav` no longer does (see the note
  //     at the top of this file), which is why the row above sets it false.
  //     Use the `soon()` helper there: `soon("groups", undefined, "revenue")`.
  //     The third argument is `sectionKey`, and it only matters when the route
  //     doesn't sit under the section's path — a page at /dashboard/revenue/*
  //     is found by prefix, so it can be omitted; a live page parked at a
  //     top-level URL (the Front Desk four) needs it to keep its section lit.
  //
  //   · nothing else, if the section already exists. A *new section* is more
  //     work: it needs its own row here (the section's row doubles as its
  //     "Dashboard" sub-page), a top-level entry in the layout's tree, and an
  //     icon under its key in the ICONS map in components/dashboard/sidebar.tsx
  //     — the rail draws sections, so a section without an icon falls back to a
  //     gear. Sub-pages need no icon at all: the submenu panel and the mobile
  //     accordion render children as text.
  //
  // Optionally, a marquee feature can claim its own empty-state glyph by adding
  // its key to EmptyStateIcon in components/dashboard/empty-state.tsx. Without
  // one it falls back to the generic clock, which is the intended default —
  // most rows should not have one.
] as const satisfies readonly RoadmapFeature[];

/** Keys of the rows above — a typo in a page or nav lookup won't compile. */
export type RoadmapKey = (typeof ROADMAP)[number]["key"];

/** The row for one key. Throws only if a row was deleted without its page. */
export function roadmapFeature(key: RoadmapKey): RoadmapFeature {
  const feature = ROADMAP.find((item) => item.key === key);
  if (!feature) {
    throw new Error(`No roadmap feature named "${key}" — see lib/roadmap.ts`);
  }
  return feature;
}

/** The rows that belong in the dashboard sidebar, in order. */
export function roadmapNavFeatures(): RoadmapFeature[] {
  return ROADMAP.filter((feature) => feature.inNav);
}
