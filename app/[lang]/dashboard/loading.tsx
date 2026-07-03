import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[16px] border border-border bg-card p-6">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-3 h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-[16px] border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-28 rounded-[10px]" />
        </div>
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />
      </div>
      <div className="rounded-[16px] border border-border bg-card p-6">
        <Skeleton className="mb-4 h-3 w-40" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
