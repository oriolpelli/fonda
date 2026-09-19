import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import {
  CheckinChasers,
  type ChaserCard,
} from "@/components/dashboard/checkin-chasers";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { GenerateChasersButton } from "@/components/dashboard/generate-chasers-button";
import { clockTime } from "@/components/dashboard/widgets/widget-section";
import {
  WidgetList,
  type WidgetListRow,
} from "@/components/dashboard/widgets/widget-list";
import { loadTodayMovements } from "@/lib/arrivals";
// Server-readable tab contract, kept out of any "use client" module for the
// same reason the inbox keeps its sort contract in lib/inbox-sort.ts.
import { ARRIVALS_TABS, isArrivalsTab, type ArrivalsTab } from "@/lib/arrivals-tab";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { arrivalsHref, guestHref, localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Arrivals & departures — the whole of today's movement, both ends of it
 * (APP_UX_PROPOSAL.md §5.2).
 *
 * This was `/dashboard/checkins`, and it was *only* the ETA-chaser grid: the
 * exceptions, with no way to see the day they were exceptions to, and no
 * check-outs at all. The chaser grid is unchanged and still leads the arrivals
 * tab — it is the queue, the thing with work in it — but the rest of the day
 * now sits under it, and departures finally have a surface of their own.
 *
 * The selected tab is a search param, not a cookie: unlike the inbox sort it is
 * a place rather than a preference, so it is linkable and the Home departures
 * widget can point straight at it. Read here on the server so the right list is
 * in the first paint and nothing flips afterwards.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.sidebar.arrivals };
}

export default async function ArrivalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const [query, supabase] = await Promise.all([searchParams, createClient()]);

  const requested = typeof query.tab === "string" ? query.tab : undefined;
  const tab: ArrivalsTab = isArrivalsTab(requested) ? requested : "arrivals";

  // Chasing arrival times means knowing who is arriving, which means a PMS.
  // Without one, "Generate chasers" can only fail — so don't offer it, and
  // don't claim an empty day either: "No arrivals today" would be a lie when
  // the real answer is that nothing is connected yet.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("pms_connected, timezone")
    .maybeSingle();

  const today = headingDate(locale, hotel?.timezone || "UTC");

  if (!hotel?.pms_connected) {
    return (
      <div className="flex flex-col gap-6">
        <Header dict={dict} today={today} action={null} />
        <FirstRunState
          title={dict.checkin.presyncTitle}
          body={dict.checkin.presyncBody}
          ctaLabel={dict.checkin.presyncCta}
          ctaHref={localizedHref(locale, "/onboarding/connect")}
        />
      </div>
    );
  }

  const [movements, cards] = await Promise.all([
    loadTodayMovements(),
    loadChaserCards(supabase, dict),
  ]);

  const counts = {
    arrivals: movements.arrivals.length,
    departures: movements.departures.length,
  };

  const arrivalRows: WidgetListRow[] = movements.arrivals.map((arrival) => ({
    key: arrival.reservationId,
    href: arrival.customerId ? guestHref(locale, arrival.customerId) : null,
    name: arrival.name || dict.home.movements.guest,
    detail: arrival.roomType,
    // The missing ETA is printed, not left blank — a blank cell reads as data
    // we failed to load, and the gap is the whole point of the queue above.
    meta: arrival.eta || dict.home.arrivals.noEta,
    tag: arrival.returning ? dict.home.arrivals.returning : null,
  }));

  // Name · room · departure time, and nothing else. Late check-out has no field
  // on any reservation we receive (`late_checkout` is an upsell price in
  // Settings, not a per-booking flag) and finance data doesn't exist yet, so
  // both columns §5.2 sketches are absent rather than invented — the same call
  // components/dashboard/widgets/departures-widget.tsx makes.
  const departureRows: WidgetListRow[] = movements.departures.map((departure) => ({
    key: departure.reservationId,
    href: departure.customerId ? guestHref(locale, departure.customerId) : null,
    name: departure.name || dict.home.movements.guest,
    detail: departure.room
      ? t(dict.home.departures.room, { room: departure.room })
      : null,
    meta: clockTime(locale, movements.timezone, departure.endUtc),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Header
        dict={dict}
        today={today}
        action={<GenerateChasersButton label={dict.arrivals.generateChasers} />}
      />

      <Tabs dict={dict} locale={locale} selected={tab} counts={counts} />

      {tab === "arrivals" ? (
        arrivalRows.length === 0 ? (
          <EmptyState icon="arrivals" message={dict.arrivals.emptyArrivals} />
        ) : (
          <div className="flex flex-col gap-6">
            {/* The queue first: the arrivals still missing an ETA, each with a
                draft waiting to go. Rendered only when there is something in
                it — the grid's own empty state belongs to the old page, where
                chasers were all there was. */}
            {cards.length > 0 ? <CheckinChasers chasers={cards} /> : null}
            <WidgetList rows={arrivalRows} />
          </div>
        )
      ) : departureRows.length === 0 ? (
        <EmptyState icon="arrivals" message={dict.arrivals.emptyDepartures} />
      ) : (
        <WidgetList rows={departureRows} />
      )}
    </div>
  );
}

/** "Today · 18 September", with the page's one action at the right. */
function Header({
  dict,
  today,
  action,
}: {
  dict: Dictionary;
  today: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
        {t(dict.arrivals.heading, { date: today })}
      </h1>
      {action}
    </div>
  );
}

/**
 * The two halves of the day — the inbox sort toggle's treatment exactly
 * (components/dashboard/email-inbox.tsx): soft-cornered segmented control, ink
 * for the selected one, no hue anywhere.
 *
 * Links rather than buttons, because the tab *is* the URL: this way the page
 * needs no client JavaScript to change tabs, the selected state survives a
 * reload, and each tab prefetches. `aria-current` is the link's equivalent of
 * the toggle's `aria-pressed`.
 */
function Tabs({
  dict,
  locale,
  selected,
  counts,
}: {
  dict: Dictionary;
  locale: Locale;
  selected: ArrivalsTab;
  counts: Record<ArrivalsTab, number>;
}) {
  return (
    <div
      role="group"
      aria-label={dict.arrivals.tabsLabel}
      className="inline-flex self-start rounded-[10px] border border-[var(--fonda-border-2)] p-0.5"
    >
      {ARRIVALS_TABS.map((value) => (
        <Link
          key={value}
          href={arrivalsHref(locale, value)}
          aria-current={selected === value ? "page" : undefined}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            selected === value
              ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
              : "text-[var(--fonda-text-2)] hover:text-foreground"
          )}
        >
          {t(
            value === "arrivals"
              ? dict.arrivals.tabArrivals
              : dict.arrivals.tabDepartures,
            { count: counts[value] }
          )}
        </Link>
      ))}
    </div>
  );
}

/** The hotel's today, as a GM says it: "18 September". */
function headingDate(locale: Locale, timezone: string): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: timezone,
    day: "numeric",
    month: "long",
  }).format(new Date());
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Today's pending chasers as the grid wants them — unchanged from the page this
 * one replaces, joins and all.
 */
async function loadChaserCards(
  supabase: ServerClient,
  dict: Dictionary
): Promise<ChaserCard[]> {
  // RLS scopes chasers to the caller's hotel.
  const { data: chasers } = await supabase
    .from("checkin_chasers")
    .select("id, reservation_id, guest_email, draft_content")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const reservationIds = [
    ...new Set((chasers ?? []).map((c) => c.reservation_id).filter(Boolean)),
  ] as string[];

  // Join reservation (arrival date, room type) and guest name.
  const reservationById = new Map<
    string,
    { start_utc: string | null; requested_category_id: string | null; customer_mews_id: string | null }
  >();
  const guestById = new Map<string, { first_name: string | null; last_name: string | null }>();

  if (reservationIds.length > 0) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("mews_id, start_utc, requested_category_id, customer_mews_id")
      .in("mews_id", reservationIds);
    for (const r of reservations ?? []) reservationById.set(r.mews_id, r);

    const guestIds = [
      ...new Set(
        (reservations ?? []).map((r) => r.customer_mews_id).filter(Boolean)
      ),
    ] as string[];
    if (guestIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("mews_id, first_name, last_name")
        .in("mews_id", guestIds);
      for (const c of customers ?? []) guestById.set(c.mews_id, c);
    }
  }

  return (chasers ?? []).map((c) => {
    const reservation = c.reservation_id
      ? reservationById.get(c.reservation_id)
      : undefined;
    const guest = reservation?.customer_mews_id
      ? guestById.get(reservation.customer_mews_id)
      : undefined;
    const name = [guest?.first_name, guest?.last_name]
      .filter(Boolean)
      .join(" ");
    return {
      id: c.id,
      guestName: name || c.guest_email || dict.checkin.guest,
      guestEmail: c.guest_email,
      arrivalDate: reservation?.start_utc ?? null,
      roomType: reservation?.requested_category_id ?? null,
      draftContent: c.draft_content,
    };
  });
}
