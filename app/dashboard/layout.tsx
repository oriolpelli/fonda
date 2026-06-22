import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/brand/wordmark";
import {
  ConnectionStatus,
  deriveConnectionState,
} from "@/components/dashboard/connection-status";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy already guards this route; this is defense-in-depth so the page
  // never renders for an unauthenticated user.
  if (!user) {
    redirect("/login");
  }

  // A signed-up user without a hotel hasn't onboarded yet.
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    redirect("/onboarding");
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
            <Wordmark href="/dashboard" />
            <ConnectionStatus state={connectionState} />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/emails">Emails</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/checkin">Check-in</Link>
            </Button>
            {isOwner ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/admin">Admin</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
