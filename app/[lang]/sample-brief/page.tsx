import Link from "next/link";

import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { getSampleBrief } from "@/app/[lang]/sample-brief/content";
import { Wordmark } from "@/components/brand/wordmark";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SampleBriefRequestForm } from "@/components/marketing/sample-brief-request-form";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/lib/i18n/navigation";
import { t } from "@/lib/i18n/format";
import { sampleHotelVars } from "@/lib/sample-hotel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  return {
    // Bare page name: the [lang] layout's title template appends " · Fondas".
    title: dict.sampleBrief.title,
    description: dict.sampleBrief.disclaimer,
    alternates: {
      canonical: absoluteUrl(locale, "/sample-brief"),
      languages: languageAlternates("/sample-brief"),
    },
  };
}

export default async function SampleBriefPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const sample = getSampleBrief(locale);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Marketing nav (hidden in print — the PDF is the brief alone) */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
          <Wordmark href={localizedHref(locale, "/")} />
          <nav className="flex items-center gap-3 sm:gap-6">
            <LanguageSwitcher className="hidden min-[360px]:inline-flex" />
            <Button asChild variant="ink" size="sm">
              <Link href={localizedHref(locale, "/signup")}>
                {dict.nav.getEarlyAccess}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="sample-brief-article mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16 md:py-20 print:gap-5 print:px-0 print:py-0">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-accent)]">
              {sample.dateLine}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-foreground">
              {dict.sampleBrief.title}
            </h1>
            <p className="text-muted-foreground">
              {t(dict.sampleBrief.hotelLine, sampleHotelVars(locale))}
            </p>
            <p className="mt-1 text-[12px] text-[var(--fonda-text-3)]">
              {dict.sampleBrief.disclaimer}
            </p>
          </div>

          <BriefingArticle content={sample.content} dict={dict} />

          {/* "What Fondas did overnight" — same section style as the article */}
          <section className="border-t border-border pt-6">
            <h2 className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
              {dict.sampleBrief.overnightTitle}
            </h2>
            {/* Same 60ch measure as the article above it. */}
            <p className="max-w-[60ch] text-lg leading-relaxed text-foreground/90 print:max-w-none">
              {sample.overnight}
            </p>
          </section>
        </div>

        {/* The ask, AFTER the proof and hidden in print.
        
            This replaced an ink band whose only action was a mailto. The brief
            above is deliberately not gated — it is the artefact that does the
            convincing, and a form in front of it would trade that away — so
            this sits underneath and asks for the one thing a mailto could not
            reliably capture: which hotel is asking. */}
        <section className="px-6 pb-24 print:hidden">
          <div className="mx-auto max-w-3xl">
            <SampleBriefRequestForm />
          </div>
        </section>
      </main>

      {/* Footer (hidden in print) */}
      <footer className="border-t border-border print:hidden">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:px-8">
          <span>{t(dict.footer.rights, { year: new Date().getFullYear() })}</span>
          <nav className="flex gap-4">
            <Link
              href={localizedHref(locale, "/privacy")}
              className="transition-colors duration-[180ms] hover:text-foreground"
            >
              {dict.footer.privacy}
            </Link>
            <Link
              href={localizedHref(locale, "/terms")}
              className="transition-colors duration-[180ms] hover:text-foreground"
            >
              {dict.footer.terms}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
