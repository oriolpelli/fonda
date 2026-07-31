import Link from "next/link";

import { cn } from "@/lib/utils";

/** Fondas wordmark — Geist, weight 600, tight tracking. */
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
        "font-sans text-xl font-semibold tracking-[-0.03em] text-foreground",
        className
      )}
    >
      FONDAS
    </Link>
  );
}
