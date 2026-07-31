import type { Metadata } from "next";
import Link from "next/link";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { getDictionary, loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { BriefingPreviewWindow } from "@/components/marketing/briefing-preview-window";
import { EmailDraftPreviewWindow } from "@/components/marketing/email-draft-preview-window";
import { HeroParallax } from "@/components/marketing/hero-parallax";
import { JsonLd } from "@/components/marketing/json-ld";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { Reveal } from "@/components/marketing/reveal";
import {
  Vignette,
  type VignetteName,
} from "@/components/marketing/vignettes";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/features";
import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import {
  absoluteUrl,
  languageAlternates,
  openGraphFor,
  SITE_URL,
} from "@/lib/seo";
import { t } from "@/lib/i18n/format";

// Only list integrations that are actually built. Add Outlook / Booking.com /
// SiteMinder here (or a "coming soon" variant) once they ship — don't advertise
// what we can't connect yet.
const INTEGRATIONS = ["MEWS", "Apaleo", "Gmail"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

// A small navy square — the Signal system's marker in place of bullets/emoji.
function SquareMarker() {
  return (
    <span
      className="block size-[7px] rounded-[2px] bg-[var(--fonda-accent)]"
      aria-hidden
    />
  );
}

// Which spot-vignette fronts each feature tile. The art is decorative — the
// tile's heading carries the meaning (components/marketing/vignettes.tsx).
const FEATURE_VIGNETTES: Record<string, VignetteName> = {
  "email-assistant": "lantern",
  briefing: "coffee",
  "checkin-chasing": "key",
  "hotel-chat": "arch",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    alternates: {
      canonical: absoluteUrl(lang, "/"),
      languages: languageAlternates("/"),
    },
    // Must be the FULL openGraph object, not just `url` — see openGraphFor().
    openGraph: openGraphFor(lang, {
      title: dict.meta.title,
      description: dict.meta.description,
      path: "/",
    }),
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  // Sana-style ROI stats: a context line on top, a big accent number, a label.
  const STATS = [
    { top: dict.stats.inboxTop, value: dict.stats.inboxValue, label: dict.stats.inboxLabel },
    { top: dict.stats.briefTop, value: dict.stats.briefValue, label: dict.stats.briefLabel },
    {
      top: dict.stats.priceTop,
      // Figure comes from COMPANY.priceMonthly; the locale template places the
      // currency symbol. Same source as the pricing band below.
      value: t(dict.stats.priceValue, { price: COMPANY.priceMonthly }),
      label: dict.stats.priceLabel,
    },
    { top: dict.stats.setupTop, value: dict.stats.setupValue, label: dict.stats.setupLabel },
  ];

  // "How it works" — three numbered steps, mono numerals (Mobbin: Clay pattern).
  const STEPS = [
    { num: "01", title: dict.howItWorks.step1Title, desc: dict.howItWorks.step1Desc },
    { num: "02", title: dict.howItWorks.step2Title, desc: dict.howItWorks.step2Desc },
    { num: "03", title: dict.howItWorks.step3Title, desc: dict.howItWorks.step3Desc },
  ];

  // The jobs Fondas bundles — the "one layer, not six subscriptions" story.
  const BUNDLE_JOBS = [
    { title: dict.bundle.guestRepliesTitle, desc: dict.bundle.guestRepliesDesc },
    { title: dict.bundle.morningBriefTitle, desc: dict.bundle.morningBriefDesc },
    { title: dict.bundle.etaChasingTitle, desc: dict.bundle.etaChasingDesc },
    { title: dict.bundle.askAnythingTitle, desc: dict.bundle.askAnythingDesc },
    { title: dict.bundle.preArrivalTitle, desc: dict.bundle.preArrivalDesc },
    { title: dict.bundle.dailySignalTitle, desc: dict.bundle.dailySignalDesc },
  ];

  // Morning-briefing preview rows (no emoji — a small accent square marks each).
  const BRIEFING: [string, string][] = [
    [dict.briefingPreview.row1strong, dict.briefingPreview.row1rest],
    [dict.briefingPreview.row2strong, dict.briefingPreview.row2rest],
    [dict.briefingPreview.row3strong, dict.briefingPreview.row3rest],
  ];

  // NOTE: there is deliberately no social-proof section here. It existed as
  // placeholder logos, quotes, names and metrics — none of it real — and was
  // removed rather than shipped, because a fabricated metric is the fastest
  // way to lose a GM's trust. Reinstate it only from quotes a named hotel has
  // agreed in writing to have published, with metrics that hotel can back.

  // Footer navigation. `href: null` marks a PLACEHOLDER destination: it renders
  // as href="#" with a ° marker and the footnote in the bottom bar. Only the
  // on-page anchors and /sample-brief, /privacy, /terms exist today — give a
  // link a real href here the moment its page ships.
  const FOOTER_COLUMNS: {
    title: string;
    links: { label: string; href: string | null }[];
  }[] = [
    {
      title: dict.footer.productTitle,
      links: [
        { label: dict.nav.features, href: "#features" },
        { label: dict.nav.howItWorks, href: "#how" },
        { label: dict.footer.pricing, href: "#pricing" },
        { label: dict.footer.integrations, href: null },
      ],
    },
    {
      title: dict.footer.companyTitle,
      links: [
        { label: dict.footer.about, href: null },
        { label: dict.footer.careers, href: null },
        { label: dict.footer.contact, href: null },
        { label: dict.footer.press, href: null },
      ],
    },
    {
      title: dict.footer.resourcesTitle,
      links: [
        {
          label: dict.footer.sampleBrief,
          href: localizedHref(locale, "/sample-brief"),
        },
        { label: dict.nav.faq, href: "#faq" },
        { label: dict.footer.helpCentre, href: null },
        { label: dict.footer.changelog, href: null },
      ],
    },
    {
      title: dict.footer.legalTitle,
      links: [
        { label: dict.footer.privacy, href: localizedHref(locale, "/privacy") },
        { label: dict.footer.terms, href: localizedHref(locale, "/terms") },
        { label: dict.footer.cookies, href: null },
        { label: dict.footer.security, href: null },
      ],
    },
  ];

  // Comparison — the same five jobs, by hand and with Fondas. Row i of each
  // column is the counterpart of row i, but they're rendered as two
  // independent lists rather than a shared table grid: es/ca run longer than
  // en, and a shared grid would leave the hairlines misaligned wherever one
  // side wraps to a second line.
  const COMPARISON = [
    {
      title: dict.comparison.manualTitle,
      isFondas: false,
      rows: [
        dict.comparison.manual1,
        dict.comparison.manual2,
        dict.comparison.manual3,
        dict.comparison.manual4,
        dict.comparison.manual5,
      ],
    },
    {
      title: dict.comparison.fondasTitle,
      isFondas: true,
      rows: [
        dict.comparison.fondas1,
        dict.comparison.fondas2,
        dict.comparison.fondas3,
        dict.comparison.fondas4,
        dict.comparison.fondas5,
      ],
    },
  ];

  // FAQ grouped by theme (Mobbin: MasterClass/HubSpot). Security & data is its
  // own group — the guest-PII objection a hotel buyer will always raise.
  const FAQ_GROUPS = [
    {
      label: dict.faq.setupGroup,
      items: [
        [dict.faq.q1, dict.faq.a1],
        [dict.faq.q2, dict.faq.a2],
        [dict.faq.q3, dict.faq.a3],
      ] as [string, string][],
    },
    {
      label: dict.faq.securityGroup,
      items: [
        [dict.faq.q4, dict.faq.a4],
        [dict.faq.q5, dict.faq.a5],
      ] as [string, string][],
    },
    {
      label: dict.faq.billingGroup,
      items: [[dict.faq.q6, dict.faq.a6], [dict.faq.q7, dict.faq.a7]] as [
        string,
        string,
      ][],
    },
  ];

  let faqIndex = 0;

  // Structured data. Everything below is asserted to search engines as fact,
  // so it is built only from copy we stand behind.
  //
  // ⚠️ Deliberately NO Review / AggregateRating markup. There are no customer
  // reviews on this site yet — the placeholder ones were removed rather than
  // shipped — and emitting invented ratings as structured data is both a Google
  // spam-policy violation and a lie told at machine scale. Add review markup
  // only once the quotes are real and attributable.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: COMPANY.brand,
        url: SITE_URL,
        email: COMPANY.contactEmail,
        description: dict.meta.description,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: COMPANY.brand,
        url: absoluteUrl(locale, "/"),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: dict.meta.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: COMPANY.priceMonthly,
          priceCurrency: "EUR",
          description: dict.pricing.priceUnit,
          url: absoluteUrl(locale, "/#pricing"),
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${absoluteUrl(locale, "/")}#faq`,
        inLanguage: locale,
        mainEntity: FAQ_GROUPS.flatMap((group) =>
          group.items.map(([question, answer]) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          }))
        ),
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={jsonLd} />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
          <Wordmark href={localizedHref(locale, "/")} />
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="#how"
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground md:inline"
            >
              {dict.nav.howItWorks}
            </Link>
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground md:inline"
            >
              {dict.nav.features}
            </Link>
            <Link
              href="#faq"
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground md:inline"
            >
              {dict.nav.faq}
            </Link>
            <Link
              href={localizedHref(locale, "/login")}
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground md:inline"
            >
              {dict.nav.signIn}
            </Link>
            <LanguageSwitcher className="hidden md:inline-flex" />
            {/* Visible at every breakpoint. Below sm the bar is wordmark +
                CTA + hamburger in ~312px, which the full label overflows in
                es (and leaves ~6px in ca), so the short label runs there. */}
            <Button asChild variant="ink" size="sm">
              <Link href={localizedHref(locale, "/signup")}>
                <span className="sm:hidden">
                  {dict.nav.getEarlyAccessShort}
                </span>
                <span className="hidden sm:inline">
                  {dict.nav.getEarlyAccess}
                </span>
              </Link>
            </Button>

            {/* Below md the links above have nowhere to go — they live here. */}
            <MobileNav
              links={[
                { href: "#how", label: dict.nav.howItWorks },
                { href: "#features", label: dict.nav.features },
                { href: "#faq", label: dict.nav.faq },
                {
                  href: localizedHref(locale, "/login"),
                  label: dict.nav.signIn,
                },
              ]}
              ctaHref={localizedHref(locale, "/signup")}
              ctaLabel={dict.nav.getEarlyAccess}
              openLabel={dict.nav.openMenu}
              closeLabel={dict.nav.closeMenu}
            />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — La Casa sits behind the type and drifts on scroll.
            HeroParallax is the only client component here; the copy below is
            still server-rendered and passed in as children. All motion is
            gated on prefers-reduced-motion inside it. */}
        <section className="relative">
          <HeroParallax>
            <Reveal className="mx-auto max-w-[1120px] text-center">
              <Eyebrow>
                <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
                  <circle cx="3" cy="3" r="3" fill="var(--fonda-accent)" />
                </svg>
                {dict.hero.badge}
              </Eyebrow>
              {/* Two-tone: the turn from problem to promise happens on the
                  line break, so line 2 carries the accent.

                  Each line is its own block so it can be held on one line from
                  md up — the break is the headline's rhythm (§3), and a line
                  that wraps of its own accord destroys it. Below md the lines
                  wrap normally and step down in size, so nothing overflows on
                  a phone. Sizes are the prototype's. */}
              <h1 className="mt-6 text-[clamp(2.2rem,8vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[clamp(2.4rem,6vw,5rem)]">
                <span className="block text-foreground md:whitespace-nowrap">
                  {dict.hero.headlineLine1}
                </span>
                <span className="block text-[var(--fonda-accent)] md:whitespace-nowrap">
                  {dict.hero.headlineLine2}
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-xl text-[20px] leading-[1.6] text-muted-foreground">
                {dict.hero.subhead}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="ink" size="lg">
                  <Link href={localizedHref(locale, "/signup")}>
                    {dict.hero.ctaPrimary}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#how">{dict.hero.ctaSecondary}</Link>
                </Button>
              </div>
            </Reveal>
          </HeroParallax>
        </section>

        {/* Trust bar. The only claim about traction on the page, and it is
            deliberately unnumbered — we are pre-pilot, so it says we are
            onboarding our first hotels and stops there. Do not put a count
            here until it is one a hotel could verify. */}
        <section className="border-y border-border px-6 py-5">
          <Reveal className="mx-auto flex max-w-[1120px] flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                {dict.trust.worksWith}
              </span>
              {INTEGRATIONS.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-border px-3.5 py-1 text-[13px] font-medium text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {dict.trust.onboardingNote}
            </p>
          </Reveal>
        </section>

        {/* How it works — three numbered steps (Mobbin: Clay) */}
        <section
          id="how"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-6 py-24 md:px-8"
        >
          <Reveal>
            <Eyebrow>{dict.howItWorks.eyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
              {dict.howItWorks.headline}
            </h2>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
              {dict.howItWorks.lead}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.num}
                index={i}
                className="flex flex-col rounded-[16px] border border-border bg-card p-7"
              >
                <span className="font-mono text-[13px] font-medium tracking-[0.1em] text-[var(--fonda-accent)]">
                  {step.num}
                </span>
                <h3 className="mt-8 text-[19px] font-semibold tracking-[-0.015em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">
                  {step.desc}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features — 2×2 surface bento of the four core products */}
        <section
          id="features"
          className="border-t border-border px-6 py-24 md:px-8"
        >
          <div className="mx-auto max-w-[1120px] scroll-mt-20">
            <Reveal>
              <Eyebrow>{dict.featuresSection.eyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                {dict.featuresSection.headline}
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature, i) => {
                const copy =
                  dict.features[feature.key as keyof typeof dict.features];
                return (
                  <Reveal
                    key={feature.key}
                    index={i}
                    className="flex flex-col rounded-[16px] border border-border bg-card p-6"
                  >
                    <Vignette
                      name={FEATURE_VIGNETTES[feature.key] ?? "olive"}
                      size={88}
                    />
                    <div className="mt-5 flex items-start gap-3">
                      <span className="mt-[7px]">
                        <SquareMarker />
                      </span>
                      <div>
                        <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                          {copy.name}
                        </h3>
                        <p className="mt-1.5 text-[15px] leading-[1.55] text-muted-foreground">
                          {copy.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Email showcase — the inbox, Fondas' sharpest wedge (MARKET_STRATEGY
            §2.1). Same band shape as the morning-brief showcase below it. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[5fr_7fr] lg:items-center">
            <Reveal>
              <Eyebrow>{dict.emailShowcase.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.emailShowcase.headline}
              </h2>
              <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.emailShowcase.lead}
              </p>
            </Reveal>
            <Reveal index={1}>
              <EmailDraftPreviewWindow
                size="lg"
                windowTitle={dict.emailPreview.windowTitle}
                receivedLabel={dict.emailPreview.receivedLabel}
                fromName={dict.emailPreview.fromName}
                subject={dict.emailPreview.subject}
                message={dict.emailPreview.message}
                contextLine={dict.emailPreview.contextLine}
                draftLabel={dict.emailPreview.draftLabel}
                draftBody={dict.emailPreview.draftBody}
              />
            </Reveal>
          </div>
        </section>

        {/* Product showcase — the morning brief, full width (Mobbin: Retool/ClickUp) */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[5fr_7fr] lg:items-center">
            <Reveal>
              <Eyebrow>{dict.showcase.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.showcase.headline}
              </h2>
              <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.showcase.lead}
              </p>
            </Reveal>
            <Reveal index={1}>
              <BriefingPreviewWindow
                size="lg"
                windowTitle={dict.briefingPreview.windowTitle}
                dateLine={dict.briefingPreview.dateLine}
                greeting={dict.briefingPreview.greeting}
                rows={BRIEFING}
              />
            </Reveal>
          </div>
        </section>

        {/* ROI stats — Sana style */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-8 pb-10 md:grid-cols-2 md:items-end">
              <h2 className="max-w-[13ch] text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.stats.headline}
              </h2>
              <p className="max-w-[42ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.stats.lead}
              </p>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, i) => (
                <Reveal
                  key={stat.value}
                  index={i}
                  className={`flex min-h-[200px] flex-col justify-between px-6 py-8 ${
                    i % 2 === 0 ? "border-r border-border" : ""
                  } ${i < STATS.length - 1 ? "md:border-r md:border-border" : "md:border-r-0"} ${
                    i < 2 ? "border-b border-border md:border-b-0" : ""
                  }`}
                >
                  <p className="text-sm leading-snug text-muted-foreground">
                    {stat.top}
                  </p>
                  <div>
                    <p className="text-[clamp(2.25rem,3.6vw,3.5rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--fonda-accent)]">
                      {stat.value}
                    </p>
                    <p className="mt-3 text-sm leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Bundle — one layer, not six subscriptions (ROADMAP v2 §0.2) */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal>
              <Eyebrow>{dict.bundle.eyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                {dict.bundle.headline}
              </h2>
              <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.bundle.lead}
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUNDLE_JOBS.map((job, i) => (
                <Reveal
                  key={job.title}
                  index={i}
                  className="rounded-[16px] border border-border bg-card p-6"
                >
                  <SquareMarker />
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                    {job.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-[1.55] text-muted-foreground">
                    {job.desc}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison — the same morning, by hand vs with Fondas (Sana model).
            Navy appears only as the check on the Fondas column; the manual
            column uses a muted dash and secondary text, so the emphasis costs
            no second accent. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal>
              <Eyebrow>{dict.comparison.eyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                {dict.comparison.headline}
              </h2>
              <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.comparison.lead}
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {COMPARISON.map((column, i) => (
                <Reveal
                  key={column.title}
                  index={i}
                  className={`rounded-[16px] border border-border p-7 ${
                    column.isFondas ? "bg-card" : "bg-[var(--fonda-surface)]"
                  }`}
                >
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                    {column.title}
                  </h3>
                  <ul className="mt-5">
                    {column.rows.map((row) => (
                      <li
                        key={row}
                        className="flex items-start gap-3 border-t border-border py-3.5"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                          className="mt-[4px] shrink-0"
                        >
                          {column.isFondas ? (
                            <path
                              d="M3 8.4 L6.3 11.7 L13 5"
                              stroke="var(--fonda-accent)"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <path
                              d="M4 8 h8"
                              stroke="var(--fonda-text-3)"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                        <span
                          className={`text-[15px] leading-[1.5] ${
                            column.isFondas
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — grouped accordion (Mobbin: HubSpot/MasterClass) */}
        <section
          id="faq"
          className="border-t border-border px-6 py-24 md:px-8"
        >
          <div className="mx-auto grid max-w-[1120px] scroll-mt-20 gap-12 lg:grid-cols-[5fr_7fr] lg:items-start">
            <Reveal>
              <Eyebrow>{dict.faq.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.faq.headline}
              </h2>
            </Reveal>

            <div className="flex flex-col gap-10">
              {FAQ_GROUPS.map((group) => (
                <Reveal key={group.label}>
                  <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                    {group.label}
                  </p>
                  <div className="mt-3 border-t border-border">
                    {group.items.map(([q, a]) => {
                      const open = faqIndex === 0;
                      faqIndex += 1;
                      return (
                        <details
                          key={q}
                          open={open}
                          className="group border-b border-border"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-medium tracking-[-0.01em] text-foreground [&::-webkit-details-marker]:hidden">
                            {q}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              aria-hidden
                              className="shrink-0 text-[var(--fonda-accent)] transition-transform duration-200 group-open:rotate-45"
                            >
                              <path
                                d="M8 3v10M3 8h10"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </summary>
                          <p className="max-w-[62ch] pb-5 text-[15px] leading-[1.65] text-muted-foreground">
                            {a}
                          </p>
                        </details>
                      );
                    })}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing — the flat per-property price, stated. The figure is navy
            to match the same number in the ROI stat row above; keep the two in
            sync with COMPANY.price and Stripe. The button is a real contact
            (mailto), not /signup — this band sells the price, it isn't the
            sign-up path. */}
        <section
          id="pricing"
          className="scroll-mt-20 border-t border-border px-6 py-24 md:px-8"
        >
          <Reveal className="mx-auto max-w-[1120px]">
            <div className="rounded-[28px] border border-border bg-[var(--fonda-surface)] px-6 py-16 text-center md:px-16">
              <Eyebrow>{dict.pricing.eyebrow}</Eyebrow>
              <h2 className="mx-auto mt-5 max-w-[16ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground">
                {dict.pricing.headline}
              </h2>
              <p className="mt-7 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                <span className="text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--fonda-accent)]">
                  {t(dict.pricing.price, { price: COMPANY.priceMonthly })}
                </span>
                <span className="text-[16px] leading-[1.5] text-muted-foreground">
                  {dict.pricing.priceUnit}
                </span>
              </p>
              <p className="mx-auto mt-6 max-w-[54ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.pricing.lead}
              </p>
              <div className="mt-9 flex justify-center">
                <Button asChild variant="ink" size="lg">
                  <a href={`mailto:${COMPANY.contactEmail}`}>
                    {dict.pricing.button}
                  </a>
                </Button>
              </div>
              {/* Show the address: a mailto that opens a mail client unannounced
                  is a small hostile surprise. */}
              <p className="mt-4 text-[14px] text-muted-foreground">
                {COMPANY.contactEmail}
              </p>
              <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                {dict.pricing.note}
              </p>
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24 md:px-8">
          <Reveal className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[28px] bg-ink px-6 py-24 text-center md:px-24">
            <Eyebrow>
              <span className="text-[color-mix(in_srgb,white_55%,transparent)]">
                {dict.cta.eyebrow}
              </span>
            </Eyebrow>
            <h2 className="mx-auto mt-5 max-w-xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--fonda-text-inv)]">
              {dict.cta.headline}
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-[17px] leading-[1.6] text-[color-mix(in_srgb,white_65%,transparent)]">
              {dict.cta.subhead}
            </p>
            <div className="mt-9 flex justify-center">
              <Button asChild size="lg" className="bg-white text-ink hover:bg-white/90">
                <Link href={localizedHref(locale, "/signup")}>{dict.cta.button}</Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer — flat and light per Signal: white ground, hairline rules
          between bands, no dark mega-footer and no second accent. */}
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-[1120px] px-6 md:px-8">
          {/* Brand + newsletter */}
          <div className="grid gap-12 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <div>
              {/* A quiet sign-off in the hero's hand — decorative, one per page. */}
              <Vignette name="olive" size={84} />
              <Wordmark
                href={localizedHref(locale, "/")}
                className="mt-3 block text-[clamp(2.75rem,7vw,4.5rem)] leading-none tracking-[-0.04em]"
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
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                  {column.title}
                </h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <Link
                          href={link.href}
                          className="text-[15px] text-muted-foreground transition-colors duration-[180ms] hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href="#"
                          className="text-[15px] text-[var(--fonda-text-3)] transition-colors duration-[180ms] hover:text-foreground"
                        >
                          {link.label}
                          <span
                            aria-hidden="true"
                            className="ml-0.5 align-super text-[10px]"
                          >
                            °
                          </span>
                        </a>
                      )}
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
              <span className="text-[13px] text-[var(--fonda-text-3)]">
                {dict.footer.placeholderNote}
              </span>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
