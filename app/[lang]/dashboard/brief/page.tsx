import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefHero } from "@/components/dashboard/brief-hero";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { BriefingGenerating } from "@/components/dashboard/briefing-generating";
import { BriefingRefreshButton } from "@/components/dashboard/briefing-refresh-button";
import { BriefDeliverySettingsForm } from "@/components/dashboard/brief-delivery-settings-form";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.briefing.title };
}

function localDate(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatLongDate(intl: string, tz: string, d: Date): string {
  return new Intl.DateTimeFormat(intl, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatShortDate(intl: string, tz: string, d: Date): string {
  return new Intl.DateTimeFormat(intl, {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("name, timezone, pms_connected, last_synced_at")
    .single();

  const tz = hotel?.timezone || "UTC";
  const now = new Date();

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("brief_recipients, brief_send_hour, briefing_language")
    .maybeSingle();

  const { data: latest } = await supabase
    .from("briefings")
    .select("content_json, generated_at")
    .not("content_json->>summary", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasTodayBriefing =
    latest && localDate(tz, new Date(latest.generated_at)) === localDate(tz, now);
  const briefing = hasTodayBriefing
    ? (latest!.content_json as unknown as BriefingContent)
    : null;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: history } = await supabase
    .from("briefings")
    .select("id, generated_at")
    .not("content_json->>summary", "is", null)
    .gte("generated_at", thirtyDaysAgo.toISOString())
    .order("generated_at", { ascending: false })
    .limit(30);

  const quickActions = [
    { label: dict.briefing.reviewEmails, href: "/dashboard/communications" },
    { label: dict.briefing.seeArrivals, href: "/dashboard/checkins" },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* The page's one gradient (§7.2) — which is why the first-run cards
          below render `tone="plain"`. */}
      <BriefHero
        eyebrow={formatLongDate(intlLocale[locale], tz, now)}
        title={dict.briefing.title}
        subtitle={hotel?.name ?? dict.briefing.fallbackHotel}
        action={
          briefing ? (
            <BriefingRefreshButton className="border-[var(--fonda-text-inv)]/40 bg-transparent text-[var(--fonda-text-inv)] hover:border-[var(--fonda-text-inv)]" />
          ) : null
        }
      />

      {/* Three ways to have no brief, and they need different answers. With no
          PMS there is nothing to write about, so asking Claude would produce a
          confidently empty page — say what's missing instead. With a PMS but no
          finished sync, the data is on its way. Only past both is "generating"
          the truth. */}
      {briefing ? (
        <>
          <BriefingArticle content={briefing} dict={dict} />

          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            {quickActions.map((action) => (
              <Button key={action.href} asChild variant="outline">
                <Link href={localizedHref(locale, action.href)}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </>
      ) : !hotel?.pms_connected ? (
        <FirstRunState
          tone="plain"
          title={dict.briefing.presyncTitle}
          body={dict.briefing.presyncBody}
          ctaLabel={dict.briefing.presyncCta}
          ctaHref={localizedHref(locale, "/onboarding/connect")}
        />
      ) : !hotel.last_synced_at ? (
        <FirstRunState
          tone="plain"
          title={dict.briefing.syncingTitle}
          body={dict.briefing.syncingBody}
          ctaLabel={dict.briefing.syncingCta}
          ctaHref={localizedHref(locale, "/onboarding/sync")}
        />
      ) : (
        <BriefingGenerating />
      )}

      <BriefDeliverySettingsForm
        recipients={(settings?.brief_recipients as string[] | null) ?? []}
        sendHour={settings?.brief_send_hour ?? 7}
        language={settings?.briefing_language ?? "en"}
        timezone={tz}
      />

      {history && history.length > 0 ? (
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
            {dict.briefing.historyTitle}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-foreground/80">
                  {formatShortDate(intlLocale[locale], tz, new Date(row.generated_at))}
                </span>
                <Link
                  href={localizedHref(locale, `/dashboard/brief/history/${row.id}`)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {dict.briefing.openBrief}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
