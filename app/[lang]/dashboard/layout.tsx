import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { AskYourHotel } from "@/components/dashboard/ask-your-hotel";
import {
  ConnectionStatus,
  deriveConnectionState,
} from "@/components/dashboard/connection-status";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Wordmark href={localizedHref(locale, "/dashboard")} />
            <ConnectionStatus
              state={connectionState}
              labels={{
                green: dict.connection.synced,
                amber: dict.connection.stale,
                red: dict.connection.notConnected,
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href={localizedHref(locale, "/dashboard/briefing")}>
                {dict.dashboardNav.briefing}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={localizedHref(locale, "/dashboard/emails")}>
                {dict.dashboardNav.emails}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={localizedHref(locale, "/dashboard/checkin")}>
                {dict.dashboardNav.checkin}
              </Link>
            </Button>
            {isOwner ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={localizedHref(locale, "/dashboard/admin")}>
                  {dict.dashboardNav.admin}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href={localizedHref(locale, "/dashboard/settings")}>
                {dict.dashboardNav.settings}
              </Link>
            </Button>
            <LanguageSwitcher />
            <form action={logout}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline" size="sm">
                {dict.common.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
      {/* Floating "Ask your hotel" chat widget (fixed, bottom-right). */}
      <AskYourHotel />
    </div>
  );
}
