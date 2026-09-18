import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { t } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Every footer link points at something that exists today. There is no
 * placeholder state: an entry either has a real destination or it is not in
 * this list. Add About / Careers / Press / Help centre / Changelog back here
 * on the day their pages ship, not before — a link to nothing is worse than a
 * link that isn't there.
 *
 * Security and Cookies resolve to sections of the privacy policy, which is
 * where that material actually lives; the ids they target are declared in
 * `app/[lang]/(legal)/privacy/page.tsx`.
 */
function footerColumns(locale: Locale, dict: Dictionary, isHome: boolean) {
  const home = localizedHref(locale, "/");
  const anchor = (hash: string) => (isHome ? hash : `${home}${hash}`);

  return [
    {
      title: dict.footer.productTitle,
      links: [
        { label: dict.nav.features, href: anchor("#features") },
        { label: dict.nav.howItWorks, href: anchor("#how") },
        { label: dict.footer.pricing, href: anchor("#pricing") },
        { label: dict.footer.integrations, href: anchor("#works-with") },
      ],
    },
    {
      title: dict.footer.companyTitle,
      links: [
        { label: dict.footer.contact, href: localizedHref(locale, "/contact") },
      ],
    },
    {
      title: dict.footer.resourcesTitle,
      links: [
        {
          label: dict.footer.sampleBrief,
          href: localizedHref(locale, "/sample-brief"),
        },
        { label: dict.nav.faq, href: anchor("#faq") },
      ],
    },
    {
      title: dict.footer.legalTitle,
      links: [
        { label: dict.footer.privacy, href: localizedHref(locale, "/privacy") },
        { label: dict.footer.terms, href: localizedHref(locale, "/terms") },
        {
          label: dict.footer.cookies,
          href: `${localizedHref(locale, "/privacy")}#cookies`,
        },
        {
          label: dict.footer.security,
          href: `${localizedHref(locale, "/privacy")}#security`,
        },
      ],
    },
  ];
}

/**
 * The marketing site's footer — flat and light: it sits directly on the grey
 * ground with hairline rules between bands, no card, no dark mega-footer and
 * no second accent. On the landing page the ink band is the CTA above it; two
 * dark slabs in a row would read as a wall.
 *
 * `isHome` has the same meaning as on `SiteHeader`: it keeps the section
 * links bare in-page anchors on the landing page and makes them absolute
 * everywhere else.
 */
export function SiteFooter({
  locale,
  dict,
  isHome = false,
}: {
  locale: Locale;
  dict: Dictionary;
  isHome?: boolean;
}) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-[1120px] px-6 md:px-8">
        {/* Brand + newsletter */}
        <div className="grid gap-12 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            {/* The wordmark alone. A decorative olive branch used to sit
                above it; it was removed rather than restyled — the footer
                reads better with one voice in it. */}
            <Wordmark
              href={localizedHref(locale, "/")}
              className="block text-[clamp(2.75rem,7vw,4.5rem)] leading-none tracking-[-0.04em]"
            />
            <p className="mt-5 max-w-[34ch] text-[16px] leading-[1.6] text-muted-foreground">
              {dict.footer.valueProp}
            </p>
          </div>

          {/* Newsletter — real: server action, double opt-in, privacy line
              at the point of collection. See app/[lang]/newsletter/. */}
          <NewsletterForm />
        </div>

        {/* Link columns */}
        <div className="grid gap-10 border-t border-border py-14 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns(locale, dict, isHome).map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                {column.title}
              </h3>
              <ul className="mt-5 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-muted-foreground transition-colors duration-[180ms] hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-border py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {t(dict.footer.rights, { year: new Date().getFullYear() })}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
