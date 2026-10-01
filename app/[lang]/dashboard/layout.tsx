import { redirect } from "next/navigation";

import { logout } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AskYourHotel } from "@/components/dashboard/ask-your-hotel";
import { deriveConnectionState } from "@/components/dashboard/connection-status";
import { SetupBanner } from "@/components/dashboard/setup-banner";
import { DictionaryProvider } from "@/components/i18n/dictionary-provider";
import {
  Sidebar,
  type NavBadge,
  type NavItem,
} from "@/components/dashboard/sidebar";
import { getHotel, getSessionProfile } from "@/lib/auth";
import {
  DASHBOARD_CLIENT_NAMESPACES,
  pickNamespaces,
} from "@/lib/i18n/client-dictionary";
import { localizedHref } from "@/lib/i18n/navigation";
import { plural } from "@/lib/i18n/format";
import { loadInboxBadges } from "@/lib/inbox";
import { roadmapFeature, type RoadmapKey } from "@/lib/roadmap";
import { timed } from "@/lib/timing";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  // The sidebar badges start now and are NOT awaited. They are the slowest
  // thing the layout reads — a chain of three, to split unanswered mail by
  // stay window — and the whole page shell used to wait for them on every
  // hard load (docs/audits/2026-10-01-performance.md §4.4). The promise goes to
  // the client sidebar, which shows the two counts when they land. It never
  // rejects: loadInboxBadges fails soft to zero.
  const inboxBadges = timed("layout.badges", loadInboxBadges());

  // Who, and which hotel — at once; neither needs the other (the hotel row is
  // scoped by RLS, not by the profile). Each is resolved once per request and
  // shared with the page rendering under this layout (lib/auth.ts).
  const [user, hotel] = await Promise.all([
    timed("layout.session", getSessionProfile()),
    timed("layout.hotel", getHotel()),
  ]);

  // One window's badge, worded for screen readers, as a promise the sidebar
  // reads with `use()` inside its own Suspense.
  const badgeFor = (window: "inHouse" | "upcoming"): Promise<NavBadge> =>
    inboxBadges.then((badges) => ({
      count: badges[window].count,
      alert: badges[window].alert,
      srLabel: plural(
        badges[window].count,
        dict.sidebar.waitingOne,
        dict.sidebar.waitingOther
      ),
    }));

  // Proxy already guards this route; this is defense-in-depth so the page
  // never renders for an unauthenticated user.
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  // A signed-up user without a hotel hasn't onboarded yet.
  if (!user.hotelId) {
    redirect(localizedHref(locale, "/onboarding"));
  }

  const connectionState = deriveConnectionState(
    hotel?.pms_connected ?? false,
    hotel?.last_synced_at ?? null
  );

  // Everything that isn't built yet takes its label, blurb and "Coming soon"
  // status from lib/roadmap.ts, so all three languages stay in step. The
  // *placement* is here, though: the rail is a two-level tree now
  // (APP_UX_PROPOSAL.md §2.2), and a flat list can't say which pillar owns what.
  const soon = (
    key: RoadmapKey,
    {
      label,
      sectionKey,
      group,
      canonicalSectionKey,
    }: {
      /** Overrides the roadmap row's own label, when the nav calls it something else. */
      label?: string;
      sectionKey?: string;
      /** Sub-group inside the panel — see `NavItem.group`. */
      group?: string;
      /** Owner of the active state for a row that sits in both panels. */
      canonicalSectionKey?: string;
    } = {}
  ): NavItem => {
    const feature = roadmapFeature(key);
    // A copy-only row (a future Home widget, not a future page) has no route to
    // link to. Loud rather than `href="undefined"`: it can only ever be a typo
    // in the tree below, and it is a build-time one.
    if (!feature.route) {
      throw new Error(
        `Roadmap row "${key}" has no route — it is a widget row, not a nav section.`
      );
    }
    return {
      key,
      label: label ?? feature.label(dict),
      href: localizedHref(locale, feature.route),
      comingSoon: feature.status === "coming-soon",
      comingSoonLabel: dict.roadmap.badge,
      ...(sectionKey ? { sectionKey } : {}),
      ...(group ? { group } : {}),
      ...(canonicalSectionKey ? { canonicalSectionKey } : {}),
    };
  };

  // The two-pillar tree (APP_UX_PROPOSAL.md §2.2): Home and Ask are places you
  // always are, Operation and Commercial are where the surface area lives. No
  // child route sits under a pillar's path — the pillars are groupings, not
  // pages — so every child declares its `sectionKey` and the pillar hrefs exist
  // only so the rail has something to hand `isActive`; a section with children
  // opens its panel rather than navigating.
  const navItems: NavItem[] = [
    {
      key: "home",
      label: dict.sidebar.home,
      href: localizedHref(locale, "/dashboard"),
    },
    {
      // Key stays "chat" — the rail and the docked bar both reference it. Only
      // the wording moved: it is "Ask" now, and a place rather than a feature.
      key: "chat",
      label: dict.sidebar.chat,
      href: localizedHref(locale, "/dashboard/chat"),
    },
    {
      // Neither pillar carries `comingSoon`: both have live children, so the
      // section itself is real even where most rows below it are not.
      key: "operation",
      label: dict.sidebar.operation,
      href: localizedHref(locale, "/dashboard/operation"),
      children: [
        {
          key: "brief",
          label: dict.sidebar.brief,
          href: localizedHref(locale, "/dashboard/brief"),
          sectionKey: "operation",
        },
        {
          // "Arrivals & departures" — it covers both now, and the route says so
          // (§5.2). /dashboard/checkins is a redirect kept for old links.
          key: "arrivals",
          label: dict.sidebar.arrivals,
          href: localizedHref(locale, "/dashboard/arrivals"),
          sectionKey: "operation",
        },
        {
          // Both Communications windows are live as of W6 (§5.3), so neither
          // is a roadmap stub any more and the badge splits across them. The
          // two counts add up to what the single badge showed before.
          key: "communications-in-house",
          label: dict.sidebar.inHouse,
          href: localizedHref(locale, "/dashboard/communications/in-house"),
          sectionKey: "operation",
          group: "communications",
          badge: badgeFor("inHouse"),
        },
        {
          key: "communications",
          label: dict.sidebar.upcoming,
          href: localizedHref(locale, "/dashboard/communications/upcoming"),
          sectionKey: "operation",
          group: "communications",
          badge: badgeFor("upcoming"),
        },
        {
          // Live as of W-then (§5.4) — no longer a roadmap stub.
          key: "guests",
          label: dict.sidebar.guests,
          href: localizedHref(locale, "/dashboard/guests"),
          sectionKey: "operation",
        },
        // Shared with Commercial, and Operation owns the active state — see
        // `NavItem.canonicalSectionKey`. Both copies say so.
        soon("reputation", {
          sectionKey: "operation",
          canonicalSectionKey: "operation",
        }),
        soon("front-desk-info", { sectionKey: "operation" }),
      ],
    },
    {
      key: "commercial",
      label: dict.sidebar.commercial,
      href: localizedHref(locale, "/dashboard/commercial"),
      children: [
        soon("reputation", {
          sectionKey: "commercial",
          canonicalSectionKey: "operation",
        }),
        soon("revenue-management", { sectionKey: "commercial" }),
        soon("demand-forecasting", { sectionKey: "commercial" }),
        soon("ota-parity", { sectionKey: "commercial" }),
        soon("upsell-ai", { sectionKey: "commercial" }),
        soon("room-upgrade-ai", { sectionKey: "commercial" }),
        soon("sales-marketing", { sectionKey: "commercial" }),
      ],
    },
  ];

  // The eyebrow for each labelled sub-group inside a panel
  // (APP_UX_PROPOSAL.md §2.3), read off the tree rather than hand-listed: a
  // `group` value names its own dictionary key, so `group: "communications"`
  // is `sidebar.communicationsGroup` and a future Finance group needs a key,
  // not a change here. Labels have to travel as a prop — `dict` is server-only
  // and the sidebar is a Client Component.
  const sidebarDict = dict.sidebar as unknown as Record<string, string>;
  const groupLabels: Record<string, string> = Object.fromEntries(
    navItems
      .flatMap((item) => item.children ?? [])
      .flatMap((child) => (child.group ? [child.group] : []))
      .map((group) => [group, sidebarDict[`${group}Group`] ?? group])
  );

  const settingsItem: NavItem = {
    key: "settings",
    label: dict.sidebar.settings,
    href: localizedHref(locale, "/dashboard/settings"),
  };

  return (
    // The dashboard's own namespaces, on top of the public ones the [lang]
    // layout sends — around the sidebar too, which reads them
    // (lib/i18n/client-dictionary.ts).
    <DictionaryProvider
      locale={locale}
      dict={pickNamespaces(dict, DASHBOARD_CLIENT_NAMESPACES)}
    >
      <div className="flex min-h-screen">
        <Sidebar
          navItems={navItems}
          settingsItem={settingsItem}
          groupLabels={groupLabels}
          // The property's own name heads the sidebar (P-6). Falls back to the
          // product name rather than rendering an empty row for a hotel that has
          // not filled its settings in yet.
          hotelName={hotel?.name?.trim() || "Fondas"}
          dashboardHref={localizedHref(locale, "/dashboard")}
          connectionState={connectionState}
          connectionLabels={{
            green: dict.connection.synced,
            amber: dict.connection.stale,
            red: dict.connection.notConnected,
          }}
          userEmail={user.email ?? ""}
          signOutAction={logout}
          signOutLabel={dict.common.signOut}
          locale={locale}
          menuLabel={dict.sidebar.menu}
          accountLabel={dict.sidebar.account}
          openLabel={dict.nav.openMenu}
          closeLabel={dict.nav.closeMenu}
        />
        {/* pt-14 clears the fixed mobile top bar; pl-60 the desktop sidebar,
            which replaced the 64px icon rail in P-6.

            min-w-0 is load-bearing: a flex item defaults to `min-width: auto`,
            so this column refused to shrink below the widest thing inside it —
            the dashboard's 14-night strip — and pushed the entire page sideways
            on a phone. Zeroing the minimum lets the column match the viewport
            and leaves each scroll container to handle its own overflow. */}
        <div className="flex min-w-0 flex-1 flex-col pt-14 md:pl-60 md:pt-0">
          {/* Column, not a plain block, so the docked "Ask your hotel" bar below
              can take the remaining height with `mt-auto` and sit at the foot of
              the column on short pages as well as long ones. */}
          {/* From `lg`, a page that renders `data-chat-surface` (Ask, and its
              loading skeleton) takes the whole column instead: no centring, no
              padding, so its conversation list sits flush against the sidebar
              (APP_UX_PROPOSAL.md §11 #11). Every other page is unchanged. */}
          <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-6 pt-6 md:px-8 md:pb-8 md:pt-10 lg:has-[[data-chat-surface]]:mx-0 lg:has-[[data-chat-surface]]:max-w-none lg:has-[[data-chat-surface]]:px-0 lg:has-[[data-chat-surface]]:pb-0 lg:has-[[data-chat-surface]]:pt-0">
            {/* No PMS means every page below is empty for a reason the page
                itself can't explain. Say so once, at the top, wherever they are. */}
            {!hotel?.pms_connected ? (
              <div className="mb-8">
                <SetupBanner
                  href={localizedHref(locale, "/onboarding/connect")}
                  title={dict.setup.bannerTitle}
                  body={dict.setup.bannerBody}
                  cta={dict.setup.bannerCta}
                />
              </div>
            ) : null}
            {children}
            {/* "Ask your hotel", docked at the foot of the content column — the
                floating circular FAB is gone (FONDA_SANA_REDESIGN.md §8.5). It
                hides itself on /dashboard/chat, which is the full surface. */}
            <AskYourHotel userEmail={user.email ?? ""} />
          </main>
        </div>
      </div>
    </DictionaryProvider>
  );
}
