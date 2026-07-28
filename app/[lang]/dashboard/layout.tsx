import { redirect } from "next/navigation";

import { logout } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AskYourHotel } from "@/components/dashboard/ask-your-hotel";
import { deriveConnectionState } from "@/components/dashboard/connection-status";
import { Sidebar, type NavItem } from "@/components/dashboard/sidebar";
import { localizedHref } from "@/lib/i18n/navigation";
import { plural } from "@/lib/i18n/format";
import { loadInboxBadge } from "@/lib/inbox";
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
      // Concierge is parked (see its page) — the route still resolves, but it
      // stays out of the sidebar until in-house messaging is real.
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
    {
      key: "analytics",
      label: dict.sidebar.analytics,
      href: localizedHref(locale, "/dashboard/analytics"),
    },
    {
      key: "chat",
      label: dict.sidebar.chat,
      href: localizedHref(locale, "/dashboard/chat"),
    },
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
      />
      <div className="flex flex-1 flex-col pl-64">
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-8 py-10">
          {children}
        </main>
      </div>
      {/* Floating "Ask your hotel" chat widget (fixed, bottom-right). */}
      <AskYourHotel />
    </div>
  );
}
