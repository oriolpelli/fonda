import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
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
 * Card *material* still matters and is still exact — the shapes live in
 * components/dashboard/widgets/widget-skeleton.tsx, which Home also uses as
 * each widget's own fallback while it streams in.
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
        <WidgetSkeleton shape="rows" titleWidth="w-36" className="lg:col-span-2" />

        {/* One full-width band. Whatever the layout puts here — a brief
            teaser, the four numbers, the 14-night strip — it is a card of
            roughly this height, and guessing which would be a prediction this
            file isn't entitled to make. */}
        <WidgetSkeleton shape="band" className="lg:col-span-2" />

        {/* Four half-width tiles in the list-card shape most of them share. */}
        <WidgetSkeleton shape="list" titleWidth="w-28" rows={4} />
        <WidgetSkeleton shape="list" titleWidth="w-32" rows={4} />
        <WidgetSkeleton shape="list" titleWidth="w-24" rows={3} />
        <WidgetSkeleton shape="list" titleWidth="w-28" rows={3} />
      </div>
    </div>
  );
}
