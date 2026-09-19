import * as Sentry from "@sentry/nextjs";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import type { Stat } from "@/components/dashboard/stat-row";
import { ArrivalsWidget } from "@/components/dashboard/widgets/arrivals-widget";
import { BriefWidget } from "@/components/dashboard/widgets/brief-widget";
import { DeparturesWidget } from "@/components/dashboard/widgets/departures-widget";
import { InboxPulseWidget } from "@/components/dashboard/widgets/inbox-pulse-widget";
import { NeedsReplyWidget } from "@/components/dashboard/widgets/needs-reply-widget";
import { NeedsYouWidget } from "@/components/dashboard/widgets/needs-you-widget";
import { NumbersWidget } from "@/components/dashboard/widgets/numbers-widget";
import { OutlookWidget } from "@/components/dashboard/widgets/outlook-widget";
import { SyncHealthWidget } from "@/components/dashboard/widgets/sync-health-widget";
import { VipNoNoteWidget } from "@/components/dashboard/widgets/vip-no-note-widget";
import { clockTime } from "@/components/dashboard/widgets/widget-section";
import { loadTodayMovements, type TodayMovements } from "@/lib/arrivals";
import { loadTodaysBriefing, type TodaysBriefing } from "@/lib/briefing-latest";
import { loadDashboardSnapshot } from "@/lib/dashboard-snapshot";
import { byUrgency } from "@/lib/email-urgency";
import {
  defaultLayoutFor,
  homeWidgetsForLayout,
  loadHomeLayout,
  type StoredLayout,
} from "@/lib/home-layout";
import { type HomeWidgetKey } from "@/lib/home-widgets";
import { intlLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadInbox, loadReservationThreads } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { loadSyncHealth, type SourceHealth } from "@/lib/sync-health";
import { buildTodoList } from "@/lib/todo-rules";

/**
 * Home — the ten-second "what needs me, and how is the hotel right now?"
 * snapshot (APP_UX_PROPOSAL.md §3).
 *
 * This file is a *composer*, not a layout. It loads the data once and then
 * walks the user's resolved layout (`lib/home-layout.ts`), handing each widget
 * it names the slice it needs. Widths come from the registry
 * (`lib/home-widgets.ts`); order and visibility come from the user, falling
 * back to the role defaults when they have never opened Customize. Nothing
 * about the sequence of cards is decided here.
 *
 * The answer comes first. "Needs you today" is pinned above everything else —
 * it used to sit in the bottom-right quadrant, below a chart (§3.1), which
 * buried the one thing a GM opens this page for.
 *
 * Everything is derived at read time from synced PMS data and the guest inbox —
 * there is no dashboard state to go stale, and no AI call on this page: the
 * to-do ranking is rules only (lib/todo-rules.ts), so a GM can predict what
 * appears here and why.
 *
 * Rates are absent on purpose. See components/dashboard/occupancy-strip.tsx.
 */

/** How many messages the "needs a reply" widget shows before deferring to the inbox. */
const NEEDS_REPLY_LIMIT = 3;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  const [snapshot, inbox, gmName, layout] = await Promise.all([
    loadDashboardSnapshot(),
    loadInbox(),
    loadGmName(),
    loadViewerLayout(),
  ]);

  const greeting = gmName || snapshot.hotelName;
  const todayLabel = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: snapshot.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // No header action. Each widget now carries its own title, so a page-level
  // button would be the only control on the page with nothing beneath it; the
  // Customize button §3.4 describes lands with the panel, not before it.
  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
        {t(dict.home.goodMorning, { name: greeting })}
      </h1>
      <p className="text-muted-foreground">{todayLabel}</p>
    </div>
  );

  // Nothing connected: there is no "today" to show yet, so say so plainly and
  // point at the one action that fixes it, rather than rendering four zeroes.
  // The action is the setup wizard, not Settings — finishing setup is a guided
  // flow that ends in a real brief.
  if (!snapshot.connected) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <FirstRunState
          title={dict.home.presyncTitle}
          body={dict.home.presyncBody}
          ctaLabel={dict.home.presyncCta}
          ctaHref={localizedHref(locale, "/onboarding/connect")}
        />
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

  // The second read batch, in parallel like the first. It sits after the early
  // return above so a hotel with no PMS never pays for any of it, and after the
  // snapshot because two of the four need something it produced — the hotel's
  // timezone, and the VIP reservations to look up threads for.
  //
  // The brief uses the same loader the Morning Brief page does, so the teaser
  // can never claim a brief that page would deny.
  const [todaysBrief, movements, vipThreads, syncHealth] = await Promise.all([
    soft(() => loadTodaysBriefing(snapshot.timezone), null as TodaysBriefing | null),
    soft(loadTodayMovements, {
      timezone: snapshot.timezone,
      arrivals: [],
      departures: [],
    } satisfies TodayMovements),
    soft(
      () =>
        loadReservationThreads(
          snapshot.vipArrivalsWithoutNote.map((vip) => vip.reservationId)
        ),
      new Map<string, string>()
    ),
    soft(loadSyncHealth, [] as SourceHealth[]),
  ]);

  const todos = buildTodoList({
    // `receivedAt` is only read by the brief's "since" filter, but the rules
    // take one email shape, so Home feeds it too.
    emails: unanswered.map((email) => ({ ...email, receivedAt: email.created_at })),
    vipArrivalsWithoutNote: snapshot.vipArrivalsWithoutNote,
    unconfirmedEtasTomorrow: snapshot.unconfirmedEtasTomorrow,
    outlook: snapshot.outlook,
    rooms: snapshot.rooms,
    hasSyncedData: snapshot.hasSyncedData,
  });

  // Freshness lines (§7.4): each widget prints the clock time of the read it
  // actually stands on, never a generic "just now". `inbox.emails` arrives
  // newest-first from the loader, so [0] is the latest message.
  const syncedAt = clockTime(locale, snapshot.timezone, snapshot.lastSyncedAt);
  const briefAt = clockTime(locale, snapshot.timezone, todaysBrief?.generatedAt);
  const inboxAt = clockTime(locale, snapshot.timezone, inbox.emails[0]?.created_at);

  /**
   * One widget. Every key in the registry has a renderer now, and the switch is
   * exhaustive on purpose: adding a key to lib/home-widgets.ts fails the build
   * here until it gets one, so the registry can never declare a widget Home
   * silently drops.
   */
  function widgetFor(key: HomeWidgetKey) {
    switch (key) {
      case "needs-you":
        return (
          <NeedsYouWidget
            dict={dict}
            locale={locale}
            items={todos}
            syncedAt={syncedAt}
          />
        );
      case "brief":
        return (
          <BriefWidget
            dict={dict}
            locale={locale}
            summary={todaysBrief?.content.summary ?? null}
            generatedAt={briefAt}
            arrivals={snapshot.hasSyncedData ? snapshot.checkinsToday : null}
            waiting={unanswered.length}
          />
        );
      case "numbers":
        return (
          <NumbersWidget
            dict={dict}
            stats={stats}
            hasSyncedData={snapshot.hasSyncedData}
            syncedAt={syncedAt}
          />
        );
      case "outlook":
        return (
          <OutlookWidget
            dict={dict}
            locale={locale}
            outlook={snapshot.outlook}
            today={snapshot.today}
            syncedAt={syncedAt}
          />
        );
      case "needs-reply":
        return (
          <NeedsReplyWidget
            dict={dict}
            locale={locale}
            emails={unanswered.slice(0, NEEDS_REPLY_LIMIT)}
            updatedAt={inboxAt}
          />
        );
      case "arrivals-today":
        return (
          <ArrivalsWidget
            dict={dict}
            locale={locale}
            arrivals={movements.arrivals}
            syncedAt={syncedAt}
          />
        );
      case "departures-today":
        return (
          <DeparturesWidget
            dict={dict}
            locale={locale}
            departures={movements.departures}
            timezone={movements.timezone}
            syncedAt={syncedAt}
          />
        );
      case "vip-no-note":
        return (
          <VipNoNoteWidget
            dict={dict}
            locale={locale}
            vips={snapshot.vipArrivalsWithoutNote}
            threads={vipThreads}
            syncedAt={syncedAt}
          />
        );
      case "inbox-pulse":
        return (
          <InboxPulseWidget
            dict={dict}
            draftsReady={inbox.draftsReady}
            sentToday={inbox.sentToday}
            avgResponseHours={inbox.avgResponseHours}
            updatedAt={inboxAt}
          />
        );
      case "sync-health":
        return (
          <SyncHealthWidget
            dict={dict}
            locale={locale}
            sources={syncHealth}
            timezone={snapshot.timezone}
          />
        );
    }
  }

  // Pinned widgets first whatever the user chose, then their enabled ones in
  // their order. Disabled widgets are skipped here but stay in the stored array
  // so Customize can show them unchecked where they were left.
  const rendered = homeWidgetsForLayout(layout).map((def) => ({
    def,
    node: widgetFor(def.key),
  }));

  return (
    <div className="flex flex-col gap-8">
      {header}

      {/* One grid for the whole page: full-width widgets span both columns, so
          a full/half/half run lays out without the page having to split itself
          into sections. Widths come from the registry, never from the user
          (§3.2 — pick and order, not resize).

          grid-cols-1 rather than a bare `grid`: Tailwind's grid-cols-* tracks
          are minmax(0,1fr), so a long unbreakable line inside a card can't
          widen the column past the viewport. An implicit `auto` track can. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {rendered.map(({ def, node }) => (
          <div
            key={def.key}
            className={
              def.width === "full" ? "min-w-0 lg:col-span-2" : "min-w-0"
            }
          >
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A widget loader that fails takes its widget's empty state with it, never the
 * page. Home is ten independent readings; one broken query is a card that says
 * "nothing to show", not a blank dashboard at 7am.
 *
 * The loaders themselves already return an empty shape when a *query* fails —
 * Supabase hands back `{ data: null }` rather than throwing, the pattern
 * lib/briefing-latest.ts relies on. This covers the rest: a thrown error from
 * the client itself, a bad timezone, an unexpected row shape. Reported to
 * Sentry, because a silently empty widget that should have data is exactly the
 * failure nobody notices.
 */
function soft<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  return load().catch((err) => {
    Sentry.captureException(err, { tags: { stage: "home_widget" } });
    return fallback;
  });
}

/**
 * The signed-in user's Home layout.
 *
 * This is the first thing in the product to read `users.role` (§3.5) — until
 * now the column existed and was only written. It decides one thing and one
 * thing only: which default order someone sees before they customise. It is
 * NOT a permission check; every surface is still gated by RLS, and an owner and
 * a manager see the same data, in a different order.
 *
 * Failures fall through to the manager defaults rather than taking Home with
 * them, the same bargain `soft()` makes for the widgets below.
 */
async function loadViewerLayout(): Promise<StoredLayout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaultLayoutFor("manager");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role ?? "manager";

  return loadHomeLayout(supabase, user.id, role);
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
