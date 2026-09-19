import { Skeleton } from "@/components/ui/skeleton";

/**
 * Home's loading shape — deliberately *not* a mirror of the real page.
 *
 * It used to be one: ten widgets in `HOME_WIDGETS` order. That stopped being
 * true when Home learned to compose from the user's stored layout
 * (`lib/home-layout.ts`) — both role defaults differ from registry order, and
 * anyone who has opened Customize has an order of their own. This file runs
 * before any data exists, so it cannot read that row and must not pretend to
 * know it.
 *
 * So it says "Home is coming" rather than "this widget is coming":
 *
 * - **One pinned block, then a generic rhythm.** "Needs you today" is the one
 *   slot no layout can move (the registry pins it first, full width), so it is
 *   the one interior drawn faithfully. Below it, one full-width band and four
 *   half-width tiles — a shape, not a sequence.
 * - **Six slots, not ten.** Both role defaults render nine cards (each has one
 *   widget off), and a user who unticks more renders fewer, so a skeleton sized
 *   to the registry always overshoots. Undershooting is the kinder error: the
 *   page settles by growing into the data instead of collapsing onto it.
 *
 * Card *material* still matters and is still exact — white, `rounded-[18px]`,
 * the resting shadow, no outer hairline (FONDA_SANA_REDESIGN.md §6) — because
 * that is what makes the swap invisible whichever widget arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* The greeting row carries a header action now: the Customize ghost
          button (APP_UX_PROPOSAL.md §3.4). Same `justify-between` wrapper
          page.tsx uses, with a placeholder at the ghost button's own metrics
          (`size="sm"` — h-9, 8px radius), so nothing on the row moves when the
          real one lands. A hotel that has never synced gets no button, which is
          the one case this over-promises by a chip. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-[8px]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Needs you today — pinned first, full width, and the only slot whose
            contents are predictable. Three rows, the shape a ranked to-do list
            arrives in. */}
        <Widget className="lg:col-span-2" titleWidth="w-36">
          <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="flex items-start gap-3 px-6 py-4">
                <Skeleton className="mt-[7px] size-[7px] shrink-0 rounded-[2px]" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </Widget>

        {/* One full-width band. Two lines and a meta line: whatever the layout
            puts here — a brief teaser, the four numbers, the 14-night strip —
            it is a white card of roughly this height, and guessing which would
            be a prediction this file isn't entitled to make. */}
        <Widget className="lg:col-span-2" titleWidth="w-32">
          <div className="flex flex-col gap-3 rounded-[16px] bg-card p-6">
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </Widget>

        {/* Four half-width tiles in the list-card shape most of them share. No
            footer row: the "+N more" door only appears past eight guests, and a
            skeleton must not promise a control the data may not bring. */}
        <Widget titleWidth="w-28">
          <ListCard rows={4} />
        </Widget>
        <Widget titleWidth="w-32">
          <ListCard rows={4} />
        </Widget>
        <Widget titleWidth="w-24">
          <ListCard rows={3} />
        </Widget>
        <Widget titleWidth="w-28">
          <ListCard rows={3} />
        </Widget>
      </div>
    </div>
  );
}

/** The list card the half-width widgets share: an avatar, two lines, one meta. */
function ListCard({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-start justify-between gap-4 px-6 py-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** One widget slot: the heading row every widget carries, then its card. */
function Widget({
  className,
  titleWidth,
  children,
}: {
  className?: string;
  /** Roughly the width of a real title, so the row doesn't resize on swap. */
  titleWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className="h-3 w-20" />
      </div>
      {children}
    </div>
  );
}
