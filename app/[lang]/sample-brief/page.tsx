import Link from "next/link";

import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { getSampleBrief } from "@/app/[lang]/sample-brief/content";
import { Wordmark } from "@/components/brand/wordmark";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { EmailDraftPreviewWindow } from "@/components/marketing/email-draft-preview-window";
import {
  ArrivalCards,
  BriefHeroCard,
  NameChips,
  OccupancyChart,
  OvernightTimeline,
  SectionTitle,
  Well,
  justified,
} from "@/components/marketing/sample-brief-sections";
import { SampleBriefRequestForm } from "@/components/marketing/sample-brief-request-form";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/lib/i18n/navigation";
import { t } from "@/lib/i18n/format";
import { SAMPLE_HOTEL, sampleHotelVars } from "@/lib/sample-hotel";
import { cn } from "@/lib/utils";

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

/**
 * The sample brief, phone first.
 *
 * Most people land here from the QR code on the printed one-pager, on a phone,
 * standing at a desk. So the page leads with the morning as the product shows
 * it — four numbers, the drafted email, the guests, the chart, the overnight
 * timeline — and keeps the full prose brief one tap away (and as the only
 * thing that prints). Every fact in the cards is also in the prose
 * (`content.ts`); the cards add no new ones.
 *
 * Two ways out, always visible on a phone: the homepage ("Discover Fondas")
 * and the request form. Desktop gets the same pair at the end.
 */
export default async function SampleBriefPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const sample = getSampleBrief(locale);
  const vars = sampleHotelVars(locale);
  const ts = (s: string) => t(s, vars);
  const sb = dict.sampleBrief;
  const h = SAMPLE_HOTEL;
  const home = localizedHref(locale, "/");

  const reservation = [
    { label: dict.emailPreview.guestLabel, value: ts(dict.emailPreview.guestValue) },
    { label: dict.emailPreview.roomLabel, value: dict.emailPreview.roomValue },
    { label: dict.emailPreview.datesLabel, value: dict.emailPreview.datesValue },
    { label: dict.emailPreview.statusLabel, value: dict.emailPreview.statusValue },
  ];

  return (
    <div className="marketing-surface flex min-h-screen flex-col">
      {/* Marketing nav (hidden in print — the PDF is the brief alone) */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
          <Wordmark withMark href={home} />
          <nav className="flex items-center gap-3 sm:gap-6">
            <LanguageSwitcher className="hidden min-[360px]:inline-flex" />
            {/* Short label below sm, exactly as SiteHeader does it. This bar
                has no hamburger to fall back on, so the switcher stays at
                360px — wordmark + switcher + the full es label ("Solicitar
                acceso anticipado", 193px) needs 445px and overflowed the
                viewport by 51px. The short label brings it to 328px. */}
            <Button
              asChild
              variant="ink"
              size="sm"
              className="relative after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <Link href={localizedHref(locale, "/contact")}>
                <span className="sm:hidden">{dict.nav.getEarlyAccessShort}</span>
                <span className="hidden sm:inline">
                  {dict.nav.getEarlyAccess}
                </span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Bottom padding on phones leaves room for the fixed action bar. */}
      <main className="flex-1 pb-28 sm:pb-0 print:pb-0">
        {/* ── The cards (screen only) ───────────────────────────────────── */}
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-6 pb-10 sm:px-6 md:pt-12 print:hidden">
          <BriefHeroCard
            dateLine={sample.dateLine}
            title={sb.title}
            hotelLine={ts(sb.hotelLine)}
            badge={sb.sampleBadge}
            stats={[
              { value: String(h.arrivals), label: sb.statArrivals },
              { value: String(h.departures), label: sb.statDepartures },
              { value: `${h.occupancyPct}%`, label: sb.statOccupancy },
              { value: "4", label: sb.statDrafts },
            ]}
          />

          <section>
            <SectionTitle>{sb.tldrTitle}</SectionTitle>
            <p
              className={cn(
                "text-[17px] leading-[1.55] font-medium tracking-[-0.01em] text-foreground md:text-[19px]",
                justified
              )}
            >
              {sample.cards.tldr}
            </p>
          </section>

          <section>
            <SectionTitle>{sb.emailTitle}</SectionTitle>
            <EmailDraftPreviewWindow
              windowTitle={dict.emailPreview.windowTitle}
              receivedLabel={dict.emailPreview.receivedLabel}
              fromName={ts(dict.emailPreview.fromName)}
              subject={dict.emailPreview.subject}
              message={dict.emailPreview.message}
              contextLine={dict.emailPreview.contextLine}
              pmsSource={dict.emailPreview.pmsSource}
              reservation={reservation}
              draftLabel={dict.emailPreview.draftLabel}
              draftBody={ts(dict.emailPreview.draftBody)}
              className="lg:static"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted-foreground">
                {sb.moreDrafts}
              </span>
              {sample.cards.otherDrafts.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-border px-3 py-1 text-[12px] font-medium text-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>{sb.arrivalsTitle}</SectionTitle>
            <ArrivalCards arrivals={sample.cards.arrivals} />
          </section>

          <section>
            <SectionTitle>{sb.unconfirmedTitle}</SectionTitle>
            <Well className="p-4 md:p-4">
              <NameChips
                names={sample.cards.unconfirmed}
                tag={sb.unconfirmedChased}
              />
            </Well>
          </section>

          <section>
            <SectionTitle>{sb.occupancyTitle}</SectionTitle>
            <Well>
              <OccupancyChart
                nights={h.occupancyNext14}
                rooms={h.rooms}
                startISO={h.nightISO}
                softIndex={7}
                locale={locale}
                todayLabel={sb.occupancyToday}
                softLabel={sb.occupancySoft}
              />
              <p
                className={cn(
                  "mt-4 text-[14px] leading-[1.5] text-foreground/85",
                  justified
                )}
              >
                {sample.cards.occupancyNote}
              </p>
            </Well>
          </section>

          <section>
            <SectionTitle>{sb.overnightTitle}</SectionTitle>
            <Well>
              <OvernightTimeline steps={sample.cards.overnightSteps} />
            </Well>
          </section>

          {/* The full prose brief, one tap away. */}
          <details className="group rounded-[16px] border border-border">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-[15px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
              {sb.readFull}
              <span
                aria-hidden="true"
                className="text-[var(--fonda-text-3)] transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="border-t border-border px-5 pt-2 pb-6 [&_p]:text-justify [&_p]:hyphens-auto [&_p]:text-[16px]">
              <BriefingArticle
                content={sample.content}
                dict={dict}
                locale={locale}
              />
            </div>
          </details>

          <p className="text-center text-[12px] text-[var(--fonda-text-3)]">
            {sb.disclaimer}
          </p>
        </div>

        {/* ── Print: the brief alone, on one A4 sheet ──────────────────── */}
        <div className="sample-brief-article hidden print:flex print:flex-col print:gap-5">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-accent)]">
              {sample.dateLine}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-foreground">
              {sb.title}
            </h1>
            <p className="text-muted-foreground">{ts(sb.hotelLine)}</p>
            <p className="mt-1 text-[12px] text-[var(--fonda-text-3)]">
              {sb.disclaimer}
            </p>
          </div>
          <BriefingArticle content={sample.content} dict={dict} locale={locale} />
          <section className="border-t border-border pt-6">
            <h2 className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
              {sb.overnightTitle}
            </h2>
            <p className="text-lg leading-relaxed text-foreground/90">
              {sample.overnight}
            </p>
          </section>
        </div>

        {/* ── The ask ─────────────────────────────────────────────────── */}
        <section id="request" className="scroll-mt-20 px-4 pb-10 sm:px-6 sm:pb-24 print:hidden">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <div className="hidden gap-3 sm:flex">
              <Button asChild variant="outline" size="lg">
                <Link href={home}>{sb.ctaHome}</Link>
              </Button>
            </div>
            <SampleBriefRequestForm />
          </div>
        </section>
      </main>

      {/* Phone action bar: the homepage and the form, always one tap away. */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/92 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:hidden print:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href={home}>{sb.ctaHome}</Link>
          </Button>
          <Button asChild variant="ink" className="h-11">
            <a href="#request">{sb.ctaRequest}</a>
          </Button>
        </div>
      </div>

      {/* Footer (hidden in print) */}
      <footer className="border-t border-border pb-20 sm:pb-0 print:hidden">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:px-8">
          <span>{t(dict.footer.rights, { year: new Date().getFullYear() })}</span>
          {/* -my-3 on the row gives back the height the links' padding adds,
              so the bar keeps its py-8 and the two links get 45px targets. */}
          <nav className="-my-3 flex gap-4">
            <Link
              href={localizedHref(locale, "/privacy")}
              className="inline-flex min-h-11 items-center transition-colors duration-[180ms] hover:text-foreground"
            >
              {dict.footer.privacy}
            </Link>
            <Link
              href={localizedHref(locale, "/terms")}
              className="inline-flex min-h-11 items-center transition-colors duration-[180ms] hover:text-foreground"
            >
              {dict.footer.terms}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
