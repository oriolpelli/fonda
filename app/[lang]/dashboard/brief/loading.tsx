import { Skeleton } from "@/components/ui/skeleton";

export default function BriefLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border-t border-border pt-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      ))}
    </div>
  );
}
