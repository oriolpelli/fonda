import type { Dictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * The ink half of the split-screen shell — wordmark, value proposition, badge.
 *
 * Shared by the auth routes and onboarding so signing up and setting up read as
 * one continuous flow rather than two products. Hidden below `lg`, where the
 * form column takes the full width.
 */
export function BrandPanel({
  dict,
  homeHref,
}: {
  dict: Dictionary;
  homeHref: string;
}) {
  const lines = [
    dict.authAside.line1,
    dict.authAside.line2,
    dict.authAside.line3,
  ];

  return (
    <div className="relative hidden w-1/2 flex-col justify-between bg-ink p-16 lg:flex">
      <Wordmark href={homeHref} className="text-[var(--fonda-text-inv)]" />
      <div>
        <p className="max-w-[18ch] text-[clamp(1.75rem,2.4vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--fonda-text-inv)]">
          {dict.authAside.headline}
        </p>
        <ul className="mt-8 flex flex-col gap-4">
          {lines.map((line) => (
            <li key={line} className="flex items-start gap-3">
              {/* A translucent white marker, not the navy one v2 used: the
                  accent is content-only in v3 (§3.2), and on this ink panel
                  navy was barely visible anyway (~2.0:1 against #1C1A16).
                  Matched to the copy beside it so the pair reads as one. */}
              <span
                className="mt-[9px] block size-[7px] shrink-0 rounded-[2px] bg-[color-mix(in_srgb,white_72%,transparent)]"
                aria-hidden
              />
              <span className="text-[15px] leading-[1.5] text-[color-mix(in_srgb,white_72%,transparent)]">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,white_45%,transparent)]">
        {dict.hero.badge}
      </span>
    </div>
  );
}
