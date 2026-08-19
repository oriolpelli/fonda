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
        // Full size is a page's own "nothing here" surface, so it joins the
        // gradient layer on the quiet sand tier (§7.3). Compact is an inline
        // note inside someone else's card — a gradient there would be a
        // gradient inside a gradient's neighbour, so it stays flat.
        compact ? "p-6" : "gradient-panel rounded-[20px] px-6 py-14 shadow-card",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          compact
            ? "size-8 bg-[var(--fonda-inset)] text-[var(--fonda-text-3)]"
            : // A soft translucent white disc on the sand, per §7.2's
              // "soft translucent white glyph".
              "size-10 bg-[var(--fonda-white)]/45 text-[var(--fonda-text-2)]"
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} strokeWidth={1.5} />
      </div>
      {/* --fonda-text-3 is not allowed on sand (3.33:1 at the darkest stop);
          text-2 measures 4.60:1 there. */}
      <p
        className={cn(
          "max-w-xs text-sm",
          compact ? "text-muted-foreground" : "text-[var(--fonda-text-2)]"
        )}
      >
        {message}
      </p>
    </div>
  );
}
