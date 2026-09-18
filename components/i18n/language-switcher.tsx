"use client";

import { usePathname, useRouter } from "next/navigation";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { LOCALE_COOKIE } from "@/lib/i18n/get-locale";
import { locales, localeShortNames, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Module-scope so the assignment isn't flagged as mutating external state from
// within a component (react-hooks/immutability).
function persistLocaleCookie(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Compact EN/ES/CA segmented switcher. Swaps the locale segment of the current
 * path (preserving the rest + query) and persists the choice in the
 * `NEXT_LOCALE` cookie so it sticks on the next visit.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useDictionary();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // Replace the leading locale segment; pathname always starts with /<locale>.
    const rest = pathname.replace(/^\/(en|es|ca)(?=\/|$)/, "");
    // Read the query at click time (avoids useSearchParams, which would force a
    // Suspense boundary on statically-prerendered pages like /login).
    const query =
      typeof window !== "undefined" ? window.location.search : "";
    const target = `/${next}${rest}${query}`;
    persistLocaleCookie(next);
    router.push(target);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[10px] border border-border p-0.5",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            aria-pressed={active}
            className={cn(
              "relative rounded-[7px] px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
              // The visible pill stays 31x25 — three 44x44 segments would be a
              // 140px-wide control for three two-letter labels, and it has to
              // fit beside the CTA in a 312px drawer row. The TARGET is grown
              // instead: an invisible 44px-tall strip centred on the pill, so
              // a thumb gets its full height while the chrome is unchanged.
              // Vertical only — the segments sit 2px apart, so widening would
              // make them overlap each other, which is worse than small. Every
              // container it lives in (h-16 headers, gap-3/gap-4 stacks) has
              // the 9px of slack above and below that this needs.
              "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
              // Ink, not the navy accent: this sits in chrome (the dashboard
              // account menu, the marketing mobile nav), and v3 keeps chrome
              // colorless — the selected locale reads by darkness instead.
              active
                ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
                : "text-[var(--fonda-text-3)] hover:text-foreground"
            )}
          >
            {localeShortNames[l]}
          </button>
        );
      })}
    </div>
  );
}
