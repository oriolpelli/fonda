import { Skeleton } from "@/components/ui/skeleton";

export default function GuestsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 w-full max-w-[380px]" />
        <Skeleton className="h-9 w-52 rounded-[10px]" />
      </div>
      <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
