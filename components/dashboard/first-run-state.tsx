import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The CTA's inverted treatment on the gradient: a white surface with ink text
 * is the strongest, calmest thing that can sit on a sunrise.
 *
 * Exported because a `ctaSlot` has to match the button it replaces, and the
 * alternative is a second copy of these classes drifting out of step with this
 * one.
 */
export const FIRST_RUN_CTA_ON_GRADIENT =
  "bg-[var(--fonda-white)] text-[var(--fonda-text)] hover:bg-[var(--fonda-surface-2)]";

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
 *
 * v3: this is the page's gradient hero (FONDA_SANA_REDESIGN.md §7.3) — the warm
 * sunrise, white text, one white CTA. It is the first thing a new hotel sees, so
 * it is the right place to spend the screen's one gradient.
 */
export function FirstRunState({
  title,
  body,
  ctaLabel,
  ctaHref,
  /** True for OAuth route handlers (/connect/*), which aren't pages and so
      must not be prefetched or client-navigated. */
  external = false,
  /**
   * `plain` gives up the gradient for a white card. Pass it when the page has
   * already spent its one hero elsewhere — the Morning Brief does exactly this,
   * because its header hero outranks a first-run card underneath it (§7.2).
   */
  tone = "gradient",
  ctaSlot,
}: {
  title: string;
  body: string;
  /** Ignored when `ctaSlot` is given. */
  ctaLabel?: string;
  /** Ignored when `ctaSlot` is given. */
  ctaHref?: string;
  external?: boolean;
  tone?: "gradient" | "plain";
  /**
   * Replaces the default link button, for the one case where the action is not
   * a navigation: In-house's WhatsApp card, whose button records interest and
   * goes nowhere because there is nowhere yet to go. Pass a Client Component —
   * this stays a Server Component.
   */
  ctaSlot?: ReactNode;
}) {
  const gradient = tone === "gradient";

  return (
    <section
      className={cn(
        "px-6 py-12 text-center md:px-8 md:py-14",
        gradient
          ? "gradient-hero rounded-[20px] md:px-10 md:py-16"
          : "rounded-[16px] bg-card"
      )}
    >
      <h2
        className={cn(
          "text-xl font-semibold tracking-[-0.02em] md:text-2xl",
          gradient ? "text-[var(--fonda-text-inv)]" : "text-foreground"
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mx-auto mt-3 max-w-md text-sm leading-relaxed",
          // Full white, not a translucent white: at 90% over the scrimmed
          // amber this measures 4.36:1 and fails AA at 14px. Hierarchy comes
          // from the title's size and weight instead.
          gradient ? "text-[var(--fonda-text-inv)]" : "text-muted-foreground"
        )}
      >
        {body}
      </p>
      {ctaSlot ?? (
        <Button
          asChild
          className={cn("mt-6", gradient && FIRST_RUN_CTA_ON_GRADIENT)}
        >
          {external ? (
            <a href={ctaHref}>{ctaLabel}</a>
          ) : (
            <Link href={ctaHref!}>{ctaLabel}</Link>
          )}
        </Button>
      )}
    </section>
  );
}
