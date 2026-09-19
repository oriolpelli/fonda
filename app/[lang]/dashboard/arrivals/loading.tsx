import { Skeleton } from "@/components/ui/skeleton";

/**
 * The arrivals page's shape while it loads: the date heading and its action,
 * the two tabs, the chaser queue, then the day's list. Same silhouette either
 * tab resolves to, so the page doesn't jump when the data lands.
 */
export default function ArrivalsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36 rounded-[10px]" />
      </div>

      <Skeleton className="h-9 w-64 self-start rounded-[10px]" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28 rounded-[10px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[16px] bg-card p-6">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-4 h-20 w-full" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 w-20 rounded-[10px]" />
              <Skeleton className="h-8 w-20 rounded-[10px]" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[16px] bg-card p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
