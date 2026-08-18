import {
  BarChart3,
  Clock,
  ConciergeBell,
  DoorOpen,
  Inbox,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type EmptyStateIcon =
  | "concierge"
  | "analytics"
  | "chat"
  | "checkins"
  | "emails"
  /** Generic fallback for a roadmap feature with no icon of its own. */
  | "upcoming";

// Icons are resolved here by string key, never passed in as a component/function
// prop — matches the pattern in components/dashboard/sidebar.tsx (icons must
// never cross a server->client props boundary as a function reference).
const ICONS: Record<EmptyStateIcon, LucideIcon> = {
  concierge: ConciergeBell,
  analytics: BarChart3,
  chat: MessageSquare,
  checkins: DoorOpen,
  emails: Inbox,
  upcoming: Clock,
};

/** Lets a caller with an arbitrary key fall back instead of failing to build. */
export function isEmptyStateIcon(value: string): value is EmptyStateIcon {
  return value in ICONS;
}

export function EmptyState({
  icon,
  message,
  size = "default",
  className,
}: {
  icon: EmptyStateIcon;
  message: string;
  size?: "default" | "compact";
  className?: string;
}) {
  const Icon = ICONS[icon];
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "p-6" : "rounded-[16px] border border-border bg-muted px-6 py-14",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--fonda-inset)] text-[var(--fonda-text-3)]",
          compact ? "size-8" : "size-10"
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} strokeWidth={1.5} />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
