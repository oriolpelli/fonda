import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A small rounded chip naming a piece of context something was built from
 * (FONDA_SANA_REDESIGN.md §8.2, APP_UX_PROPOSAL.md §7.4).
 *
 * Extracted from chat-thread.tsx so the chat, the morning brief and anything
 * else that has to show its working all draw the same object. Provenance that
 * looks different in two places reads as two different claims.
 *
 * NEUTRAL BY CONSTRUCTION. A chip is chrome and chrome is colorless — a source
 * chip with a brand hue on it would be the first piece of colour to leak back
 * into the frame, and it would look like a status rather than an attribution.
 *
 * `nested` because a chip is one step DOWN from the surface it sits on, and v4
 * inverted what that means: `bg-card` is the well fill now, so inside a panel
 * that is itself a well the chip has to step again or it disappears.
 */
export function SourceChip({
  icon: Icon,
  label,
  nested,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  nested?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] leading-none text-[var(--fonda-text-2)] ring-1 ring-[var(--fonda-border-2)]",
        nested ? "bg-surface-2" : "bg-card",
        className
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="size-3.5 text-[var(--fonda-text-3)]"
          strokeWidth={1.5}
        />
      ) : null}
      {label}
    </span>
  );
}
