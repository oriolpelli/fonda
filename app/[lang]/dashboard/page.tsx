import * as Sentry from "@sentry/nextjs";
import { cache, Suspense, type ReactElement } from "react";

import { loadDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { HomeCustomizePanel } from "@/components/dashboard/home-customize-panel";
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
import {
  skeletonShapeFor,
  WidgetSkeleton,
} from "@/components/dashboard/widgets/widget-skeleton";
import { loadTodayMovements, type TodayMovements } from "@/lib/arrivals";
import { getHotel, getSessionProfile } from "@/lib/auth";
import { loadTodaysBriefing, type TodaysBriefing } from "@/lib/briefing-latest";
import { loadDashboardSnapshot } from "@/lib/dashboard-snapshot";
import { loadHomeRates, type HomeRates } from "@/lib/rate-outlook";
import { byUrgency } from "@/lib/email-urgency";
import {
  defaultLayoutFor,
  homeWidgetsForLayout,
  loadHomeLayout,
  type StoredLayout,
} from "@/lib/home-layout";
import { type HomeWidgetKey } from "@/lib/home-widgets";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadInboxSummary, loadReservationThreads } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { loadSyncHealth, type SourceHealth } from "@/lib/sync-health";
import { timed } from "@/lib/timing";
import { buildTodoList } from "@/lib/todo-rules";

/**
 * Home — the ten-second "what needs me, and how is the hotel right now?"
 * snapshot (APP_UX_PROPOSAL.md §3).
 *
 * This file is a *composer*, not a layout. It starts every read once and then
 * walks the user's resolved layout (`lib/home-layout.ts`), letting each widget
 * it names await the slice it needs — and stream in when that slice lands. Widths come from the registry
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
 * Rates (B17) come from the rate cache the sync keeps (lib/rate-sync.ts) —
 * read here, never computed, so there is no PMS call on this page either.
 */

/** How many messages the "needs a reply" widget shows before deferring to the inbox. */
const NEEDS_REPLY_LIMIT = 3;

// ---------------------------------------------------------------------------
// The reads — each once per request
// ---------------------------------------------------------------------------
//
// Home streams (docs/audits/2026-10-01-performance.md §4.4). The greeting row
// renders as soon as the three small reads it needs are back, and every widget
// is its own <Suspense> boundary that awaits only the reads IT uses, so each
// card appears the moment its data does — instead of the whole page waiting
// behind a skeleton for the slowest of ten.
//
// React `cache` makes each read below run once per request however many
// widgets ask for it: the snapshot feeds five widgets, the inbox four. They
// all start together at the top of the page, before the greeting row is even
// awaited.
//
// The brief uses the same loader the Morning Brief page does, so the teaser can
// never claim a brief that page would deny. Its timezone comes from the
// request's one hotel read (lib/auth.ts).

const readSnapshot = cache(() =>
  timed("home.snapshot", loadDashboardSnapshot())
);
// Summary: Home ranks and counts mail, it never shows a body or a draft.
const readInbox = cache(() => timed("home.inbox", loadInboxSummary()));
const readMovements = cache(() =>
  soft(
    () => timed("home.movements", loadTodayMovements()),
    null as TodayMovements | null
  )
);
// The rate cache (B17): two small reads; null when it isn't there yet.
const readRates = cache(() =>
  soft(() => timed("home.rates", loadHomeRates()), null as HomeRates | null)
);
const readSyncHealth = cache(() =>
  soft(() => timed("home.syncHealth", loadSyncHealth()), [] as SourceHealth[])
);
const readBrief = cache(() =>
  soft(
    () =>
      timed(
        "home.brief",
        getHotel().then((hotel) => loadTodaysBriefing(hotel?.timezone || "UTC"))
      ),
    null as TodaysBriefing | null
  )
);

/**
 * Unanswered mail, most urgent first — the same ranking the inbox uses under
 * "by urgency". Not re-derived here (B7.1 owns it).
 */
const readUnanswered = cache(async () =>
  (await readInbox()).emails
    .filter((email) => email.urgency.kind !== "handled")
    .sort(byUrgency)
);

/**
 * Which conversation to open for each VIP arriving without a note — the one
 * read that needs another's result (the snapshot's VIP list). Costs nothing
 * when there is no such VIP.
 */
const readVipThreads = cache(async () => {
  const snapshot = await readSnapshot();
  return soft(
    () =>
      timed(
        "home.vipThreads",
        loadReservationThreads(
          snapshot.vipArrivalsWithoutNote.map((vip) => vip.reservationId)
        )
      ),
    new Map<string, string>()
  );
});

const readTodos = cache(async () => {
  const [snapshot, unanswered] = await Promise.all([
    readSnapshot(),
    readUnanswered(),
  ]);
  return buildTodoList({
    // `receivedAt` is only read by the brief's "since" filter, but the rules
    // take one email shape, so Home feeds it too.
    emails: unanswered.map((email) => ({ ...email, receivedAt: email.created_at })),
    vipArrivalsWithoutNote: snapshot.vipArrivalsWithoutNote,
    unconfirmedEtasTomorrow: snapshot.unconfirmedEtasTomorrow,
    outlook: snapshot.outlook,
    rooms: snapshot.rooms,
    hasSyncedData: snapshot.hasSyncedData,
  });
});

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  // Start every widget's reads now, alongside the greeting row's. Observed
  // here so that a failure is never an unhandled rejection; each widget awaits
  // the same cached promise and handles it there. (A hotel with no PMS returns
  // the first-run state below and drops these — the snapshot and movements
  // loaders return straight away for it, and the rest are small.)
  for (const read of [
    readSnapshot,
    readInbox,
    readMovements,
    readSyncHealth,
    readBrief,
    readRates,
  ]) {
    read().catch(() => {});
  }

  // The greeting row: whose hotel, whose name, which layout. Three small reads,
  // and the only thing the page waits for before it starts to stream.
  const [hotel, gmName, layout] = await Promise.all([
    timed("home.hotel", getHotel()),
    timed("home.gmName", loadGmName()),
    timed("home.layout", loadViewerLayout()),
  ]);

  const timezone = hotel?.timezone || "UTC";
  const greeting = gmName || hotel?.name || "";
  const todayLabel = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const greetingBlock = (
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
  if (!hotel?.pms_connected) {
    return (
      <div className="flex flex-col gap-8">
        {/* No Customize here. Before the first sync there are no widgets to
            pick between — the only thing Home can offer is the one action that
            fixes that. */}
        {greetingBlock}
        <FirstRunState
          title={dict.home.presyncTitle}
          body={dict.home.presyncBody}
          ctaLabel={dict.home.presyncCta}
          ctaHref={localizedHref(locale, "/onboarding/connect")}
        />
      </div>
    );
  }

  // Pinned widgets first whatever the user chose, then their enabled ones in
  // their order. Disabled widgets are skipped here but stay in the stored array
  // so Customize can show them unchecked where they were left.
  const widgets = homeWidgetsForLayout(layout);

  return (
    <div className="flex flex-col gap-8">
      {/* Customize sits on the greeting row, right-aligned and quiet
          (APP_UX_PROPOSAL.md §3.4) — the page's one header action, and a ghost
          button because it is secondary to everything below it. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {greetingBlock}
        <HomeCustomizePanel layout={layout} />
      </div>

      {/* One grid for the whole page: full-width widgets span both columns, so
          a full/half/half run lays out without the page having to split itself
          into sections. Widths come from the registry, never from the user
          (§3.2 — pick and order, not resize).

          grid-cols-1 rather than a bare `grid`: Tailwind's grid-cols-* tracks
          are minmax(0,1fr), so a long unbreakable line inside a card can't
          widen the column past the viewport. An implicit `auto` track can.

          Each slot holds its widget's own skeleton shape until that widget's
          reads land; the slot itself never moves, so nothing jumps. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {widgets.map((def) => (
          <div
            key={def.key}
            className={
              def.width === "full" ? "min-w-0 lg:col-span-2" : "min-w-0"
            }
          >
            <Suspense
              fallback={<WidgetSkeleton shape={skeletonShapeFor(def.key)} />}
            >
              <HomeWidget
                widgetKey={def.key}
                dict={dict}
                locale={locale}
                timezone={timezone}
                lastSyncedAt={hotel.last_synced_at}
              />
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One widget, awaiting only its own reads. Every key in the registry has a
 * renderer, and the switch is exhaustive on purpose (the return type has no
 * `undefined`): adding a key to lib/home-widgets.ts fails the build here until
 * it gets one, so the registry can never declare a widget Home silently drops.
 *
 * Freshness lines (§7.4): each widget prints the clock time of the read it
 * actually stands on, never a generic "just now". The inbox arrives
 * newest-first, so its [0] is the latest message.
 */
async function HomeWidget({
  widgetKey,
  dict,
  locale,
  timezone,
  lastSyncedAt,
}: {
  widgetKey: HomeWidgetKey;
  dict: Dictionary;
  locale: Locale;
  timezone: string;
  lastSyncedAt: string | null;
}): Promise<ReactElement> {
  const syncedAt = clockTime(locale, timezone, lastSyncedAt);

  switch (widgetKey) {
    case "needs-you":
      return (
        <NeedsYouWidget
          dict={dict}
          locale={locale}
          items={await readTodos()}
          syncedAt={syncedAt}
        />
      );
    case "brief": {
      const [brief, snapshot, unanswered] = await Promise.all([
        readBrief(),
        readSnapshot(),
        readUnanswered(),
      ]);
      return (
        <BriefWidget
          dict={dict}
          locale={locale}
          summary={brief?.content.summary ?? null}
          generatedAt={clockTime(locale, timezone, brief?.generatedAt)}
          arrivals={snapshot.hasSyncedData ? snapshot.checkinsToday : null}
          waiting={unanswered.length}
        />
      );
    }
    case "numbers": {
      const snapshot = await readSnapshot();
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
      return (
        <NumbersWidget
          dict={dict}
          stats={stats}
          hasSyncedData={snapshot.hasSyncedData}
          syncedAt={syncedAt}
        />
      );
    }
    case "outlook": {
      const [snapshot, rates] = await Promise.all([readSnapshot(), readRates()]);
      return (
        <OutlookWidget
          dict={dict}
          locale={locale}
          outlook={snapshot.outlook}
          today={snapshot.today}
          syncedAt={syncedAt}
          rates={rates}
        />
      );
    }
    case "needs-reply": {
      const [inbox, unanswered] = await Promise.all([
        readInbox(),
        readUnanswered(),
      ]);
      return (
        <NeedsReplyWidget
          dict={dict}
          locale={locale}
          emails={unanswered.slice(0, NEEDS_REPLY_LIMIT)}
          updatedAt={clockTime(locale, timezone, inbox.emails[0]?.created_at)}
        />
      );
    }
    case "arrivals-today": {
      const movements = await readMovements();
      return (
        <ArrivalsWidget
          dict={dict}
          locale={locale}
          arrivals={movements?.arrivals ?? []}
          syncedAt={syncedAt}
        />
      );
    }
    case "departures-today": {
      // A failed movements read falls back to an empty list in the hotel's own
      // timezone, as it always has.
      const movements = await readMovements();
      return (
        <DeparturesWidget
          dict={dict}
          locale={locale}
          departures={movements?.departures ?? []}
          timezone={movements?.timezone ?? timezone}
          syncedAt={syncedAt}
        />
      );
    }
    case "vip-no-note": {
      const [snapshot, threads] = await Promise.all([
        readSnapshot(),
        readVipThreads(),
      ]);
      return (
        <VipNoNoteWidget
          dict={dict}
          locale={locale}
          vips={snapshot.vipArrivalsWithoutNote}
          threads={threads}
          syncedAt={syncedAt}
        />
      );
    }
    case "inbox-pulse": {
      const inbox = await readInbox();
      return (
        <InboxPulseWidget
          dict={dict}
          draftsReady={inbox.draftsReady}
          sentToday={inbox.sentToday}
          avgResponseHours={inbox.avgResponseHours}
          updatedAt={clockTime(locale, timezone, inbox.emails[0]?.created_at)}
        />
      );
    }
    case "sync-health":
      return (
        <SyncHealthWidget
          dict={dict}
          locale={locale}
          sources={await readSyncHealth()}
          timezone={timezone}
        />
      );
  }
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
  // Shared with the dashboard layout's own lookup in the same render.
  const viewer = await getSessionProfile();
  if (!viewer) return defaultLayoutFor("manager");

  const supabase = await createClient();
  return loadHomeLayout(supabase, viewer.id, viewer.role ?? "manager");
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
