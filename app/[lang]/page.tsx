import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { BriefingPreviewWindow } from "@/components/marketing/briefing-preview-window";
import { EmailDraftPreviewWindow } from "@/components/marketing/email-draft-preview-window";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/features";
import { localizedHref } from "@/lib/i18n/navigation";
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

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  // Sana-style ROI stats: a context line on top, a big accent number, a label.
  // Reframed around the inbox + the morning (ROADMAP v2 §0.2) — no invented precision.
  const STATS = [
    { top: dict.stats.inboxTop, value: dict.stats.inboxValue, label: dict.stats.inboxLabel },
    { top: dict.stats.briefTop, value: dict.stats.briefValue, label: dict.stats.briefLabel },
    { top: dict.stats.priceTop, value: dict.stats.priceValue, label: dict.stats.priceLabel },
    { top: dict.stats.setupTop, value: dict.stats.setupValue, label: dict.stats.setupLabel },
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
          <Wordmark href={localizedHref(locale, "/")} />
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground sm:inline"
            >
              {dict.nav.features}
            </Link>
            <Link
              href={localizedHref(locale, "/login")}
              className="hidden text-sm text-muted-foreground transition-colors duration-[180ms] hover:text-foreground sm:inline"
            >
              {dict.nav.signIn}
            </Link>
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
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-20 md:px-8 md:py-40">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>
              <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
                <circle cx="3" cy="3" r="3" fill="var(--fonda-accent)" />
              </svg>
              {dict.hero.badge}
            </Eyebrow>
            <h1 className="mt-6 text-[clamp(3.25rem,7vw,5.75rem)] font-semibold leading-none tracking-[-0.035em] text-foreground">
              {dict.hero.headlineLine1}
              <br />
              {dict.hero.headlineLine2}
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
                <Link href="#features">{dict.hero.ctaSecondary}</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal
            index={1}
            className="mx-auto mt-16 max-w-[960px] sm:mt-20 lg:mt-24"
          >
            {/* The first product visual is the inbox: a guest email with its
                draft ready (MARKET_STRATEGY §2.1). The briefing preview
                follows in the features section below. */}
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
        </section>

        {/* Trust bar */}
        <section className="border-y border-border px-6 py-5">
          <Reveal className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-2.5">
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
          </Reveal>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-6 py-24 md:px-8"
        >
          <Reveal>
            <Eyebrow>{dict.featuresSection.eyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
              {dict.featuresSection.headline}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-start">
            {/* Feature list */}
            <div className="flex flex-col gap-2">
              {FEATURES.map((feature, i) => {
                const copy =
                  dict.features[feature.key as keyof typeof dict.features];
                return (
                  <Reveal
                    key={feature.key}
                    index={i}
                    className="rounded-[14px] border border-transparent px-5 py-4 transition-colors duration-[180ms] ease-out hover:border-border hover:bg-card"
                  >
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                      {copy.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-[1.55] text-muted-foreground">
                      {copy.description}
                    </p>
                  </Reveal>
                );
              })}
            </div>

            {/* Briefing preview (app window) */}
            <Reveal>
              <BriefingPreviewWindow
                windowTitle={dict.briefingPreview.windowTitle}
                dateLine={dict.briefingPreview.dateLine}
                greeting={dict.briefingPreview.greeting}
                rows={BRIEFING}
              />
            </Reveal>
          </div>

          {/* ROI stats — Sana style */}
          <div className="mt-16">
            <Reveal className="grid gap-8 border-t border-[var(--fonda-border-2)] pb-10 pt-12 md:grid-cols-2 md:items-end">
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
                  <span
                    className="block size-[7px] rounded-[2px] bg-[var(--fonda-accent)]"
                    aria-hidden
                  />
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

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:px-8">
          <span>{t(dict.footer.rights, { year: new Date().getFullYear() })}</span>
          <nav className="flex gap-4">
            <Link
              href={localizedHref(locale, "/sample-brief")}
              className="transition-colors duration-[180ms] hover:text-foreground"
            >
              {dict.footer.sampleBrief}
            </Link>
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
