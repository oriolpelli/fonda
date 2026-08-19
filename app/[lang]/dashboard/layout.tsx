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
import { roadmapNavFeatures } from "@/lib/roadmap";
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
    .select("hotel_id, role")
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
  const isOwner = profile.role === "owner";

  // Unhandled message count for the inbox badge. Fails soft to zero, so a bad
  // inbox query can never blank the whole dashboard.
  const inboxBadge = await loadInboxBadge();

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: dict.sidebar.dashboard,
      href: localizedHref(locale, "/dashboard"),
    },
    {
      key: "brief",
      label: dict.sidebar.brief,
      href: localizedHref(locale, "/dashboard/brief"),
    },
    {
      key: "checkins",
      label: dict.sidebar.checkins,
      href: localizedHref(locale, "/dashboard/checkins"),
    },
    {
      key: "communications",
      label: dict.sidebar.communications,
      href: localizedHref(locale, "/dashboard/communications"),
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
    // Everything that isn't built yet — order, labels and the "Coming soon"
    // badge all come from lib/roadmap.ts. Add a feature there, not here.
    ...roadmapNavFeatures().map((feature) => ({
      key: feature.key,
      label: feature.label(dict),
      href: localizedHref(locale, feature.route),
      comingSoon: feature.status === "coming-soon",
      comingSoonLabel: dict.roadmap.badge,
    })),
  ];

  const settingsItem: NavItem = {
    key: "settings",
    label: dict.dashboardNav.settings,
    href: localizedHref(locale, "/dashboard/settings"),
  };

  const adminItem: NavItem | null = isOwner
    ? {
        key: "admin",
        label: dict.dashboardNav.admin,
        href: localizedHref(locale, "/dashboard/admin"),
      }
    : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        navItems={navItems}
        settingsItem={settingsItem}
        adminItem={adminItem}
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
