import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { buildHotelContext } from "@/lib/hotel-context";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function localDate(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-6">
      <div className="font-serif text-4xl font-normal leading-none tracking-[-0.03em] text-foreground">
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user!.id)
    .single();
  const hotelId = profile!.hotel_id;

  const [{ data: settings }, context, { data: latest }] = await Promise.all([
    supabase
      .from("hotel_settings")
      .select("gm_name")
      .eq("hotel_id", hotelId)
      .maybeSingle(),
    buildHotelContext(hotelId),
    supabase
      .from("briefings")
      .select("content_json, generated_at")
      .not("content_json->>summary", "is", null)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const tz = context.hotel.timezone;
  const now = new Date();
  const greeting = settings?.gm_name?.trim() || context.hotel.name;

  const hasTodayBriefing =
    latest && localDate(tz, new Date(latest.generated_at)) === localDate(tz, now);
  const briefing = hasTodayBriefing
    ? (latest!.content_json as unknown as BriefingContent)
    : null;

  const stats = [
    { label: "Arrivals today", value: context.today.arrivals.length },
    { label: "Departures today", value: context.today.departures.length },
    { label: "In-house tonight", value: context.today.inHouse.length },
    { label: "Occupancy tonight", value: `${context.today.occupancyRate}%` },
    { label: "Email drafts ready", value: context.emails.pendingCount },
    { label: "Need attention", value: context.emails.urgentCount },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground">
          Good morning, {greeting}
        </h1>
        <p className="text-muted-foreground">
          {new Intl.DateTimeFormat("en-GB", {
            timeZone: tz,
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(now)}
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Briefing summary */}
      <div className="rounded-[20px] border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow>Today&apos;s briefing</Eyebrow>
          <Button asChild size="sm">
            <Link href="/dashboard/briefing">
              {briefing ? "Read full briefing →" : "Open briefing →"}
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-foreground/90">
          {briefing
            ? briefing.summary.split(/\n{2,}/)[0]
            : "Your morning briefing hasn't been generated yet today. Open it to generate a fresh summary of arrivals, emails, and rate alerts."}
        </p>
      </div>

      {/* Occupancy calendar */}
      <div className="rounded-[20px] border border-border p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Occupancy outlook · next 14 days</Eyebrow>
          {context.rates.occupancyAlerts.length > 0 ? (
            <span className="text-xs text-amber-700">
              {context.rates.occupancyAlerts.length} day
              {context.rates.occupancyAlerts.length === 1 ? "" : "s"} below 60%
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {context.occupancyOutlook.map((d) => {
            const date = new Date(`${d.date}T00:00:00Z`);
            const weekday = new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              weekday: "short",
            }).format(date);
            const dom = new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              day: "numeric",
            }).format(date);
            const low = d.occupancyRate < 60;
            return (
              <div
                key={d.date}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2 text-center"
              >
                <span className="text-[10px] uppercase tracking-wide text-[var(--fonda-text-3)]">
                  {weekday}
                </span>
                <span className="text-sm font-medium text-foreground">{dom}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fonda-inset)]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.occupancyRate}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[11px]",
                    low ? "text-amber-700" : "text-muted-foreground"
                  )}
                >
                  {d.occupancyRate}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-[var(--fonda-text-3)]">
          Occupancy is computed from synced reservations. Rate-plan pricing isn&apos;t
          connected yet.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/emails">Review emails</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/check-in">Check-in chasing</Link>
        </Button>
      </div>
    </div>
  );
}
