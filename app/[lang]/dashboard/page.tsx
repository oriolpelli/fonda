import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { NeedsReplyCard } from "@/components/dashboard/needs-reply-card";
import { OccupancyStrip } from "@/components/dashboard/occupancy-strip";
import { StatRow, type Stat } from "@/components/dashboard/stat-row";
import { TodoList } from "@/components/dashboard/todo-list";
import { Button } from "@/components/ui/button";
import { loadDashboardSnapshot } from "@/lib/dashboard-snapshot";
import { byUrgency } from "@/lib/email-urgency";
import { intlLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadInbox } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { buildTodoList, LOW_OCCUPANCY_PCT } from "@/lib/todo-rules";

/**
 * The Dashboard — the ten-second "how is the hotel right now, and what do I do
 * first?" snapshot (FONDA_REDESIGN_SPEC §3.1).
 *
 * Four numbers, the fortnight ahead, the messages waiting on a reply, and a
 * ranked to-do list. Everything is derived at read time from synced PMS data
 * and the guest inbox — there is no dashboard state to go stale, and no AI call
 * on this page: the to-do ranking is rules only (lib/todo-rules.ts), so a GM
 * can predict what appears here and why.
 *
 * Rates are absent on purpose. See components/dashboard/occupancy-strip.tsx.
 */

/** How many messages the "needs a reply" card shows before deferring to the inbox. */
const NEEDS_REPLY_LIMIT = 3;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  const [snapshot, inbox, gmName] = await Promise.all([
    loadDashboardSnapshot(),
    loadInbox(),
    loadGmName(),
  ]);

  const greeting = gmName || snapshot.hotelName;
  const todayLabel = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: snapshot.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {t(dict.home.goodMorning, { name: greeting })}
        </h1>
        <p className="text-muted-foreground">{todayLabel}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={localizedHref(locale, "/dashboard/brief")}>
          {dict.home.readBrief}
        </Link>
      </Button>
    </div>
  );

  // Nothing connected: there is no "today" to show yet, so say so plainly and
  // point at the one action that fixes it, rather than rendering four zeroes.
  if (!snapshot.connected) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <section className="rounded-[16px] border border-border bg-muted px-8 py-14 text-center">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            {dict.home.presyncTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {dict.home.presyncBody}
          </p>
          <Button asChild className="mt-6">
            <Link href={localizedHref(locale, "/dashboard/settings")}>
              {dict.home.presyncCta}
            </Link>
          </Button>
        </section>
      </div>
    );
  }

  const stats: Stat[] = [
    {
      key: "occupancy",
      label: dict.home.occupancyToday,
      value: `${snapshot.occupancyPct}%`,
    },
    {
      key: "free",
      label: dict.home.freeRooms,
      value: String(snapshot.freeRooms),
    },
    {
      key: "checkins",
      label: dict.home.checkinsToday,
      value: String(snapshot.checkinsToday),
    },
    {
      key: "checkouts",
      label: dict.home.checkoutsToday,
      value: String(snapshot.checkoutsToday),
    },
  ];

  // Unanswered mail, most urgent first — the same ranking the inbox uses under
  // "by urgency". Not re-derived here (B7.1 owns it).
  const unanswered = inbox.emails
    .filter((email) => email.urgency.kind !== "handled")
    .sort(byUrgency);

  const todos = buildTodoList({
    emails: unanswered,
    vipArrivalsWithoutNote: snapshot.vipArrivalsWithoutNote,
    unconfirmedEtasTomorrow: snapshot.unconfirmedEtasTomorrow,
    outlook: snapshot.outlook,
    rooms: snapshot.rooms,
    hasSyncedData: snapshot.hasSyncedData,
  });

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="flex flex-col gap-3">
        <StatRow stats={stats} />
        {!snapshot.hasSyncedData ? (
          <p className="text-xs text-[var(--fonda-text-3)]">
            {dict.home.firstSyncNote}
          </p>
        ) : null}
      </div>

      <OccupancyStrip
        dict={dict}
        locale={locale}
        outlook={snapshot.outlook}
        today={snapshot.today}
        softBelowPct={LOW_OCCUPANCY_PCT}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <NeedsReplyCard
          dict={dict}
          locale={locale}
          emails={unanswered.slice(0, NEEDS_REPLY_LIMIT)}
        />
        <TodoList dict={dict} locale={locale} items={todos} />
      </div>
    </div>
  );
}

/** The GM's name for the greeting. Falls back to the hotel name. */
async function loadGmName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hotel_settings")
    .select("gm_name")
    .maybeSingle();
  return data?.gm_name?.trim() || null;
}
