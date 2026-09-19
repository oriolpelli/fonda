import { Skeleton } from "@/components/ui/skeleton";

/**
 * This one earns its keep more than most: the record runs guest inference on
 * first view (lib/guest-inference.ts), which is a model call, so without a
 * skeleton the page can sit blank for a couple of seconds on the very visit
 * where someone is most curious about it.
 */
export default function GuestRecordLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-7 w-52" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-[16px] bg-card p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-[16px] bg-card p-5">
          <Skeleton className="h-2.5 w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 py-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
