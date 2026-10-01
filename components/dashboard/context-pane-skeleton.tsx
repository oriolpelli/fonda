import { Skeleton } from "@/components/ui/skeleton";

/**
 * The guest-context pane's placeholder, in the pane's own shape. Shared by the
 * Communications window (each streamed pane's Suspense fallback) and the inbox
 * (while it fetches the pane of a message whose pane didn't travel with the
 * page), so the third column never jumps. Plain markup: usable from server and
 * client components alike.
 */
export function ContextPaneSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="flex w-[280px] shrink-0 flex-col gap-5 border-l border-[var(--fonda-border-2)] bg-[var(--fonda-surface)] p-5"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full bg-inset" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3 bg-inset" />
          <Skeleton className="h-3 w-1/3 bg-inset" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full bg-inset" />
        <Skeleton className="h-3 w-5/6 bg-inset" />
        <Skeleton className="h-3 w-2/3 bg-inset" />
      </div>
    </aside>
  );
}
