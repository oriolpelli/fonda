import type { Metadata } from "next";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { locale, dict } = await loadDictionary((await params).lang);
  return {
    title: dict.contact.metaTitle,
    description: dict.contact.intro,
    alternates: {
      canonical: absoluteUrl(locale, "/contact"),
      languages: languageAlternates("/contact"),
    },
  };
}

/**
 * Contact wears marketing chrome, not the reduced legal chrome — it is the
 * destination of the pricing band's CTA, so a visitor landing here should be
 * able to keep reading the site rather than hit a dead end with a "Home" link.
 *
 * Deliberately no gradient hero (§7): the page has one job, and the one
 * gradient per screen is better spent on the surfaces that sell.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} dict={dict} />

      <main className="flex-1 px-6 py-20 md:px-8 md:py-28">
        <div className="mx-auto w-full max-w-[1120px]">
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
            {dict.footer.contact}
          </span>
          <h1 className="mt-5 max-w-[14ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground">
            {dict.contact.heading}
          </h1>
          {/* Carries the "what to expect" promise — we answer our own email,
              usually within a day. Keep that commitment in the copy only as
              long as it stays true. */}
          <p className="mt-6 max-w-[54ch] text-[19px] leading-[1.6] text-muted-foreground">
            {dict.contact.intro}
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-[7fr_5fr]">
            <section className="rounded-[18px] bg-card p-8 shadow-card md:p-10">
              <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">
                {dict.contact.emailHeading}
              </h2>
              <p className="mt-3 max-w-[42ch] text-[16px] leading-[1.6] text-muted-foreground">
                {dict.contact.emailHint}
              </p>
              <div className="mt-8">
                <Button asChild variant="ink" size="lg">
                  <a href={`mailto:${COMPANY.contactEmail}`}>
                    {dict.contact.emailAction}
                  </a>
                </Button>
              </div>
              {/* The address in plain text next to the button: a mailto that
                  opens a mail client unannounced is a small hostile surprise,
                  and this is the one address the whole site points at. */}
              <p className="mt-4 text-[15px] text-muted-foreground">
                {COMPANY.contactEmail}
              </p>
            </section>

            <div className="flex flex-col gap-6">
              <section className="rounded-[18px] bg-card p-8 shadow-card">
                <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                  {dict.contact.pilotHeading}
                </h2>
                <p className="mt-3 text-[16px] leading-[1.6] text-muted-foreground">
                  {dict.contact.pilotBody}
                </p>
              </section>

              <section className="rounded-[18px] bg-card p-8 shadow-card">
                <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                  {dict.contact.locationHeading}
                </h2>
                <p className="mt-3 text-[16px] leading-[1.6] text-muted-foreground">
                  {dict.contact.locationBody}
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}
