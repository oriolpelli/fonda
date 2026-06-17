import Link from "next/link";

import { cn } from "@/lib/utils";

/** Fonda wordmark — a simple, professional brand lockup. */
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
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        F
      </span>
      <span className="text-lg font-semibold tracking-tight">Fonda</span>
    </Link>
  );
}
