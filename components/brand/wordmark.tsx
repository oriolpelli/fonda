import Link from "next/link";

import { cn } from "@/lib/utils";

/** Fonda wordmark — Playfair Display, weight 400, refined (not heavy). */
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
        "font-serif text-xl font-normal tracking-tight text-foreground",
        className
      )}
    >
      Fonda
    </Link>
  );
}
