import { Skeleton } from "@/components/ui/skeleton";

export default function BriefHistoryLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border-t border-border pt-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
