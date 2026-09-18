import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the real Home, in `HOME_WIDGETS` order — needs-you, brief,
 * numbers and the 14-night strip full width, then the six half-width widgets —
 * so the page doesn't jump when the data lands.
 *
 * Every block leads with a widget heading (a title bar and a shorter freshness
 * bar, right-aligned), because every widget now does. The order here has to be
 * kept in step with `lib/home-widgets.ts` by hand: this file runs before any
 * data exists, so it can't read the registry's own widths off a loader.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Greeting + date. No header action to shape around: Home has none
          until the Customize panel lands (APP_UX_PROPOSAL.md §3.4). */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Needs you today — pinned first, full width. Three rows, the shape a
            ranked to-do list arrives in. */}
        <Widget className="lg:col-span-2" titleWidth="w-36">
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[18px] bg-card shadow-card">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="flex items-start gap-3 px-6 py-4">
                <Skeleton className="mt-[7px] size-[7px] shrink-0 rounded-[2px]" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </Widget>

        {/* Morning brief — two clamped lines and the counts line. */}
        <Widget className="lg:col-span-2" titleWidth="w-28">
          <div className="flex flex-col gap-3 rounded-[18px] bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="mt-1 size-4 shrink-0" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </Widget>

        {/* Today's numbers. Shaped like the real cards (§6): white, floating on
            the grey ground on the resting shadow, no outer hairline. A bordered
            transparent box was the v2 shape and would land the page on a
            different silhouette than the one the data arrives into. */}
        <Widget className="lg:col-span-2" titleWidth="w-32">
          <div className="grid grid-cols-2 overflow-hidden rounded-[18px] bg-card shadow-card lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-5 md:px-6 md:py-7">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="mt-2 h-3 w-24 md:mt-3" />
              </div>
            ))}
          </div>
        </Widget>

        {/* The next 14 nights */}
        <Widget className="lg:col-span-2" titleWidth="w-36">
          <div className="rounded-[18px] bg-card p-6 shadow-card">
            {/* overflow-x-auto, like the real strip — without it the 14 columns
                push the whole page sideways on a phone while it loads. */}
            <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[88px] min-w-[42px] flex-1 rounded-[4px]"
                />
              ))}
            </div>
            <Skeleton className="mt-5 h-11 w-full rounded-[10px]" />
          </div>
        </Widget>

        {/* Needs a reply — the first half-width widget. */}
        <Widget titleWidth="w-28">
          <div className="flex flex-col overflow-hidden rounded-[18px] bg-card shadow-card">
            <div className="flex flex-col divide-y divide-border">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-start gap-3 px-6 py-4">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-6 py-3.5">
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </Widget>

        {/* Arrivals and departures — the same list card, so the same skeleton.
            No footer row: the "+N more" door only appears past eight guests,
            and a skeleton must not promise a control the data may not bring. */}
        <Widget titleWidth="w-28">
          <GuestRows rows={4} />
        </Widget>
        <Widget titleWidth="w-32">
          <GuestRows rows={4} />
        </Widget>

        {/* VIP arrivals without a note — short by nature, and name-only rows. */}
        <Widget titleWidth="w-44">
          <GuestRows rows={2} detail={false} />
        </Widget>

        {/* Inbox pulse — the three-cell stat row. */}
        <Widget titleWidth="w-24">
          <div className="grid grid-cols-3 overflow-hidden rounded-[18px] bg-card shadow-card">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-5 md:px-6 md:py-7">
                <Skeleton className="h-7 w-12 md:h-9" />
                <Skeleton className="mt-2 h-3 w-20 md:mt-3" />
              </div>
            ))}
          </div>
        </Widget>

        {/* Sync health — a source name and its quiet last-run line. No
            freshness bar in the heading: this widget is the freshness. */}
        <Widget titleWidth="w-24" freshness={false}>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[18px] bg-card shadow-card">
            {Array.from({ length: 2 }).map((_, row) => (
              <div
                key={row}
                className="flex items-baseline justify-between gap-4 px-6 py-4"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </Widget>
      </div>
    </div>
  );
}

/** The guest-list card three of the half-width widgets share. */
function GuestRows({
  rows,
  detail = true,
}: {
  rows: number;
  /** False for a name-only list (the VIP widget). */
  detail?: boolean;
}) {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[18px] bg-card shadow-card">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-start justify-between gap-4 px-6 py-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              {detail ? <Skeleton className="h-3 w-1/3" /> : null}
            </div>
          </div>
          {detail ? <Skeleton className="h-3 w-12 shrink-0" /> : null}
        </div>
      ))}
    </div>
  );
}

/** One widget slot: the heading row every widget carries, then its card. */
function Widget({
  className,
  titleWidth,
  freshness = true,
  children,
}: {
  className?: string;
  /** Roughly the width of the real title, so the row doesn't resize on swap. */
  titleWidth: string;
  /** False for the one widget whose heading carries no freshness line. */
  freshness?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Skeleton className={`h-4 ${titleWidth}`} />
        {freshness ? <Skeleton className="h-3 w-20" /> : null}
      </div>
      {children}
    </div>
  );
}
