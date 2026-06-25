import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefingGenerating } from "@/components/dashboard/briefing-generating";
import { BriefingRefreshButton } from "@/components/dashboard/briefing-refresh-button";
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

/** Renders briefing prose: blank-line-separated paragraphs. */
function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-lg leading-relaxed text-foreground/90">
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {title}
      </h2>
      <Prose text={text} />
    </section>
  );
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
    .select("name, timezone")
    .single();

  const tz = hotel?.timezone || "UTC";
  const now = new Date();

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

  const quickActions = [
    { label: dict.briefing.reviewEmails, href: "/dashboard/emails" },
    { label: dict.briefing.seeArrivals, href: "/dashboard/checkin" },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
            {dict.briefing.title}
          </h1>
          <p className="text-muted-foreground">
            {hotel?.name ?? dict.briefing.fallbackHotel} ·{" "}
            {formatLongDate(intlLocale[locale], tz, now)}
          </p>
        </div>
        {briefing ? <BriefingRefreshButton /> : null}
      </div>

      {briefing ? (
        <>
          <article className="flex flex-col gap-8">
            <Prose text={briefing.summary} />
            <Section title={dict.briefing.arrivals} text={briefing.arrivals} />
            <Section title={dict.briefing.overnightEmail} text={briefing.emails} />
            <Section title={dict.briefing.rateAlert} text={briefing.rate_alert} />
          </article>

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
      ) : (
        <BriefingGenerating />
      )}
    </div>
  );
}
