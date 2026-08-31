import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ApaleoConnectionCard } from "@/components/dashboard/apaleo-connection-card";
import { GmailConnectionCard } from "@/components/dashboard/gmail-connection-card";
import { MewsConnectionForm } from "@/components/dashboard/mews-connection-form";
import { PmsDisconnectCard } from "@/components/dashboard/pms-disconnect-card";
import { SettingsGroupHeader } from "@/components/dashboard/settings-nav";
import { SheetConnectionForm } from "@/components/dashboard/sheet-connection-form";
import { SyncNowButton } from "@/components/dashboard/sync-now-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apaleoStatusMessage } from "@/lib/apaleo-status";
import { gmailStatusMessage } from "@/lib/gmail-status";
import { intlLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import type { PmsType } from "@/lib/pms";
import { settingsGroups } from "@/lib/settings-groups";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * The connected source, as a narrowed `PmsType`. Only meaningful while
 * something is connected: a disconnect clears `pms_type`, so the chooser below
 * isn't locked to the source just dropped. MEWS is the fallback for the
 * (unexpected) connected-but-untyped row.
 */
function toPmsType(value: string | null | undefined): PmsType {
  return value === "apaleo" || value === "sheet" ? value : "mews";
}

/** The Supabase client this page already holds, typed for the helper below. */
type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The sync view the Admin page used to be: the last twenty runs, what is in the
 * database now, and the next few reservations. Called only for an owner.
 */
async function loadSyncView(supabase: ServerClient) {
  const [logs, reservations, customers, recent] = await Promise.all([
    supabase
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("reservations").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("reservations")
      .select("mews_id, state, start_utc, end_utc, synced_at")
      .order("start_utc", { ascending: true })
      .limit(10),
  ]);

  return {
    logs: logs.data ?? [],
    reservationsCount: reservations.count ?? 0,
    customersCount: customers.count ?? 0,
    recentReservations: recent.data ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.settings.groups.connections.label };
}

/**
 * Settings → Connections: where the hotel's data comes from, and whether it is
 * arriving. The sync view below the connectors is the old /dashboard/admin page,
 * folded in — including its owner-only gate, which now hides the section rather
 * than the whole route (the connectors above it were never owner-only).
 */
export default async function ConnectionsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ apaleo?: string; gmail?: string; ingested?: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const supabase = await createClient();
  const { apaleo, gmail, ingested } = await searchParams;

  function formatTime(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleString(intlLocale[locale], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Select explicit columns — the encrypted token columns are revoked from the
  // client role (migration 0002), so `select('*')` would error here.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("name, pms_type, pms_connected, gmail_email, last_synced_at")
    .single();

  // The sync view is owner-only, exactly as the Admin page was. The dashboard
  // layout has already established there is a signed-in, onboarded user.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const isOwner = profile?.role === "owner";

  // Owner-only, so only queried for an owner — RLS scopes these rows to the
  // hotel, but it does not scope them to the role.
  const sync = isOwner ? await loadSyncView(supabase) : null;

  const connected = hotel?.pms_connected ?? false;
  const pmsType = toPmsType(hotel?.pms_type);
  const apaleoBanner = apaleoStatusMessage(apaleo);
  const gmailBanner = gmailStatusMessage(gmail);
  const gmailConnected = gmail === "connected";
  const hotelName = hotel?.name ?? dict.settings.fallbackHotel;

  return (
    // Full width, with the forms held to a readable measure inside — the sync
    // tables below them need the whole content column, which is why they sit
    // outside the max-w-2xl stack rather than in it.
    <div className="flex w-full flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-8">
        <SettingsGroupHeader
          title={dict.settings.groups.connections.label}
          desc={t(dict.settings.desc, { hotel: hotelName })}
          groups={settingsGroups(locale, dict)}
          active="connections"
          navLabel={dict.settings.groups.navLabel}
          backHref={localizedHref(locale, "/dashboard/settings")}
          backLabel={dict.settings.groups.back}
        />

        {apaleoBanner ? (
          <div
            role="status"
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-medium",
              apaleoBanner.tone === "success"
                ? "border-primary/30 bg-accent text-accent-foreground"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            )}
          >
            {dict.apaleoStatus[apaleoBanner.key]}
          </div>
        ) : null}

        {gmailConnected ? (
          <div
            role="status"
            className="rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
          >
            {t(dict.settings.gmailConnected, {
              email: hotel?.gmail_email ?? dict.settings.gmailFallbackInbox,
              count: ingested ?? "0",
            })}
          </div>
        ) : gmailBanner ? (
          <div
            role="status"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
          >
            {dict.gmailStatus[gmailBanner.key]}
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            connected
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          {connected ? (
            <CheckCircle2 className="size-4 text-primary" />
          ) : (
            <Circle className="size-4" />
          )}
          <span className="font-medium">
            {connected
              ? t(dict.settings.connectedTo, {
                  pms: dict.settings.pmsNames[pmsType],
                })
              : dict.settings.notConnected}
          </span>
        </div>

        {connected ? (
          <>
            {pmsType === "apaleo" ? (
              <ApaleoConnectionCard connected showDisconnect={false} />
            ) : pmsType === "sheet" ? (
              <SheetConnectionForm connected />
            ) : (
              <MewsConnectionForm connected />
            )}
            <PmsDisconnectCard pmsType={pmsType} />
          </>
        ) : (
          /* Nothing connected — offer every connector, not just the one this
             hotel happened to use last, so switching source is a disconnect
             followed by a free choice. */
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
                {dict.settings.chooseSourceTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {dict.settings.chooseSourceDesc}
              </p>
            </div>
            <MewsConnectionForm connected={false} />
            <ApaleoConnectionCard connected={false} />
            <SheetConnectionForm connected={false} />
          </>
        )}

        <GmailConnectionCard email={hotel?.gmail_email ?? null} />
      </div>

      {sync ? (
        <section className="flex flex-col gap-6 border-t border-border pt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
                {dict.sync.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(dict.sync.desc, { hotel: hotelName })}
              </p>
            </div>
            <SyncNowButton endpoint="/api/sync/pms" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>{dict.sync.pms}</CardDescription>
                <CardTitle className="text-lg">
                  {hotel?.pms_type ? hotel.pms_type.toUpperCase() : "—"}
                  <span
                    className={cn(
                      "ml-2 text-sm font-normal",
                      // Connected is the quiet, expected state — grey, not navy
                      // (§10). Only the failure keeps a colour.
                      hotel?.pms_connected
                        ? "text-[var(--fonda-text-2)]"
                        : "text-destructive"
                    )}
                  >
                    {hotel?.pms_connected
                      ? dict.sync.connected
                      : dict.sync.disconnected}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t(dict.sync.lastSynced, {
                  time: formatTime(hotel?.last_synced_at ?? null),
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>{dict.sync.reservations}</CardDescription>
                <CardTitle className="text-2xl">
                  {sync.reservationsCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>{dict.sync.guests}</CardDescription>
                <CardTitle className="text-2xl">
                  {sync.customersCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
              {dict.sync.recentSyncRuns}
            </h3>
            <div className="overflow-x-auto rounded-[18px] bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{dict.sync.colStatus}</th>
                    <th className="px-3 py-2 font-medium">
                      {dict.sync.colReservations}
                    </th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colGuests}</th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colFinished}</th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colError}</th>
                  </tr>
                </thead>
                <tbody>
                  {sync.logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        {dict.sync.noSyncs}
                      </td>
                    </tr>
                  ) : (
                    sync.logs.map((log) => (
                      <tr key={log.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              // The accent-tinted chip is retired from chrome
                              // (§9); a successful sync is neutral, a failed
                              // one is not.
                              log.status === "success"
                                ? "bg-[var(--fonda-inset)] text-[var(--fonda-text)]"
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
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
              {dict.sync.latestReservations}
            </h3>
            <div className="overflow-x-auto rounded-[18px] bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{dict.sync.colMewsId}</th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colState}</th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colStart}</th>
                    <th className="px-3 py-2 font-medium">{dict.sync.colEnd}</th>
                  </tr>
                </thead>
                <tbody>
                  {sync.recentReservations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        {dict.sync.noReservations}
                      </td>
                    </tr>
                  ) : (
                    sync.recentReservations.map((r) => (
                      <tr key={r.mews_id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">
                          {r.mews_id}
                        </td>
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
          </div>
        </section>
      ) : null}
    </div>
  );
}
