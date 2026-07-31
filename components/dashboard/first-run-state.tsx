import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * What a page says before there is any data behind it.
 *
 * The rule, applied on every dashboard surface: name what this page will show
 * once it's working, then give exactly one action. A new hotel should never
 * meet a blank panel and have to guess whether Fondas is broken, still
 * thinking, or waiting on them.
 *
 * Distinct from components/dashboard/empty-state.tsx, which is the *steady
 * state* "nothing needs you right now" — a good outcome with nothing to do.
 * This one is a setup gap, and always has a way out.
 */
export function FirstRunState({
  title,
  body,
  ctaLabel,
  ctaHref,
  /** True for OAuth route handlers (/connect/*), which aren't pages and so
      must not be prefetched or client-navigated. */
  external = false,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  external?: boolean;
}) {
  return (
    <section className="rounded-[16px] border border-border bg-muted px-6 py-12 text-center md:px-8 md:py-14">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Button asChild className="mt-6">
        {external ? (
          <a href={ctaHref}>{ctaLabel}</a>
        ) : (
          <Link href={ctaHref}>{ctaLabel}</Link>
        )}
      </Button>
    </section>
  );
}
