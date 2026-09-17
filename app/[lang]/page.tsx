import type { Metadata } from "next";
import Link from "next/link";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { getDictionary, loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefingPreviewWindow } from "@/components/marketing/briefing-preview-window";
import { EmailDraftPreviewWindow } from "@/components/marketing/email-draft-preview-window";
import { HeroParallax } from "@/components/marketing/hero-parallax";
import { JsonLd } from "@/components/marketing/json-ld";
import { Reveal } from "@/components/marketing/reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { sampleHotelVars } from "@/lib/sample-hotel";
import {
  absoluteUrl,
  languageAlternates,
  openGraphFor,
  SITE_URL,
} from "@/lib/seo";
import { t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

// Two lists, and the difference between them is the honesty of the section.
//
// LIVE_INTEGRATIONS are built and connectable today — a hotel can sign up this
// afternoon and link one. Anything here must be true in the product.
//
// ON_REQUEST_INTEGRATIONS are ones we'd build for a specific hotel during
// onboarding. They're rendered in a lighter chip under their own "On request"
// label so they read as "we can", never as "already connected". Moving a name
// from the second list to the first is a claim — only do it once the
// connection actually works in the app.
const LIVE_INTEGRATIONS = ["MEWS", "Apaleo", "Gmail"];
const ON_REQUEST_INTEGRATIONS = ["Outlook"] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

// A small navy square — the Signal system's marker in place of bullets/emoji.
//
// `onGradient` flips it to white, for a marker sitting on a gradient surface
// where navy would be both illegible on amber and a second colour on a surface
// that already carries one. Nothing passes `true` today — the feature bento's
// gradient tile was retired — but the page is the one place §12 still allows a
// gradient, so the branch is kept for whatever claims that slot next.
function SquareMarker({ onGradient = false }: { onGradient?: boolean }) {
  return (
    <span
      className={cn(
        "block size-[7px] rounded-[2px]",
        onGradient ? "bg-[var(--fonda-text-inv)]" : "bg-[var(--fonda-accent)]"
      )}
      aria-hidden
    />
  );
}

// Renders a headline string that carries a `{brand}` placeholder, substituting
// a styled span for the token.
//
// Why a placeholder and not the literal word in the dictionary: the brand has
// to render as the WORDMARK — near-black caps against the accent-blue rest of
// the line — and t() can only substitute strings, not elements. Splitting on
// the token keeps the whole sentence, and the brand's position within it, in
// the dictionary where a translator can move it. There is no per-language
// branching here: it happens to lead line 2 in all three languages today, and
// this would still work if it didn't.
//
// The caps come from CSS `uppercase`, never from literal capitals in the
// dictionary, so the accessible name stays "Fondas" — some screen readers
// spell out all-caps text letter by letter. (components/brand/wordmark.tsx
// does hardcode "FONDAS"; this deliberately doesn't copy that part of it.)
// Everything else matches the wordmark exactly, minus its text-xl — the size
// has to come from the h1's clamp.
function HeadlineWithBrand({ template }: { template: string }) {
  const nodes: React.ReactNode[] = [];
  template.split("{brand}").forEach((part, i) => {
    if (i > 0) {
      nodes.push(
        <span
          key={i}
          className="font-sans font-semibold uppercase tracking-[-0.03em] text-foreground"
        >
          {COMPANY.brand}
        </span>
      );
    }
    if (part) nodes.push(part);
  });
  return <>{nodes}</>;
}


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
      // Was the monthly price interpolated from COMPANY.priceMonthly. The
      // figure came off the public page (§3.0b) — this cell now spends its
      // number on the migration fear instead, so it needs no interpolation.
      value: dict.stats.priceValue,
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

  // Every string about the sample hotel carries {tokens} — the hotel's name,
  // its room count, the date, the guest names — fed from lib/sample-hotel.ts.
  // Nothing about the invented hotel is written into the dictionaries, so it
  // cannot drift between the homepage, /sample-brief and the three locales.
  const hotelVars = sampleHotelVars(locale);
  const ts = (template: string) => t(template, hotelVars);

  // Morning-briefing rows (no emoji — a small accent square marks each).
  //
  // The hotel is INVENTED and so is every name and number in it: Hotel Pati
  // Blau, Barcelona, 45 rooms, the night of Thursday 18 June 2026, 89% full
  // (40 of 45). It is not anonymised real data and must never be described as
  // such — no real reservation, guest or hotel is behind any of it.
  //
  // Phase D's email window reuses this exact hotel on this exact night, down
  // to the guest names and room types, so a reader comparing the two windows
  // sees one hotel rather than two. If you change a name, a room number or the
  // date here, change it there too:
  //
  //   Núria Bofill          room 204, Junior Suite, third stay
  //   Aguirre-Miralles      Garden Suite / Suite Jardín / Suite Jardí
  //   Henrik Lund           lands 23:40 from Copenhagen, time unconfirmed
  //   Carmen Ortega         arrival time unconfirmed
  //   the Ashworth party    arrival time unconfirmed
  //   Elena Vidal           arrives Tuesday — hers is the mail awaiting a yes
  //
  // Six rows is the whole brief, not a teaser: band 3 shows it complete, with
  // nothing truncated, blurred or gated (§3.7). The hero shows the opening
  // rows of the same morning — see HERO_BRIEFING below.
  const BRIEFING: [string, string][] = [
    [ts(dict.briefingPreview.row1strong), ts(dict.briefingPreview.row1rest)],
    [ts(dict.briefingPreview.row2strong), ts(dict.briefingPreview.row2rest)],
    [ts(dict.briefingPreview.row3strong), ts(dict.briefingPreview.row3rest)],
    [ts(dict.briefingPreview.row4strong), ts(dict.briefingPreview.row4rest)],
    [ts(dict.briefingPreview.row5strong), ts(dict.briefingPreview.row5rest)],
    [ts(dict.briefingPreview.row6strong), ts(dict.briefingPreview.row6rest)],
  ];

  // The reservation band 4 shows the guest email matched against. Same hotel,
  // same night, same guest list as BRIEFING above: Elena Vidal is the one
  // email that brief says is "waiting for your yes", and the Garden Suite is
  // the room type the Aguirre-Miralles vacate that very morning. Order is
  // fixed — guest, room type, dates, status.
  const RESERVATION = [
    { label: dict.emailPreview.guestLabel, value: ts(dict.emailPreview.guestValue) },
    { label: dict.emailPreview.roomLabel, value: dict.emailPreview.roomValue },
    { label: dict.emailPreview.datesLabel, value: dict.emailPreview.datesValue },
    {
      label: dict.emailPreview.statusLabel,
      value: dict.emailPreview.statusValue,
    },
  ];

  // The hero shows the top of that same brief. It is a slice rather than a
  // separate list so the two windows can never drift into different mornings,
  // and it is capped at three rows because the hero's clip is measured against
  // that height — the full six would push the fold most of a screen further
  // down. Band 3 is where the brief is read; the hero only has to promise it.
  const HERO_BRIEFING = BRIEFING.slice(0, 3);

  // NOTE: there is deliberately no social-proof section here. It existed as
  // placeholder logos, quotes, names and metrics — none of it real — and was
  // removed rather than shipped, because a fabricated metric is the fastest
  // way to lose a GM's trust. Reinstate it only from quotes a named hotel has
  // agreed in writing to have published, with metrics that hotel can back.

  // Footer navigation. Every link points somewhere real today. `href: null`
  // still renders as a ° placeholder (kept for future use) — but nothing uses
  // it right now, so no dead links ship.

  // Comparison — the same three jobs, by hand and with Fondas. Row i of each
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
      ],
    },
    {
      title: dict.comparison.fondasTitle,
      isFondas: true,
      rows: [
        dict.comparison.fondas1,
        dict.comparison.fondas2,
        dict.comparison.fondas3,
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
        // No `price`/`priceCurrency`: the page stopped stating a figure
        // (§3.0b), and structured data must not claim one the page doesn't.
        // The offer itself stays so the Product markup is still complete.
        offers: {
          "@type": "Offer",
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

      <SiteHeader locale={locale} dict={dict} isHome />

      <main className="flex-1">
        {/* Hero — La Casa sits behind the type and drifts on scroll.
            HeroParallax is the only client component here; the copy below is
            still server-rendered and passed in as children. All motion is
            gated on prefers-reduced-motion inside it. */}
        <section className="relative overflow-hidden">
          <HeroParallax>
            {/* 1200px, not the page's 1120px grid: the headline is the only
                child that uses the full measure — the eyebrow and the CTA row
                are centred, and the subhead caps itself at max-w-xl — so
                widening this wrapper moves nothing but the h1. It has to be
                raised in lockstep with the h1's own max-w-[1200px] below,
                because a max-width on a child is inert once it exceeds the
                parent's width; capping the h1 alone would have done nothing.
                Every other section on the page keeps max-w-[1120px]. */}
            <Reveal className="mx-auto max-w-[1200px] text-center">
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
              <h1 className="mx-auto mt-6 max-w-[1200px] text-[clamp(2.2rem,8vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[clamp(2.4rem,6vw,5rem)]">
                <span className="block text-foreground md:whitespace-nowrap">
                  {dict.hero.headlineLine1}
                </span>
                <span className="block text-[var(--fonda-accent)] md:whitespace-nowrap">
                  <HeadlineWithBrand template={dict.hero.headlineLine2} />
                </span>
              </h1>
              {/* Near-black, not muted — the ONE place on the page a lead
                  paragraph isn't --fonda-text-2. It sits where the scrim has
                  released to roughly half coverage and the villa and pool show
                  through, and muted grey does not survive that: over the dark
                  foliage it measures 3.72:1, under AA for 20px normal text,
                  and only 4.65:1 over the pool. --fonda-text holds 8.3:1 and
                  10.4:1 on those same two spots. Size and weight still
                  separate it from the headline, so nothing flattens. */}
              <p className="mx-auto mt-7 max-w-xl text-[20px] leading-[1.6] text-foreground">
                {t(dict.hero.subhead, { brand: COMPANY.brand })}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="ink" size="lg">
                  <Link href={localizedHref(locale, "/signup")}>
                    {dict.hero.ctaPrimary}
                  </Link>
                </Button>
                {/* Scoped override, not a variant change: `outline` is a
                    transparent field with a hairline, which is right on the
                    plain grounds it's used on everywhere else and disappears
                    here, over the pool. Filling it makes it float instead.
                    All three pieces are load-bearing over different parts of
                    the painting — the white fill is a 1.56:1 step against the
                    pool but nearly nothing against the villa's white wall,
                    and the border is the reverse — so neither alone is
                    enough, and the shadow is the one constant. Do not "clean
                    this up" into the global outline variant. */}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-surface shadow-card hover:bg-surface hover:shadow-card-hover"
                >
                  <Link href="#how">{dict.hero.ctaSecondary}</Link>
                </Button>
              </div>
            </Reveal>
          </HeroParallax>

          {/* The brief itself, under the copy and OUTSIDE HeroParallax — it is
              not on the parallax layer and does not move on scroll. Keeping it
              out of the parallax also keeps that component's scrim tuning
              intact: the alphas in hero-parallax.tsx were measured against the
              art at its current size and centring, and adding a child to the
              parallax's flex column would have shifted both.

              The negative bottom margin is what gets clipped by the section's
              overflow-hidden — the window is cut off by the page boundary
              rather than by a height cap of its own, so the rows that are
              there really are there and simply run past the edge. The hero
              carries the first three rows of the brief (HERO_BRIEFING); the
              complete six are in band 3, ungated.

              The two values are measured, not guessed, and they are not the
              same fraction: the window is 340px tall at 1440 and 570-590px at
              360 (the prose wraps, and es runs longest), so 102px is ~30% on
              desktop and 86px is ~15% on a phone, which is what keeps two full
              rows of brief prose legible above the cut at 360px. Re-measure
              both if the row count, the copy length or the window's padding
              changes — Phase C's fuller rows grew the window by 40px at
              desktop and ~190px at 360, and these numbers moved with it. */}
          <div className="px-6 pb-0 md:px-8">
            <div className="-mb-[86px] md:-mb-[102px]">
              <BriefingPreviewWindow
                variant="hero"
                size="lg"
                windowTitle={dict.briefingPreview.windowTitle}
                dateLine={ts(dict.briefingPreview.dateLine)}
                greeting={ts(dict.briefingPreview.greeting)}
                rows={HERO_BRIEFING}
              />
            </div>
          </div>
        </section>

        {/* Trust bar. The only claim about traction on the page, and it is
            deliberately unnumbered — we are pre-pilot, so it says we are
            onboarding our first hotels and stops there. Do not put a count
            here until it is one a hotel could verify. */}
        <section id="works-with" className="border-y border-border px-6 py-5">
          <Reveal className="mx-auto flex max-w-[1120px] flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                {dict.trust.worksWith}
              </span>
              {/* Live: white chips floating on the grey ground. On the v3
                  ground the fill is what separates them from the page, so the
                  hairline they used to need is gone (§6, §9). */}
              {LIVE_INTEGRATIONS.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-[var(--fonda-surface)] px-3.5 py-1 text-[13px] font-medium text-[var(--fonda-text-2)]"
                >
                  {name}
                </span>
              ))}
              {/* The "we'd build it for you" set: its own label, and a chip
                  that sits BACK rather than forward, so it can't be mistaken
                  for the live ones above. The warm well tone with no shadow
                  reads recessed against the white ones; before the ground
                  flipped, both of these fills resolved to the same colour.
                  Same tokens — no new colour. */}
              <span className="ml-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                {dict.trust.onRequest}
              </span>
              {[...ON_REQUEST_INTEGRATIONS, dict.trust.customPms].map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-[var(--fonda-surface-2)] px-3.5 py-1 text-[13px] text-[var(--fonda-text-3)]"
                >
                  {name}
                </span>
              ))}
            </div>
            {/* The one line that says what is connected today and what happens
                if a hotel runs something else. Deliberately unnumbered — no
                connection count until it is one a hotel could verify. */}
            <p className="max-w-[68ch] text-center text-[13px] leading-[1.6] text-muted-foreground">
              {dict.trust.connectLine}
            </p>
            {/* One line, and every clause in it has to stay true: what runs
                today, what we'd build, and the scale cue. No connection count —
                we don't have a number a hotel could verify. */}
            <p className="max-w-[68ch] text-center text-[13px] leading-[1.6] text-muted-foreground">
              {dict.trust.adaptNote}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {dict.trust.onboardingNote}
            </p>
          </Reveal>
        </section>

        {/* Product showcase — the morning brief (Mobbin: Retool/ClickUp).

            GROUND: the light bands are --fonda-surface-2 (#F6F3EE), not
            --fonda-surface. Since the v3 ground flip, --fonda-surface resolves
            to #FFFFFF — the same white as --card and as these windows — so a
            "surface" band put a white window on a white ground at a 1.000:1
            tonal step, i.e. no step at all, and §6's "cards float lighter than
            the page" had nothing to float against. Bands 3 and 4 read as one
            white slab once both went full width, which is what forced the
            issue. #F6F3EE gives a 1.107:1 step; every text token still clears
            AA on it (text-3, the worst, is 5.02:1 against 4.5:1 required).
            The other light bands — bundle, stats, cta — moved with it so the
            page has one light material, not two.
            
            The window is full width at 1120px, the same measure band 4 uses,
            because the two windows are a pair in width as well as in chrome —
            and because six rows of brief prose in a 625px column wrapped to a
            column of stubs. The header keeps its two columns so the band still
            opens differently from band 4's stacked header: one frame, filled
            three different ways, is the intent; three identical bands is not. */}
        <section className="border-t border-border bg-[var(--fonda-surface-2)] px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-x-12 gap-y-4 lg:grid-cols-[5fr_7fr] lg:items-end">
              <div>
                <Eyebrow>{dict.showcase.eyebrow}</Eyebrow>
                <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                  {dict.showcase.headline}
                </h2>
              </div>
              <p className="max-w-[60ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.showcase.lead}
              </p>
            </Reveal>
            <Reveal index={1} className="mt-12">
              {/* The whole brief, read without doing anything: no truncation,
                  no blur, no email gate. The gate that remains is on
                  /sample-brief, and it gates the PERSONALISED brief, not this
                  one — this window is the generic example, free to read. */}
              <BriefingPreviewWindow
                variant="full"
                size="lg"
                windowTitle={dict.briefingPreview.windowTitle}
                dateLine={ts(dict.briefingPreview.dateLine)}
                greeting={ts(dict.briefingPreview.greeting)}
                rows={BRIEFING}
              />
              {/* One line, per §3.7: what this brief is, then the way to get
                  your own. The arrow lives in the string, so it travels with
                  the translation instead of being glued on in JSX. */}
              <p className="mt-6 text-center text-[15px] leading-[1.6] text-muted-foreground">
                {ts(dict.showcase.gateLine)}{" "}
                <Link
                  href={localizedHref(locale, "/sample-brief")}
                  className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
                >
                  {dict.showcase.gateCta}
                </Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* Email showcase — the inbox, Fondas' sharpest wedge (MARKET_STRATEGY
            §2.1).

            This band used to mirror the morning-brief one exactly: copy in a
            5fr column, window in a 7fr column. Phase D's window carries three
            panes side by side, and three panes do not fit in 7fr — at a 1024
            viewport that column is ~520px, so each pane would be ~170px wide
            and the drafted reply would wrap into a ribbon of two-word lines.
            So the copy moved above a full-width window.

            The two WINDOWS are still an exact pair — same radius, shadow,
            border and the same 1120px measure, enforced by the comment in
            email-draft-preview-window.tsx. It is only the band around them
            that differs, and it differs because the artefact got wider. */}
        <section className="border-t border-border bg-[var(--fonda-surface-2)] px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal>
              <Eyebrow>{dict.emailShowcase.eyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[22ch] text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.emailShowcase.headline}
              </h2>
              <p className="mt-5 max-w-[60ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.emailShowcase.lead}
              </p>
            </Reveal>
            <Reveal index={1} className="mt-12">
              <EmailDraftPreviewWindow
                size="lg"
                windowTitle={dict.emailPreview.windowTitle}
                receivedLabel={dict.emailPreview.receivedLabel}
                fromName={ts(dict.emailPreview.fromName)}
                subject={dict.emailPreview.subject}
                message={dict.emailPreview.message}
                contextLine={dict.emailPreview.contextLine}
                pmsSource={dict.emailPreview.pmsSource}
                reservation={RESERVATION}
                draftLabel={dict.emailPreview.draftLabel}
                draftBody={ts(dict.emailPreview.draftBody)}
              />
              {/* The one promise the band has to make, and the reason a GM
                  will tolerate an AI touching guest mail at all: the draft
                  waits. One marked line, no card around it. */}
              <p className="mt-6 flex items-center justify-center gap-2.5 text-[15px] leading-[1.6] text-muted-foreground">
                <SquareMarker />
                {dict.emailShowcase.approvalLine}
              </p>
            </Reveal>
          </div>
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
                className="flex flex-col rounded-[18px] bg-card p-7 shadow-card transition-shadow duration-[180ms] hover:shadow-card-hover"
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
                  // The two columns are ranked by elevation, not by colour:
                  // Fondas floats as a white card, by-hand sits back as a warm
                  // well with a hairline and no shadow. Both used to be
                  // "bg-card" and "--fonda-surface", which were different
                  // greys in v2 but resolve to the SAME white in v3 — the
                  // contrast the section is built on had quietly vanished.
                  className={cn(
                    "rounded-[18px] p-7",
                    column.isFondas
                      ? "bg-card shadow-card"
                      : "border border-border bg-[var(--fonda-surface-2)]"
                  )}
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

        {/* Bundle — one layer, not six subscriptions (ROADMAP v2 §0.2) */}
        <section className="border-t border-border bg-[var(--fonda-surface-2)] px-6 py-24 md:px-8">
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
                  className="rounded-[18px] bg-card p-6 shadow-card transition-shadow duration-[180ms] hover:shadow-card-hover"
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

        {/* ROI stats — Sana style */}
        <section className="border-t border-border bg-[var(--fonda-surface-2)] px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-8 pb-10 md:grid-cols-2 md:items-end">
              <h2 className="max-w-[13ch] text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                {dict.stats.headline}
              </h2>
              <p className="max-w-[42ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.stats.lead}
              </p>
            </Reveal>
            {/* One white card holding four cells, not four loose cells on the
                page: the internal hairlines only read as "one thought split
                four ways" when something contains them, and on the grey ground
                an uncontained grid just floats. Same treatment as the
                dashboard's stat-row (§6). */}
            <div className="grid grid-cols-2 overflow-hidden rounded-[18px] bg-card shadow-card md:grid-cols-4">
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

        {/* Pricing — the flat per-property price, stated. The figure is navy
            to match the same number in the ROI stat row above; both derive from
            PRICE_MONTHLY_EUR in company.ts. The button goes to /contact, not
            /signup — this band sells the price, it isn't the sign-up path. */}
        <section
          id="pricing"
          className="scroll-mt-20 border-t border-border px-6 py-24 md:px-8"
        >
          <Reveal className="mx-auto max-w-[1120px]">
            <div className="rounded-[28px] bg-card px-6 py-16 text-center shadow-card md:px-16">
              <Eyebrow>{dict.pricing.eyebrow}</Eyebrow>
              <h2 className="mx-auto mt-5 max-w-[16ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground">
                {dict.pricing.headline}
              </h2>
              {/* Stacked, not the old baseline-aligned row: the big line is
                  words now ("One price"), not a figure, so the unit reads as
                  its continuation on the next line rather than a currency
                  suffix sitting beside a number. */}
              <p className="mt-7 flex flex-col items-center gap-y-2">
                <span className="text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--fonda-accent)]">
                  {dict.pricing.price}
                </span>
                <span className="max-w-[32ch] text-[16px] leading-[1.5] text-muted-foreground">
                  {dict.pricing.priceUnit}
                </span>
              </p>
              <p className="mx-auto mt-6 max-w-[54ch] text-[17px] leading-[1.6] text-muted-foreground">
                {t(dict.pricing.lead, { brand: COMPANY.brand })}
              </p>
              <div className="mt-9 flex justify-center">
                <Button asChild variant="ink" size="lg">
                  <Link href={localizedHref(locale, "/contact")}>
                    {dict.pricing.button}
                  </Link>
                </Button>
              </div>
              {/* The address stays visible next to the button: /contact is a
                  page, not a mail client, but plenty of people would rather
                  just write than click through to be told where to write. */}
              <p className="mt-4 text-[14px] text-muted-foreground">
                {COMPANY.contactEmail}
              </p>
              <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                {dict.pricing.note}
              </p>
            </div>
          </Reveal>
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

        {/* CTA */}
        <section className="bg-[var(--fonda-surface-2)] px-6 pb-24 md:px-8">
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
              <Button
                asChild
                size="lg"
                className="bg-surface text-ink hover:bg-surface/90"
              >
                <Link href={localizedHref(locale, "/signup")}>{dict.cta.button}</Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter locale={locale} dict={dict} isHome />
    </div>
  );
}
