import { Skeleton } from "@/components/ui/skeleton";

export default function CheckinsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-[10px]" />
          <Skeleton className="h-9 w-24 rounded-[10px]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[18px] bg-card p-6 shadow-card">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-4 h-20 w-full" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 w-20 rounded-[10px]" />
              <Skeleton className="h-8 w-20 rounded-[10px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
