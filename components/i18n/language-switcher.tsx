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
              "rounded-[7px] px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
              active
                ? "bg-[var(--fonda-accent)] text-white"
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
