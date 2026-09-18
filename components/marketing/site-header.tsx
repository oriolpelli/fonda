import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * The marketing site's sticky nav. Shared by the landing page and every other
 * page that wears marketing chrome (/contact).
 *
 * `isHome` decides how the section links are written. On the landing page they
 * stay bare in-page anchors (`#how`); everywhere else they have to carry the
 * home path (`/en#how`) or they point at a section that isn't on the page. The
 * bare form is kept on home deliberately — a same-route `Link` that differs
 * only by hash still scrolls, but it spends a router navigation to do it.
 */
export function SiteHeader({
  locale,
  dict,
  isHome = false,
}: {
  locale: Locale;
  dict: Dictionary;
  isHome?: boolean;
}) {
  const home = localizedHref(locale, "/");
  const anchor = (hash: string) => (isHome ? hash : `${home}${hash}`);

  const sectionLinks = [
    { href: anchor("#how"), label: dict.nav.howItWorks },
    { href: anchor("#features"), label: dict.nav.features },
    { href: anchor("#faq"), label: dict.nav.faq },
    { href: localizedHref(locale, "/login"), label: dict.nav.signIn },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
        <Wordmark href={home} />
        <nav className="flex items-center gap-3 sm:gap-6">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground md:inline"
            >
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher className="hidden md:inline-flex" />
          {/* Visible at every breakpoint. Below sm the bar is wordmark +
              CTA + hamburger in ~312px, which the full label overflows in
              es (and leaves ~6px in ca), so the short label runs there.

              The `after:` strip is a tap target, not decoration: `sm` is h-9,
              so the button paints 36px tall and Phase J's floor is 44. The
              strip grows the hit area vertically inside the 64px bar without
              touching the chrome — the alternative was a visibly chunkier
              button in a header this page has already tuned. Vertical only;
              the button is 76px wide at its narrowest, so width is fine. */}
          <Button
            asChild
            variant="ink"
            size="sm"
            className="relative after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
          >
            <Link href={localizedHref(locale, "/signup")}>
              <span className="sm:hidden">{dict.nav.getEarlyAccessShort}</span>
              <span className="hidden sm:inline">{dict.nav.getEarlyAccess}</span>
            </Link>
          </Button>

          {/* Below md the links above have nowhere to go — they live here. */}
          <MobileNav
            links={sectionLinks}
            ctaHref={localizedHref(locale, "/signup")}
            ctaLabel={dict.nav.getEarlyAccess}
            openLabel={dict.nav.openMenu}
            closeLabel={dict.nav.closeMenu}
          />
        </nav>
      </div>
    </header>
  );
}
