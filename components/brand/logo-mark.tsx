import { cn } from "@/lib/utils";

/**
 * The Fondas mark — a keyhole on a soft square, in the brand blue.
 *
 * It is a logo, not chrome: the "no accent in chrome" rule governs nav states,
 * chips and controls, and the mark is none of those. Sized in `em` so it tracks
 * whatever type size the wordmark beside it is set at.
 *
 * Same geometry as `brand/email/fondas-logo-keyhole.svg` and `app/icon.svg`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("size-[1.2em] shrink-0", className)}
    >
      <rect x="4" y="4" width="92" height="92" rx="24" fill="var(--fonda-accent)" />
      <circle cx="50" cy="40" r="15" fill="var(--fonda-white)" />
      <path d="M43 46h14l5 32H38z" fill="var(--fonda-white)" />
    </svg>
  );
}
