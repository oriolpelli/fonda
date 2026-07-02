import { redirect } from "next/navigation";
import {
  BarChart3,
  ConciergeBell,
  DoorOpen,
  LayoutDashboard,
  MessageSquare,
  Send,
  Settings,
  Sunrise,
} from "lucide-react";

import { logout } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AskYourHotel } from "@/components/dashboard/ask-your-hotel";
import { deriveConnectionState } from "@/components/dashboard/connection-status";
import { Sidebar, type NavItem } from "@/components/dashboard/sidebar";
import { localizedHref } from "@/lib/i18n/navigation";
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

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: dict.sidebar.dashboard,
      href: localizedHref(locale, "/dashboard"),
      icon: LayoutDashboard,
    },
    {
      key: "brief",
      label: dict.sidebar.brief,
      href: localizedHref(locale, "/dashboard/brief"),
      icon: Sunrise,
    },
    {
      key: "checkins",
      label: dict.sidebar.checkins,
      href: localizedHref(locale, "/dashboard/checkins"),
      icon: DoorOpen,
    },
    {
      key: "concierge",
      label: dict.sidebar.concierge,
      href: localizedHref(locale, "/dashboard/concierge"),
      icon: ConciergeBell,
    },
    {
      key: "communications",
      label: dict.sidebar.communications,
      href: localizedHref(locale, "/dashboard/communications"),
      icon: Send,
    },
    {
      key: "analytics",
      label: dict.sidebar.analytics,
      href: localizedHref(locale, "/dashboard/analytics"),
      icon: BarChart3,
    },
    {
      key: "chat",
      label: dict.sidebar.chat,
      href: localizedHref(locale, "/dashboard/chat"),
      icon: MessageSquare,
    },
  ];

  const settingsItem: NavItem = {
    key: "settings",
    label: dict.dashboardNav.settings,
    href: localizedHref(locale, "/dashboard/settings"),
    icon: Settings,
  };

  const adminItem: NavItem | null = isOwner
    ? {
        key: "admin",
        label: dict.dashboardNav.admin,
        href: localizedHref(locale, "/dashboard/admin"),
        icon: Settings,
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
