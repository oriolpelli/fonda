import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Fondas wordmark — Geist, weight 600, tight tracking.
 *
 * `min-h-11` is a tap target, not a layout rule: at text-xl the link's own box
 * is 28px tall, under the 44px floor, and in every header it lives in the bar
 * is 64px so growing the box moves nothing. The footer passes `block` plus its
 * own clamp size, which overrides the display and already clears 44.
 */
export function Wordmark({
  className,
  href = "/",
  onClick,
}: {
  className?: string;
  href?: string;
  /** Lets a container react to the navigation — e.g. closing a nav drawer. */
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center font-sans text-xl font-semibold tracking-[-0.03em] text-foreground",
        className
      )}
    >
      FONDAS
    </Link>
  );
}
