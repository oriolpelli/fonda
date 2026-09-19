import { Skeleton } from "@/components/ui/skeleton";

/**
 * The thread list has a shape worth holding: without it the composer jumps
 * 240px left on every navigation between conversations.
 */
export default function ChatLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="hidden w-[240px] shrink-0 flex-col gap-1 self-start rounded-[16px] bg-card p-2 lg:flex">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 px-2.5 py-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-12 w-full rounded-[14px]" />
      </div>
    </div>
  );
}
