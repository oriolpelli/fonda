import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the real Dashboard — header, stat row, 14-night strip, then the
 * two cards — so the page doesn't jump when the data lands.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </div>

      {/* Stat row. Shaped like the real cards (§6): white, floating on the grey
          ground on the resting shadow, no outer hairline. A bordered
          transparent box was the v2 shape and would land the page on a
          different silhouette than the one the data arrives into. */}
      <div className="grid grid-cols-2 overflow-hidden rounded-[18px] bg-card shadow-card lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-5 md:px-6 md:py-7">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="mt-2 h-3 w-24 md:mt-3" />
          </div>
        ))}
      </div>

      {/* The next 14 nights */}
      <div className="rounded-[18px] bg-card p-6 shadow-card">
        <Skeleton className="h-3 w-36" />
        {/* overflow-x-auto, like the real strip — without it the 14 columns
            push the whole page sideways on a phone while it loads. */}
        <div className="-mx-6 mt-5 flex gap-1.5 overflow-x-auto px-6">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[88px] min-w-[42px] flex-1 rounded-[4px]"
            />
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-[10px]" />
      </div>

      {/* Needs a reply · Do this first */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, card) => (
          <div key={card} className="rounded-[18px] bg-card p-6 shadow-card">
            <Skeleton className="h-3 w-32" />
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
