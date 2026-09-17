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
  // (NAV_REORG_SPEC.md §3), and a flat list can't say which section owns what.
  const soon = (
    key: RoadmapKey,
    label?: string,
    sectionKey?: string
  ): NavItem => {
    const feature = roadmapFeature(key);
    return {
      key,
      // A section's own row is its "Dashboard" sub-page: the roadmap label is
      // the section name (right for the page heading), so the submenu passes
      // "Dashboard" in instead.
      label: label ?? feature.label(dict),
      href: localizedHref(locale, feature.route),
      comingSoon: feature.status === "coming-soon",
      comingSoonLabel: dict.roadmap.badge,
      ...(sectionKey ? { sectionKey } : {}),
    };
  };

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: dict.sidebar.dashboard,
      href: localizedHref(locale, "/dashboard"),
    },
    {
      // The four live surfaces keep their Phase 1 URLs (§4) — only their place
      // in the nav moves — so each carries `sectionKey` for active-state
      // grouping; the section path alone can't tell you you're inside it.
      key: "front-desk",
      label: dict.sidebar.frontDesk,
      href: localizedHref(locale, "/dashboard/front-desk"),
      children: [
        soon("front-desk", dict.sidebar.dashboard, "front-desk"),
        soon("front-desk-info", undefined, "front-desk"),
        {
          key: "brief",
          label: dict.sidebar.brief,
          href: localizedHref(locale, "/dashboard/brief"),
          sectionKey: "front-desk",
        },
        {
          key: "checkins",
          label: dict.sidebar.checkins,
          href: localizedHref(locale, "/dashboard/checkins"),
          sectionKey: "front-desk",
        },
        {
          key: "communications",
          label: dict.sidebar.communications,
          href: localizedHref(locale, "/dashboard/communications"),
          sectionKey: "front-desk",
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
        soon("concierge", undefined, "front-desk"),
        soon("reputation", undefined, "front-desk"),
      ],
    },
    {
      key: "revenue",
      label: dict.sidebar.revenue,
      href: localizedHref(locale, "/dashboard/revenue"),
      comingSoon: true,
      comingSoonLabel: dict.roadmap.badge,
      children: [
        soon("revenue", dict.sidebar.dashboard, "revenue"),
        soon("revenue-management", undefined, "revenue"),
        soon("demand-forecasting", undefined, "revenue"),
        soon("ota-parity", undefined, "revenue"),
        soon("upsell-ai", undefined, "revenue"),
        soon("room-upgrade-ai", undefined, "revenue"),
      ],
    },
    // A section-level coming-soon page with nothing under it: clicking it just
    // navigates, no submenu panel (§2).
    soon("sales-marketing"),
    {
      key: "operations",
      label: dict.sidebar.operations,
      href: localizedHref(locale, "/dashboard/operations"),
      comingSoon: true,
      comingSoonLabel: dict.roadmap.badge,
      children: [
        soon("operations", dict.sidebar.dashboard, "operations"),
        soon("staff", undefined, "operations"),
        soon("housekeeping", undefined, "operations"),
        soon("fnb", undefined, "operations"),
        soon("procurement", undefined, "operations"),
      ],
    },
    {
      key: "finance",
      label: dict.sidebar.finance,
      href: localizedHref(locale, "/dashboard/finance"),
      comingSoon: true,
      comingSoonLabel: dict.roadmap.badge,
      children: [
        soon("finance", dict.sidebar.dashboard, "finance"),
        soon("finance-reporting", undefined, "finance"),
        soon("chargeback", undefined, "finance"),
      ],
    },
    {
      key: "oversight",
      label: dict.sidebar.oversight,
      href: localizedHref(locale, "/dashboard/oversight"),
      comingSoon: true,
      comingSoonLabel: dict.roadmap.badge,
      children: [
        soon("oversight", dict.sidebar.dashboard, "oversight"),
        soon("ai-management", undefined, "oversight"),
        soon("team-activity", undefined, "oversight"),
      ],
    },
  ];

  const settingsItem: NavItem = {
    key: "settings",
    label: dict.dashboardNav.settings,
    href: localizedHref(locale, "/dashboard/settings"),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        navItems={navItems}
        settingsItem={settingsItem}
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
