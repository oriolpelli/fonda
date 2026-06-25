import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { buildHotelContext } from "@/lib/hotel-context";
import { intlLocale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
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
    <div className="rounded-[16px] border border-border bg-card p-6">
      <div className="text-4xl font-semibold leading-none tracking-[-0.04em] text-foreground">
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
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
    { label: dict.home.arrivalsToday, value: context.today.arrivals.length },
    { label: dict.home.departuresToday, value: context.today.departures.length },
    { label: dict.home.inHouseTonight, value: context.today.inHouse.length },
    { label: dict.home.occupancyTonight, value: `${context.today.occupancyRate}%` },
    { label: dict.home.draftsReady, value: context.emails.pendingCount },
    { label: dict.home.needAttention, value: context.emails.urgentCount },
  ];

  const lowDays = context.rates.occupancyAlerts.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {t(dict.home.goodMorning, { name: greeting })}
        </h1>
        <p className="text-muted-foreground">
          {new Intl.DateTimeFormat(intlLocale[locale], {
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
      <div className="rounded-[16px] border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow>{dict.home.todaysBriefing}</Eyebrow>
          <Button asChild size="sm">
            <Link href={localizedHref(locale, "/dashboard/briefing")}>
              {briefing ? dict.home.readFullBriefing : dict.home.openBriefing}
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-foreground/90">
          {briefing ? briefing.summary.split(/\n{2,}/)[0] : dict.home.noBriefing}
        </p>
      </div>

      {/* Occupancy calendar */}
      <div className="rounded-[16px] border border-border p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>{dict.home.occupancyOutlook}</Eyebrow>
          {lowDays > 0 ? (
            <span className="text-xs text-amber-700">
              {plural(lowDays, dict.home.daysBelowOne, dict.home.daysBelowOther)}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {context.occupancyOutlook.map((d) => {
            const date = new Date(`${d.date}T00:00:00Z`);
            const weekday = new Intl.DateTimeFormat(intlLocale[locale], {
              timeZone: "UTC",
              weekday: "short",
            }).format(date);
            const dom = new Intl.DateTimeFormat(intlLocale[locale], {
              timeZone: "UTC",
              day: "numeric",
            }).format(date);
            const low = d.occupancyRate < 60;
            return (
              <div
                key={d.date}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2 text-center"
              >
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--fonda-text-3)]">
                  {weekday}
                </span>
                <span className="text-sm font-medium text-foreground">{dom}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fonda-inset)]">
                  <div
                    className="h-full rounded-full bg-[var(--fonda-accent)]"
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
          {dict.home.occupancyNote}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={localizedHref(locale, "/dashboard/emails")}>
            {dict.home.reviewEmails}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={localizedHref(locale, "/dashboard/checkin")}>
            {dict.home.checkinChasing}
          </Link>
        </Button>
      </div>
    </div>
  );
}
