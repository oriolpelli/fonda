import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefHero } from "@/components/dashboard/brief-hero";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { BriefingGenerating } from "@/components/dashboard/briefing-generating";
import { BriefingRefreshButton } from "@/components/dashboard/briefing-refresh-button";
import { BriefDeliverySettingsForm } from "@/components/dashboard/brief-delivery-settings-form";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { TodoList } from "@/components/dashboard/todo-list";
import { Button } from "@/components/ui/button";
import { loadTodaysBriefing } from "@/lib/briefing-latest";
import { loadDashboardSnapshot } from "@/lib/dashboard-snapshot";
import { byUrgency } from "@/lib/email-urgency";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadInbox } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { buildTodoList, type TodoItem } from "@/lib/todo-rules";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.briefing.title };
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

  // Shared with the dashboard's summary card (lib/briefing-latest.ts), so the
  // teaser and this page can never disagree about whether a brief exists.
  const today = await loadTodaysBriefing(tz);
  const briefing = today?.content ?? null;

  // "Since the brief" (APP_UX_PROPOSAL.md §5.1) — the brief is a 07:00
  // snapshot, and this keeps the page true at 14:00. Same rules as Home, run
  // with a `since` window, which leaves exactly the two rules that carry an
  // event instant: an unanswered complaint that arrived after the brief, and a
  // VIP arrival booked or changed after it.
  //
  // Only loaded when there is a brief to be "since" — a hotel mid-onboarding
  // never pays for these two reads.
  let sinceTheBrief: TodoItem[] = [];
  if (today) {
    const [snapshot, inbox] = await Promise.all([
      loadDashboardSnapshot(),
      loadInbox(),
    ]);
    sinceTheBrief = buildTodoList({
      emails: inbox.emails
        .filter((email) => email.urgency.kind !== "handled")
        .sort(byUrgency)
        .map((email) => ({ ...email, receivedAt: email.created_at })),
      vipArrivalsWithoutNote: snapshot.vipArrivalsWithoutNote,
      unconfirmedEtasTomorrow: snapshot.unconfirmedEtasTomorrow,
      outlook: snapshot.outlook,
      rooms: snapshot.rooms,
      hasSyncedData: snapshot.hasSyncedData,
      since: new Date(today.generatedAt),
    });
  }

  // Only whether there is a history, not the history itself — the list lives at
  // /dashboard/brief/history now, and the hero link shouldn't point at an empty
  // page on a hotel's first morning.
  const { data: firstBrief } = await supabase
    .from("briefings")
    .select("id")
    .not("content_json->>summary", "is", null)
    .limit(1)
    .maybeSingle();

  const quickActions = [
    // The unscoped parent on purpose: it redirects to whichever Communications
    // window has unanswered mail (§5.3), which is exactly what "review emails"
    // from the morning brief means. A hard link to one window would send you
    // to an empty one half the time.
    { label: dict.briefing.reviewEmails, href: "/dashboard/communications" },
    { label: dict.briefing.seeArrivals, href: "/dashboard/arrivals" },
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
          briefing || firstBrief ? (
            <div className="flex items-center gap-5">
              {/* The in-app text-link treatment (button.tsx's own note: a plain
                  link, underlined, no navy) — in the hero's inverse ink, because
                  §7.2 allows white text only on a gradient. */}
              {firstBrief ? (
                <Link
                  href={localizedHref(locale, "/dashboard/brief/history")}
                  className="text-sm underline underline-offset-4 text-[var(--fonda-text-inv)]"
                >
                  {dict.briefing.pastBriefs}
                </Link>
              ) : null}
              {briefing ? (
                <BriefingRefreshButton className="border-[var(--fonda-text-inv)]/40 bg-transparent text-[var(--fonda-text-inv)] hover:border-[var(--fonda-text-inv)]" />
              ) : null}
            </div>
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

          {/* Nothing at all when nothing has landed — no heading, no empty
              state. An empty "Since the brief" would say the brief is stale in
              the one case where it isn't. */}
          {sinceTheBrief.length > 0 ? (
            <section className="flex flex-col gap-3 border-t border-border pt-6">
              <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                {dict.briefing.sinceTitle}
              </h2>
              {/* showPrimary={false}: the sunrise hero is this page's one
                  accent (§7.2), so no row leads by darkness here. */}
              <TodoList
                dict={dict}
                locale={locale}
                items={sinceTheBrief}
                showPrimary={false}
              />
            </section>
          ) : null}

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
    </div>
  );
}
