import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

/**
 * Watercolour spot-vignettes — the warm layer that carries the hero's
 * illustration style into the rest of the page.
 *
 * SOURCE OF TRUTH: design/vignettes.html (set A, the richer set). Each *Art
 * function is a verbatim copy of the matching <svg data-vignette="NAME"> in
 * that file — only attribute casing changes for JSX. Do not redraw; when the
 * art changes, design/vignettes.html is updated first and this is re-synced.
 *
 * Public API (stable): the VignetteName union, the size prop, the shared
 * 120x120 canvas, and the aria-hidden root. Navy (var(--fonda-accent)) is
 * spent only by key (fob) and sail (pennant).
 */

export type VignetteName =
  | "key"
  | "coffee"
  | "olive"
  | "lantern"
  | "olivepot"
  | "lounger"
  | "sail"
  | "arch";

/* --- artwork, synced from design/vignettes.html --------------------------- */

function KeyArt() {
  return (
    <>
      <rect x="24" y="22" width="20" height="26" rx="5" fill="var(--fonda-accent)"/><circle cx="34" cy="31" r="3" fill="#FCFAF5"/><path d="M41 46 l7 8" stroke="var(--fonda-accent)" strokeWidth="4" strokeLinecap="round"/><circle cx="55" cy="61" r="16" fill="#F6E7C8" stroke="#B98A3E" strokeWidth="5"/><circle cx="55" cy="61" r="5" fill="none" stroke="#B98A3E" strokeWidth="3"/><path d="M67 70 L96 97" fill="none" stroke="#B98A3E" strokeWidth="6" strokeLinecap="round"/><path d="M96 97 l1 -11 M89 90 l10 -3" fill="none" stroke="#B98A3E" strokeWidth="5" strokeLinecap="round"/>
    </>
  );
}

function CoffeeArt() {
  return (
    <>
      <path d="M50 30 q-6 -8 3 -15 M63 30 q-6 -8 3 -15" fill="none" stroke="#C9B79A" strokeWidth="3" strokeLinecap="round"/><ellipse cx="58" cy="84" rx="34" ry="8" fill="#F3EAD8" stroke="#6E5A44" strokeWidth="2.6"/><path d="M38 44 h40 v11 a20 18 0 0 1 -40 0 z" fill="#F3EAD8" stroke="#6E5A44" strokeWidth="2.6" strokeLinejoin="round"/><path d="M78 47 q15 2 11 16 q-3 9 -13 8" fill="none" stroke="#6E5A44" strokeWidth="2.6"/><ellipse cx="58" cy="45" rx="19" ry="4" fill="#6E4A2E" opacity="0.65"/>
    </>
  );
}

function OliveArt() {
  return (
    <>
      <path d="M32 94 Q54 58 94 34" fill="none" stroke="#5C7348" strokeWidth="3" strokeLinecap="round"/><g fill="#7E9463"><ellipse cx="47" cy="74" rx="12" ry="5.4" transform="rotate(-34 47 74)"/><ellipse cx="64" cy="59" rx="12" ry="5.4" transform="rotate(-34 64 59)"/><ellipse cx="81" cy="45" rx="11" ry="5" transform="rotate(-34 81 45)"/><ellipse cx="40" cy="60" rx="10" ry="4.8" transform="rotate(26 40 60)"/><ellipse cx="57" cy="46" rx="10" ry="4.8" transform="rotate(26 57 46)"/></g><circle cx="52" cy="71" r="4.6" fill="#5C7348"/><circle cx="70" cy="55" r="4.6" fill="#6E8A5E"/>
    </>
  );
}

function LanternArt() {
  return (
    <>
      <path d="M60 20 v7" stroke="#6E5A44" strokeWidth="2.4"/><circle cx="60" cy="17" r="4" fill="none" stroke="#B98A3E" strokeWidth="2.4"/><path d="M44 34 h32 l-5 -7 h-22 z" fill="#B98A3E" stroke="#6E5A44" strokeWidth="2"/><rect x="46" y="34" width="28" height="44" rx="3" fill="#FBEFD0" stroke="#6E5A44" strokeWidth="2.6"/><rect x="53" y="45" width="14" height="24" rx="2" fill="#F2C86A" opacity="0.85"/><path d="M48 78 h24 l-3 7 h-18 z" fill="#B98A3E" stroke="#6E5A44" strokeWidth="2"/>
    </>
  );
}

function OlivepotArt() {
  return (
    <>
      <circle cx="60" cy="45" r="24" fill="#7E9463"/><circle cx="45" cy="51" r="14" fill="#5C7348" opacity="0.5"/><circle cx="74" cy="49" r="12" fill="#93A97C" opacity="0.6"/><path d="M60 66 v14" stroke="#6E5A44" strokeWidth="4" strokeLinecap="round"/><path d="M45 82 h30 l-5 22 h-20 z" fill="#C67E54" stroke="#6E5A44" strokeWidth="2.6" strokeLinejoin="round"/><path d="M41 82 h38" stroke="#6E5A44" strokeWidth="3" strokeLinecap="round"/>
    </>
  );
}

function LoungerArt() {
  return (
    <>
      <path d="M78 36 v52" stroke="#6E5A44" strokeWidth="3"/><path d="M50 37 a28 21 0 0 1 56 0 z" fill="#C86A86" stroke="#6E5A44" strokeWidth="2.4"/><path d="M50 37 q7 6 14 0 t14 0 t14 0 t14 0" fill="none" stroke="#6E5A44" strokeWidth="2"/><rect x="20" y="78" width="46" height="6" rx="3" fill="#F3EAD8" stroke="#6E5A44" strokeWidth="2.2"/><path d="M24 84 l-4 10 M60 84 l4 10" stroke="#6E5A44" strokeWidth="2.4" strokeLinecap="round"/><path d="M62 78 l10 -12" stroke="#6E5A44" strokeWidth="2.4" strokeLinecap="round"/>
    </>
  );
}

function SailArt() {
  return (
    <>
      <path d="M18 90 q42 14 84 0 q-42 -9 -84 0 z" fill="#8FB0CE"/><path d="M60 78 v-50" stroke="#6E5A44" strokeWidth="2.6"/><path d="M62 32 l22 42 h-22 z" fill="#F3EAD8" stroke="#6E5A44" strokeWidth="2.4" strokeLinejoin="round"/><path d="M56 40 l-15 34 h15 z" fill="#F6EFE0" stroke="#6E5A44" strokeWidth="2"/><path d="M60 28 l11 4 l-11 4 z" fill="var(--fonda-accent)"/><path d="M34 80 h52 l-11 12 h-30 z" fill="#C67E54" stroke="#6E5A44" strokeWidth="2.4" strokeLinejoin="round"/>
    </>
  );
}

function ArchArt() {
  return (
    <>
      <path d="M30 40 h60 l-6 -9 h-48 z" fill="#C67E54" stroke="#6E5A44" strokeWidth="2"/><rect x="34" y="40" width="52" height="66" fill="#F3EAD8" stroke="#6E5A44" strokeWidth="2.4"/><path d="M48 106 v-30 a12 12 0 0 1 24 0 v30 z" fill="#9A7A56" stroke="#6E5A44" strokeWidth="2.4"/><path d="M50 76 a10 10 0 0 1 20 0" fill="none" stroke="#F3EAD8" strokeWidth="1.6"/><path d="M60 106 v-30" stroke="#6E5A44" strokeWidth="1.6"/><path d="M55 65 h10 l2 7 h-14 z" fill="#B98A3E" stroke="#6E5A44" strokeWidth="1.4"/><rect x="40" y="106" width="40" height="6" fill="#E4D2B4" stroke="#6E5A44" strokeWidth="1.4"/><circle cx="41" cy="62" r="3.2" fill="#F2C86A"/><circle cx="79" cy="62" r="3.2" fill="#F2C86A"/>
    </>
  );
}

/* -------------------------------------------------------------------------- */

const ART: Record<VignetteName, () => ReactElement> = {
  key: KeyArt,
  coffee: CoffeeArt,
  olive: OliveArt,
  lantern: LanternArt,
  olivepot: OlivepotArt,
  lounger: LoungerArt,
  sail: SailArt,
  arch: ArchArt,
};

interface VignetteProps {
  name: VignetteName;
  /** Rendered square size in px. Designed for 80-120; defaults to 96. */
  size?: number;
  className?: string;
}

/**
 * A single spot-vignette, flat on the page background. Decorative only — the
 * root svg is aria-hidden, so the adjacent heading carries all the meaning.
 */
export function Vignette({ name, size = 96, className }: VignetteProps) {
  const Art = ART[name];
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn("block", className)}
      aria-hidden="true"
      focusable="false"
    >
      <Art />
    </svg>
  );
}
