import { redirect } from "next/navigation";

import { logout } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AskYourHotel } from "@/components/dashboard/ask-your-hotel";
import { deriveConnectionState } from "@/components/dashboard/connection-status";
import { SetupBanner } from "@/components/dashboard/setup-banner";
import { Sidebar, type NavItem } from "@/components/dashboard/sidebar";
import { localizedHref } from "@/lib/i18n/navigation";
import { plural } from "@/lib/i18n/format";
import { loadInboxBadge } from "@/lib/inbox";
import { roadmapFeature, type RoadmapKey } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy already guards this route; this is defense-in-depth so the page
  // never renders for an unauthenticated user.
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  // A signed-up user without a hotel hasn't onboarded yet.
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    redirect(localizedHref(locale, "/onboarding"));
  }

  const { data: hotel } = await supabase
    .from("hotels")
    .select("pms_connected, last_synced_at")
    .eq("id", profile.hotel_id)
    .single();

  const connectionState = deriveConnectionState(
    hotel?.pms_connected ?? false,
    hotel?.last_synced_at ?? null
  );

  // Unhandled message count for the inbox badge. Fails soft to zero, so a bad
  // inbox query can never blank the whole dashboard.
  const inboxBadge = await loadInboxBadge();

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
          // "Arrivals & departures" — it covers both now (§5.2). The route is
          // still /dashboard/checkins; the rename to /dashboard/arrivals lands
          // with the surface itself, so the key stays `checkins` too.
          key: "checkins",
          label: dict.sidebar.arrivals,
          href: localizedHref(locale, "/dashboard/checkins"),
          sectionKey: "operation",
        },
        soon("communications-in-house", {
          sectionKey: "operation",
          group: "communications",
        }),
        {
          // The upcoming-stays window, still at the unscoped
          // /dashboard/communications until W6 splits the two. The inbox badge
          // belongs here: this is where unanswered guest mail lives.
          key: "communications",
          label: dict.sidebar.upcoming,
          href: localizedHref(locale, "/dashboard/communications"),
          sectionKey: "operation",
          group: "communications",
          badge: {
            count: inboxBadge.count,
            alert: inboxBadge.alert,
            srLabel: plural(
              inboxBadge.count,
              dict.sidebar.waitingOne,
              dict.sidebar.waitingOther
            ),
          },
        },
        soon("guests", { sectionKey: "operation" }),
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
    <div className="flex min-h-screen">
      <Sidebar
        navItems={navItems}
        settingsItem={settingsItem}
        groupLabels={groupLabels}
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
      {/* pt-14 clears the fixed mobile top bar; pl-16 the desktop icon rail.

          min-w-0 is load-bearing: a flex item defaults to `min-width: auto`,
          so this column refused to shrink below the widest thing inside it —
          the dashboard's 14-night strip — and pushed the entire page sideways
          on a phone. Zeroing the minimum lets the column match the viewport
          and leaves each scroll container to handle its own overflow. */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pl-16 md:pt-0">
        {/* Column, not a plain block, so the docked "Ask your hotel" bar below
            can take the remaining height with `mt-auto` and sit at the foot of
            the column on short pages as well as long ones. */}
        <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-6 pt-6 md:px-8 md:pb-8 md:pt-10">
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
  );
}
