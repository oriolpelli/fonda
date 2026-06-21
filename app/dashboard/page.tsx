import Link from "next/link";

import { BriefingGenerating } from "@/components/dashboard/briefing-generating";
import { BriefingRefreshButton } from "@/components/dashboard/briefing-refresh-button";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { createClient } from "@/lib/supabase/server";

function localDate(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatLongDate(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const QUICK_ACTIONS = [
  { label: "Review emails", href: "/dashboard/email" },
  { label: "See all arrivals", href: "/dashboard/check-in" },
  { label: "Open chat", href: "/dashboard/chat" },
];

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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <Prose text={text} />
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("name, timezone")
    .single();

  const tz = hotel?.timezone || "UTC";
  const now = new Date();

  // RLS scopes briefings to the caller's hotel.
  const { data: latest } = await supabase
    .from("briefings")
    .select("content_json, generated_at")
    // Ignore failure-log rows (which carry an `error` key, not `summary`).
    .not("content_json->>summary", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasTodayBriefing =
    latest && localDate(tz, new Date(latest.generated_at)) === localDate(tz, now);
  const briefing = hasTodayBriefing
    ? (latest!.content_json as unknown as BriefingContent)
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {hotel?.name ?? "Your hotel"}
          </h1>
          <p className="text-muted-foreground">{formatLongDate(tz, now)}</p>
        </div>
        {briefing ? <BriefingRefreshButton /> : null}
      </div>

      {briefing ? (
        <>
          <article className="flex flex-col gap-8">
            <Prose text={briefing.summary} />
            <Section title="Arrivals & departures" text={briefing.arrivals} />
            <Section title="Overnight email" text={briefing.emails} />
            <Section title="Rate alert" text={briefing.rate_alert} />
          </article>

          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.href} asChild variant="outline">
                <Link href={action.href}>{action.label}</Link>
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
