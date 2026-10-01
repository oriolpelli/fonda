import { Skeleton } from "@/components/ui/skeleton";

/**
 * Holds the page's shape while a conversation loads: the list column flush
 * against the sidebar from `lg` (same `data-chat-surface` hook as the page, so
 * the layout drops its padding for this too) and the conversation beside it.
 * Without it the composer would jump on every switch between conversations.
 */
export default function ChatLoading() {
  return (
    <div
      data-chat-surface
      className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-0"
    >
      <div className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col gap-1 border-r border-[var(--fonda-border)] bg-[var(--fonda-bg)] px-2 pb-6 pt-5 lg:flex">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 px-2.5 py-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col lg:px-10 lg:pt-10">
        <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-auto h-12 w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
