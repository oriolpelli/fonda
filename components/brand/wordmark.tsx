import Link from "next/link";

import { cn } from "@/lib/utils";

/** Fonda wordmark — Geist, weight 600, tight tracking. */
export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-sans text-xl font-semibold tracking-[-0.03em] text-foreground",
        className
      )}
    >
      Fonda
    </Link>
  );
}
