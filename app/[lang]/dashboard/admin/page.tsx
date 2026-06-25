import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { SyncNowButton } from "@/components/dashboard/sync-now-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { intlLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.dashboardNav.admin };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  function formatTime(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleString(intlLocale[locale], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  // Admin view is owner-only.
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    redirect(localizedHref(locale, "/onboarding"));
  }
  if (profile.role !== "owner") {
    redirect(localizedHref(locale, "/dashboard"));
  }

  const [{ data: hotel }, { data: logs }, reservationsCount, customersCount, { data: recentReservations }] =
    await Promise.all([
      supabase
        .from("hotels")
        .select("name, pms_type, pms_connected, last_synced_at")
        .eq("id", profile.hotel_id)
        .single(),
      supabase
        .from("sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase
        .from("reservations")
        .select("mews_id, state, start_utc, end_utc, synced_at")
        .order("start_utc", { ascending: true })
        .limit(10),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
            {dict.admin.title}
          </h1>
          <p className="text-muted-foreground">
            {t(dict.admin.desc, {
              hotel: hotel?.name ?? dict.settings.fallbackHotel,
            })}
          </p>
        </div>
        <SyncNowButton endpoint="/api/sync/pms" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{dict.admin.pms}</CardDescription>
            <CardTitle className="text-lg">
              {hotel?.pms_type ? hotel.pms_type.toUpperCase() : "—"}
              <span
                className={cn(
                  "ml-2 text-sm font-normal",
                  hotel?.pms_connected
                    ? "text-[var(--fonda-accent)]"
                    : "text-destructive"
                )}
              >
                {hotel?.pms_connected
                  ? dict.admin.connected
                  : dict.admin.disconnected}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t(dict.admin.lastSynced, {
              time: formatTime(hotel?.last_synced_at ?? null),
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{dict.admin.reservations}</CardDescription>
            <CardTitle className="text-2xl">
              {reservationsCount.count ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{dict.admin.guests}</CardDescription>
            <CardTitle className="text-2xl">
              {customersCount.count ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.admin.recentSyncRuns}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{dict.admin.colStatus}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colReservations}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colGuests}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colFinished}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colError}</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {dict.admin.noSyncs}
                  </td>
                </tr>
              ) : (
                (logs ?? []).map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          log.status === "success"
                            ? "bg-[var(--fonda-accent-light)] text-[var(--fonda-accent)]"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{log.reservations_count}</td>
                    <td className="px-3 py-2">{log.customers_count}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTime(log.finished_at)}
                    </td>
                    <td className="px-3 py-2 text-destructive">
                      {log.error ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.admin.latestReservations}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{dict.admin.colMewsId}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colState}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colStart}</th>
                <th className="px-3 py-2 font-medium">{dict.admin.colEnd}</th>
              </tr>
            </thead>
            <tbody>
              {(recentReservations ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {dict.admin.noReservations}
                  </td>
                </tr>
              ) : (
                (recentReservations ?? []).map((r) => (
                  <tr key={r.mews_id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.mews_id}</td>
                    <td className="px-3 py-2">{r.state ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTime(r.start_utc)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTime(r.end_utc)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
