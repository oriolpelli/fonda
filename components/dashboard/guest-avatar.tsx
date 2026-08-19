import { cn } from "@/lib/utils";

/**
 * The small coloured disc on an inbox / concierge row (§7.3) — the only place
 * besides the gradient surfaces where colour appears in the product.
 *
 * The rules that keep it from becoming decoration:
 *   · the palette is fixed and warm, and lives in globals.css as tokens;
 *   · the hue is a stable hash of the guest, so the same guest keeps the same
 *     disc from the dashboard card to the inbox list — it carries a little
 *     recognition, it isn't random colour;
 *   · every hue clears 4.5:1 against the white initials;
 *   · the row around it stays completely neutral.
 */

// Full class strings, not built by interpolation — Tailwind only emits classes
// it can see in the source.
const DISCS = [
  "bg-[var(--fonda-avatar-1)]",
  "bg-[var(--fonda-avatar-2)]",
  "bg-[var(--fonda-avatar-3)]",
  "bg-[var(--fonda-avatar-4)]",
  "bg-[var(--fonda-avatar-5)]",
];

/** djb2, kept tiny — this only has to be stable, not well-distributed. */
function hueFor(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return DISCS[hash % DISCS.length];
}

/** Up to two initials: "Marta Ruiz" → MR, "ana@hotel.com" → A. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function GuestAvatar({
  name,
  className,
}: {
  /** Guest name, or the from-address when there is no name. */
  name: string;
  className?: string;
}) {
  return (
    <span
      // Decorative: the row already says who the message is from, so a screen
      // reader gains nothing from hearing the initials again.
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium leading-none text-[var(--fonda-text-inv)]",
        hueFor(name),
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
