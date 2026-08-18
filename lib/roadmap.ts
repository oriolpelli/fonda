import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * Product surfaces that started life as roadmap items — the single place that
 * decides what is real yet.
 *
 * One row per feature drives all three of the places it shows up:
 *   1. whether it appears in the dashboard sidebar (`inNav`),
 *   2. the quiet gray "Coming soon" badge on that sidebar item (`status`),
 *   3. its page's coming-soon state (`components/dashboard/coming-soon.tsx`).
 *
 * When a feature ships, flip `status` to "live": the badge disappears
 * everywhere and the item stops reading as secondary. The four surfaces that
 * were live from day one (dashboard, brief, check-ins, communications) are not
 * listed here — they're the hand-written nav list in the dashboard layout.
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
  /** Show it in the dashboard sidebar? */
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
    key: "analytics",
    route: "/dashboard/analytics",
    status: "coming-soon",
    inNav: true,
    label: (dict: Dictionary) => dict.sidebar.analytics,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.analytics,
  },
  {
    key: "chat",
    route: "/dashboard/chat",
    status: "coming-soon",
    inNav: true,
    label: (dict: Dictionary) => dict.sidebar.chat,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.chat,
  },
  {
    // Parked, not deleted: in-house guests email rarely enough that their mail
    // stays in Communications for now. The route still resolves — so it needs a
    // presentable page — but it is deliberately out of the sidebar until real
    // in-house messaging (WhatsApp and the like) exists. Flip `inNav` to true
    // to put it back in the nav.
    key: "concierge",
    route: "/dashboard/concierge",
    status: "coming-soon",
    inNav: false,
    label: (dict: Dictionary) => dict.sidebar.concierge,
    blurb: (dict: Dictionary) => dict.roadmap.blurb.concierge,
  },

  // --- How to add a future roadmap feature ---------------------------------
  //
  // Copy the row below, uncomment it, and edit the four values. That is the
  // whole change here — no new components.
  //
  // {
  //   key: "revenue",
  //   route: "/dashboard/revenue",
  //   status: "coming-soon",
  //   inNav: true,
  //   label: (dict: Dictionary) => dict.sidebar.revenue,
  //   blurb: (dict: Dictionary) => dict.roadmap.blurb.revenue,
  // },
  //
  // Three small things have to exist alongside it:
  //   · the two strings, in all three dictionaries — `sidebar.revenue` and
  //     `roadmap.blurb.revenue`;
  //   · a page file at app/[lang]/dashboard/revenue/page.tsx — copy
  //     app/[lang]/dashboard/analytics/page.tsx and swap the key (5 lines);
  //   · optionally a sidebar icon under the same key in the ICONS map in
  //     components/dashboard/sidebar.tsx (without one it falls back to a
  //     generic icon, which is fine).
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
