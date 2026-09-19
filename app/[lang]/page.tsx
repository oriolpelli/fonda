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
import {
  Vignette,
  type VignetteName,
} from "@/components/marketing/vignettes";
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
// ON_REQUEST_INTEGRATIONS are ones we would build for a specific hotel during
// onboarding. They render in a recessed outline chip under their own "We'll
// build" label so they read as "we can", never as "already connected". Moving
// a name from the second list to the first is a CLAIM — only do it once the
// connection actually works in the app.
//
// WHY THE SECOND LIST IS LONG, AND WHY THE FIRST ONE IS NOT PADDED.
// Three live names on their own read as a boundary: "works with these, sorry."
// The fix for that is not a bigger number on the first list — a connection
// count we cannot evidence is the one claim on this site a prospect's IT
// person can disprove in a minute, and it would sit two clicks from /trust.
// The fix is to widen what we will BUILD and to lead with how fast we build
// it, which is both the honest position and the stronger one: an unknown
// vendor claiming "100+ integrations" is generic SaaS noise, while "name your
// PMS and it is connected before your pilot starts" is specific, unusual, and
// checkable — the hotel finds out whether it is true within the week.
//
// Every name below is a system we would genuinely take on. Do not add one we
// would not, and do not reorder them into the live list to make the row look
// fuller.
const LIVE_INTEGRATIONS = ["MEWS", "Apaleo", "Gmail"];
const ON_REQUEST_INTEGRATIONS = [
  "Outlook",
  "Cloudbeds",
  "Oracle OPERA",
  "protel",
  "Guestline",
  "SiteMinder",
] as const;

function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]",
        className
      )}
    >
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

  // The three setup steps. They no longer own a band: Phase F folded them into
  // the compact strip at the top of the overnight timeline, which is why the
  // howItWorks.* keys survive and the #how anchor now lands on that band. They
  // still answer the setup fear ("live in an afternoon") — the timeline beside
  // them answers what happens once it is.
  const STEPS = [
    { num: "01", title: dict.howItWorks.step1Title, desc: dict.howItWorks.step1Desc },
    { num: "02", title: dict.howItWorks.step2Title, desc: dict.howItWorks.step2Desc },
    { num: "03", title: dict.howItWorks.step3Title, desc: dict.howItWorks.step3Desc },
  ];

  // The overnight timeline. Seven rows, 23:00 → 09:00, and every one of them is
  // a real scheduled job in vercel.json:
  //
  //   r1        /api/sync           */15 — the PMS sync
  //   r2, r3, r4 /api/cron/emails   */5  — read, match to a booking, draft
  //   r5, r6    /api/cron/briefing  */15, delivering at brief_send_hour
  //                                 (default 7, in the hotel's timezone)
  //   r7        /api/cron/checkin   0 9  — the arrival-time chase
  //
  // IF A CRON CHANGES, THIS BAND CHANGES. The clock times are dramatised into
  // one night — the jobs run far more often than once — and `note` below is
  // what makes that honest. It is not decorative: do not ship the band without
  // both the kicker and the note (SITE_REDESIGN_V3.md §3.6, band 5).
  const NIGHT_SHIFT = [
    { time: dict.nightShift.r1Time, title: dict.nightShift.r1Title, chip: dict.nightShift.r1Chip },
    { time: dict.nightShift.r2Time, title: dict.nightShift.r2Title, chip: dict.nightShift.r2Chip },
    { time: dict.nightShift.r3Time, title: dict.nightShift.r3Title, chip: dict.nightShift.r3Chip },
    { time: dict.nightShift.r4Time, title: dict.nightShift.r4Title, chip: dict.nightShift.r4Chip },
    { time: dict.nightShift.r5Time, title: dict.nightShift.r5Title, chip: dict.nightShift.r5Chip },
    { time: dict.nightShift.r6Time, title: dict.nightShift.r6Title, chip: dict.nightShift.r6Chip },
    { time: dict.nightShift.r7Time, title: dict.nightShift.r7Title, chip: dict.nightShift.r7Chip },
  ];

  // The four parts of the day — the anti-fragmentation close. These are the
  // four surfaces that are live in lib/roadmap.ts; anything coming-soon there
  // (analytics, revenue, the rest) belongs in the comingSoon band, not here.
  const SECTIONS = [
    { title: dict.sections.i1Title, desc: dict.sections.i1Desc },
    { title: dict.sections.i2Title, desc: dict.sections.i2Desc },
    { title: dict.sections.i3Title, desc: dict.sections.i3Desc },
    { title: dict.sections.i4Title, desc: dict.sections.i4Desc },
  ];

  // Who it's for — the same brief, doing a different job for three readers.
  // Otel segments by role and we follow, because a GM and an owner want
  // opposite things from the same morning.
  //
  // The vignette per card is the old FEATURE_VIGNETTES idea remapped: the
  // bento tiles it used to front were retired in Phase A, and these are the
  // only cards left that want a mark. Navy is spent once across the three —
  // `key` carries the fob (vignettes.tsx §: navy belongs to key and sail
  // only) — so the row still holds the one-accent rule.
  //
  // The FIRST card is written for one hotel OR twenty. Nothing here may say
  // independiente / boutique / pequeño: a multi-property reader who concludes
  // this was built for someone smaller than them leaves (§6, guardrail 10).
  const AUDIENCE: {
    role: string;
    sub: string;
    promise: string;
    vignette: VignetteName;
    bullets: string[];
  }[] = [
    {
      role: dict.audience.ownerRole,
      sub: dict.audience.ownerSub,
      promise: dict.audience.ownerPromise,
      vignette: "arch",
      bullets: [
        dict.audience.ownerB1,
        dict.audience.ownerB2,
        dict.audience.ownerB3,
        dict.audience.ownerB4,
      ],
    },
    {
      role: dict.audience.gmRole,
      sub: dict.audience.gmSub,
      promise: dict.audience.gmPromise,
      vignette: "coffee",
      bullets: [
        dict.audience.gmB1,
        dict.audience.gmB2,
        dict.audience.gmB3,
        dict.audience.gmB4,
      ],
    },
    {
      role: dict.audience.deskRole,
      sub: dict.audience.deskSub,
      promise: dict.audience.deskPromise,
      vignette: "key",
      bullets: [
        dict.audience.deskB1,
        dict.audience.deskB2,
        dict.audience.deskB3,
        dict.audience.deskB4,
      ],
    },
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
  // Band 10's three cells. The stats treatment at three: one card, internal
  // hairlines, no icons — §4 reserves the navy square for bands 8 and 9 and
  // forbids a new icon set here.
  const SECURITY = [
    { title: dict.security.i1Title, desc: dict.security.i1Desc },
    { title: dict.security.i2Title, desc: dict.security.i2Desc },
    { title: dict.security.i3Title, desc: dict.security.i3Desc },
  ];

  // Band 11 — everything that is NOT live. lib/roadmap.ts governs what may be
  // claimed above this band (§9.1 decision 8); this is where the rest lives.
  // Every string here is future tense on purpose: a present-tense line in this
  // band is a claim, and claims belong above it or nowhere.
  const COMING_SOON = [
    { title: dict.comingSoon.i1Title, desc: dict.comingSoon.i1Desc },
    { title: dict.comingSoon.i2Title, desc: dict.comingSoon.i2Desc },
    { title: dict.comingSoon.i3Title, desc: dict.comingSoon.i3Desc },
    { title: dict.comingSoon.i4Title, desc: dict.comingSoon.i4Desc },
  ];

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
    <div className="marketing-surface flex min-h-screen flex-col">
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
              {/* Tightened on phones, and only here. This is much the
                  longest eyebrow on the page — es runs 34 characters — and at
                  the shared 12px/0.14em it wrapped to two lines inside the
                  pill at 360px, which a leading dot makes look broken. The
                  string is not the thing to cut: 11px at 0.08em holds all
                  three languages on one line down to 320px, and the section
                  eyebrows keep the full treatment because they are short.

                  The colour is stepped up too, and only here. Eyebrows are
                  --fonda-text-3 everywhere else, which is 5.02:1 on the flat
                  ground — fine. This one sits over the watercolour, where the
                  lightest pixel beneath it is rgb(226,226,216) and text-3
                  measures 4.26:1, under the 4.5:1 floor for 11-12px text.
                  --fonda-text-2 measures 5.89:1 over that same pixel. No new
                  token, and the hero is the only place the art is behind the
                  type. */}
              <Eyebrow className="text-[var(--fonda-text-2)] max-sm:text-[11px] max-sm:tracking-[0.08em]">
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
                  // Outline, not a fill. The fill used to be
                  // --fonda-surface-2, which IS the page ground now, so the
                  // chip dissolved into it. It cannot step down to
                  // --fonda-inset either: --fonda-text-3 on #E4E0D7 measures
                  // 4.22:1 and fails AA for 13px text. A hairline keeps the
                  // chip quieter than the live ones (which float white) while
                  // leaving its label on the ground at 5.02:1.
                  className="rounded-full border border-[var(--fonda-border-2)] px-3.5 py-1 text-[13px] text-[var(--fonda-text-3)]"
                >
                  {name}
                </span>
              ))}
            </div>
            {/* Frames the live chips above as a starting point rather than a
                boundary. Still deliberately unnumbered — no connection count
                until it is one a hotel could verify. */}
            <p className="max-w-[68ch] text-center text-[13px] leading-[1.6] text-muted-foreground">
              {dict.trust.connectLine}
            </p>
            {/* The speed claim, which is the actual differentiator and the
                thing this section now leads on. Every clause has to stay
                TRUE and every one of them is falsifiable by the reader, which
                is the point: "days, not quarters" and "we ship every week" are
                claims a hotel discovers the truth of during its own pilot. If
                a connection ever starts taking a month, this line changes. */}
            <p className="max-w-[68ch] text-center text-[13px] leading-[1.6] text-muted-foreground">
              {dict.trust.adaptNote}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {dict.trust.onboardingNote}
            </p>
          </Reveal>
        </section>

        {/* Product showcase — the morning brief (Mobbin: Retool/ClickUp).

            GROUND: none. Every band on this page sits on the one warm
            marketing ground (#F6F3EE), set once on the page shell by
            .marketing-surface in globals.css — see the note there. Bands are
            separated by the border-t hairline and the vertical padding, and
            nothing else. Do not reintroduce a per-band background: the
            alternation this replaced swapped temperature rather than value,
            so it read as the page changing its mind. White windows still
            float on it at 1.107:1.
            
            The window is full width at 1120px, the same measure band 4 uses,
            because the two windows are a pair in width as well as in chrome —
            and because six rows of brief prose in a 625px column wrapped to a
            column of stubs. The header keeps its two columns so the band still
            opens differently from band 4's stacked header: one frame, filled
            three different ways, is the intent; three identical bands is not. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
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
        <section className="border-t border-border px-6 py-24 md:px-8">
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

        {/* While the hotel sleeps — the overnight timeline (band 5, Phase F).

            This band replaced the three-card "how it works" section and
            absorbed it: the steps are the strip under the headline, and the
            #how anchor stays here because the header and footer both link to
            it. The band answers the setup fear on the left and the "what does
            it actually do all night" question on the right.

            Motion is Reveal and nothing else — a one-shot staggered entrance,
            no autoplay and no loop. index={i * 2} because Reveal's stagger
            step is 60ms and §3.6 asks for roughly 120ms between rows; under
            prefers-reduced-motion globals.css forces every row visible from
            first paint with the delay zeroed. */}
        <section
          id="how"
          className="scroll-mt-20 border-t border-border px-6 py-24 md:px-8"
        >
          <div className="mx-auto max-w-[1120px]">
            {/* The split is held back to 1100px rather than lg's 1024. In the
                76px between them the timeline column is 444px, and three of
                the seven rows need 474 — so the chip wrapped under the title
                and those rows stood 30px taller than the rest, breaking the
                rhythm of seven equal rows. Above 1100 the column is 488px and
                nothing wraps, so the two-column layout is untouched where it
                works; below it the band simply stays in the single-column
                state it already uses from md up. The chip strings are not the
                thing to cut — "Cada 15 min" and "Cada 5 min" are the two rows
                that prove Fondas never stops. */}
            <div className="grid gap-x-12 gap-y-14 min-[1100px]:grid-cols-[5fr_7fr] min-[1100px]:items-start">
              {/* Left: text only. Otel puts a photograph of an unmade bed
                  here; decided against — the only honest source would be our
                  own brand photography, and stock would cheapen the one band
                  on the page that has to feel true. No sticky either: a
                  sticky descendant of Reveal is fragile (see the transform
                  note in reveal.tsx), and the column is nearly as tall as the
                  timeline anyway. */}
              <div>
                <Reveal>
                  <Eyebrow>{dict.nightShift.eyebrow}</Eyebrow>
                  <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                    {dict.nightShift.headline}
                  </h2>
                  <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
                    {dict.nightShift.lead}
                  </p>
                </Reveal>
                {/* The three steps, compacted: one card with internal
                    hairlines rather than three loose cells (§4,
                    containment), so the strip reads as a note beside the
                    headline and never competes with the timeline. */}
                <Reveal index={1} className="mt-10">
                  <ol className="rounded-[16px] bg-card">
                    {STEPS.map((step) => (
                      <li
                        key={step.num}
                        className="flex gap-4 border-t border-border px-6 py-5 first:border-t-0"
                      >
                        <span className="mt-[2px] font-mono text-[13px] font-medium tracking-[0.1em] text-[var(--fonda-accent)]">
                          {step.num}
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">
                            {step.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              </div>

              {/* Right: the timeline. The hour sits in a narrow right-aligned
                  gutter with a hairline running down the gap between it and
                  the cards, so seven separate rows still read as one night.
                  Below sm the hour moves above its card and the rule is gone —
                  a 360px screen has no room for a gutter. */}
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-[80px] hidden w-px bg-border sm:block"
                />
                {/* Below sm the rows stack and the hour moves above its card,
                    so the gap BETWEEN rows has to be clearly larger than the
                    6px from an hour to the card it labels — otherwise the hour
                    reads as a footer on the row above it. */}
                <ol className="space-y-5 sm:space-y-2">
                  {NIGHT_SHIFT.map((row, i) => (
                    <li key={row.time}>
                      <Reveal
                        index={i * 2}
                        className="grid gap-x-4 sm:grid-cols-[72px_1fr] sm:items-center"
                      >
                        <span className="font-mono text-[13px] tabular-nums text-[var(--fonda-text-3)] sm:text-right">
                          {row.time}
                        </span>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[14px] bg-card px-5 py-4 sm:mt-0">
                          <p className="text-[15px] font-medium leading-[1.45] text-foreground">
                            {row.title}
                          </p>
                          {/* The muted badge, never the accent one: the chip
                              is the detail, the row title is the message. The
                              §5.4 badge fills with --fonda-surface, which is
                              the card it sits on — so it steps down to
                              --fonda-surface-2 (#56534B on #F6F3EE, 6.9:1)
                              and keeps the hairline to hold its shape. */}
                          <span className="shrink-0 rounded-full border border-border bg-[var(--fonda-surface-2)] px-3 py-1 font-mono text-[12px] text-[var(--fonda-text-2)]">
                            {row.chip}
                          </span>
                        </div>
                      </Reveal>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* The closing argument, then the admission that makes it honest.
                The kicker is body size at full contrast because it is the
                sentence the whole band exists to earn — work nobody had to
                stay up for, never people you no longer need. The note says
                the times are examples; without it the band is a claim, and
                §0.4 does not allow claims. Both lines are required. */}
            <Reveal className="mt-14 text-center">
              <p className="mx-auto max-w-[46ch] text-[17px] font-medium leading-[1.55] text-foreground">
                {dict.nightShift.kicker}
              </p>
              <p className="mx-auto mt-3 max-w-[72ch] text-[13px] leading-[1.6] text-[var(--fonda-text-3)]">
                {t(dict.nightShift.note, { brand: COMPANY.brand })}
              </p>
            </Reveal>
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
                  // Fondas floats as a white card, by-hand sits back at ground
                  // level with a hairline and no shadow. Both used to be
                  // "bg-card" and "--fonda-surface", which were different
                  // greys in v2 but resolve to the SAME white in v3 — the
                  // contrast the section is built on had quietly vanished.
                  //
                  // The by-hand column carries NO fill. It was
                  // --fonda-surface-2, which is the page ground now, so the
                  // class painted the column exactly the colour it was already
                  // sitting on — a no-op that read as intent. The hairline is
                  // what separates it; the elevation ranking is unchanged.
                  className={cn(
                   "rounded-[18px] p-7",
                    column.isFondas
                      ? "bg-card"
                      : "border border-border"
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

        {/* The four parts of the day — the four LIVE surfaces, framed as the
            anti-fragmentation close (six subscriptions, or one tool that
            already knows the hotel). Nothing coming-soon in lib/roadmap.ts may
            appear here; that is what the comingSoon band is for. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-x-12 gap-y-4 lg:grid-cols-[5fr_7fr] lg:items-end">
              <div>
                <Eyebrow>{dict.sections.eyebrow}</Eyebrow>
                <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                  {dict.sections.headline}
                </h2>
              </div>
              <p className="max-w-[60ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.sections.lead}
              </p>
            </Reveal>
            {/* One white card holding four cells, not four loose cards: same
                containment treatment as the stats band below, and for the same
                reason its comment gives — the internal hairlines only read as
                "one thought split four ways" when something contains them. */}
            <div className="mt-12 grid overflow-hidden rounded-[16px] bg-card sm:grid-cols-2">
              {SECTIONS.map((part, i) => (
                <Reveal
                  key={part.title}
                  index={i}
                  className={`flex flex-col px-6 py-8 sm:px-8 sm:py-10 ${
                    i < SECTIONS.length - 1 ? "border-b border-border" : ""
                  } ${i === 2 ? "sm:border-b-0" : ""} ${
                    i % 2 === 0 ? "sm:border-r sm:border-border" : ""
                  }`}
                >
                  <SquareMarker />
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                    {part.title}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-sm leading-[1.55] text-muted-foreground">
                    {part.desc}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Para quién es — the same information, three jobs. Three floating
            white cards, not one contained grid: each card carries its own
            headline and its own CTA, which is the comparison band's treatment
            rather than the stats band's. §4's containment rule is about loose
            CELLS sharing one thought; these are three separate arguments.

            Three across only at lg. At md the 1120px cap leaves ~230px a
            column, which puts the four bullets on three lines each; below lg
            they stack full width and stay short. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-8 pb-12 md:grid-cols-2 md:items-end">
              <div>
                <Eyebrow>{dict.audience.eyebrow}</Eyebrow>
                <h2 className="mt-4 max-w-[16ch] text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                  {dict.audience.headline}
                </h2>
              </div>
              <p className="max-w-[46ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.audience.lead}
              </p>
            </Reveal>

            <div className="grid gap-4 lg:grid-cols-3">
              {AUDIENCE.map((card, i) => (
                <Reveal
                  key={card.role}
                  index={i}
                  className="flex flex-col rounded-[16px] bg-card p-7"
                >
                  {/* Decorative only — aria-hidden inside Vignette, so the
                      role label below carries all the meaning. */}
                  <Vignette name={card.vignette} size={76} className="-ml-2" />
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                    {card.role}
                  </h3>
                  {/* Plain, not a second eyebrow. A mono uppercase micro-label
                      here would put four of them in one band and dilute the
                      spine the eyebrows are supposed to be (§4). */}
                  <p className="mt-1 text-[14px] leading-[1.5] text-[var(--fonda-text-3)]">
                    {card.sub}
                  </p>
                  <p className="mt-5 text-[17px] font-medium leading-[1.4] tracking-[-0.01em] text-foreground">
                    {card.promise}
                  </p>
                  {/* flex-1 so the list absorbs the card's spare height and the
                      three buttons land on one line whatever the bullets wrap
                      to — the cards are already equal height from the grid. */}
                  <ul className="mt-5 flex-1 space-y-3">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-[7px]">
                          <SquareMarker />
                        </span>
                        <span className="text-[15px] leading-[1.5] text-muted-foreground">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {/* mt-auto so the three buttons line up whatever the bullets
                      wrap to. `secondary` fills with --fonda-surface-2, which
                      is the page ground — a no-op out there, but these sit on
                      a white card, so it reads as a quiet step down from the
                      hero's ink CTA. Same reasoning as the timeline chips.

                      The label is hero.ctaPrimary: §3.2 ships no CTA string,
                      and reusing the one the page already says for /signup
                      beats inventing a fourth way to word it.

                      size="lg" because every other button on this page is lg,
                      and because the default h-10 is 40px — under the 44px tap
                      target Phase J has to certify.

                      Full width where the card is narrow (stacked phone) or
                      one of three; auto in between, where the card is a single
                      column up to ~960px and a stretched button would be a
                      metre of fill around two words. */}
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="mt-8 self-stretch sm:self-start lg:self-stretch"
                  >
                    <Link href={localizedHref(locale, "/signup")}>
                      {dict.hero.ctaPrimary}
                    </Link>
                  </Button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* De tu lado — kills "mi PMS ya hace eso" on the page instead of on
            the call. The ONLY band on the landing page that is nothing but
            words: no card, no illustration, no icon, nothing to look at. That
            is where its weight comes from (§2, band 9), and it is also the
            breath between the three role cards above and the security card
            below, both of which are dense.

            §4 lists band 9 among the "multi-cell groups" that must be
            contained in one card — but §2 says no card, and the two only
            conflict if the three bullets are CELLS. They are a list: one
            column, stacked, hanging off the lead. A list needs no container,
            so both rules hold. Do not turn these into a three-across grid. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-x-12 gap-y-8 lg:grid-cols-[5fr_7fr] lg:items-start">
              <div>
                <Eyebrow>{dict.onYourSide.eyebrow}</Eyebrow>
                <h2 className="mt-4 max-w-[18ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                  {dict.onYourSide.headline}
                </h2>
              </div>
              <div>
                <p className="max-w-[56ch] text-[19px] leading-[1.6] text-muted-foreground">
                  {t(dict.onYourSide.lead, { brand: COMPANY.brand })}
                </p>
                <ul className="mt-9 flex flex-col gap-5">
                  {[
                    dict.onYourSide.b1,
                    dict.onYourSide.b2,
                    t(dict.onYourSide.b3, { brand: COMPANY.brand }),
                  ].map((bullet) => (
                    <li key={bullet} className="flex items-start gap-4">
                      <span className="mt-[9px]">
                        <SquareMarker />
                      </span>
                      {/* Bigger than a card bullet: these three lines are the
                          band's whole content, so they carry body weight
                          rather than caption weight. */}
                      <span className="max-w-[52ch] text-[17px] leading-[1.55] text-foreground">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Seguridad — the highest-value steal in the redesign: it reframes
            the data objection as a problem the buyer already has. Someone on
            their front desk is pasting guest email into a free chatbot right
            now; the question is not whether AI touches guest data, it is
            whether it does so somewhere the hotel controls.

            Copy left, three cells right in ONE card with internal hairlines —
            the stats treatment at three (§2, band 10). The cta goes to the
            trust page built in Phase I, in the reader's own locale. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[5fr_7fr] lg:items-start">
              <Reveal>
                <Eyebrow>{dict.security.eyebrow}</Eyebrow>
                <h2 className="mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
                  {dict.security.headline}
                </h2>
                <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
                  {t(dict.security.lead, { brand: COMPANY.brand })}
                </p>
                {/* The arrow travels inside the string, as the gate line's
                    does, so a translator can move it. Same link treatment as
                    showcase.gateCta — underlined in the border colour, ink on
                    hover. No accent: §4 keeps navy for content, not chrome. */}
                <p className="mt-8">
                  {/* `py-3 -my-3` is a tap target that costs no layout: the
                      link is the band's own CTA on its own line, not a link
                      inside a sentence like the gate line, so it is held to
                      44px — 21px of text plus 24px of padding, with the
                      margin giving the height straight back. */}
                  <Link
                    href={localizedHref(locale, "/trust")}
                    className="inline-block py-3 -my-3 text-[16px] font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
                  >
                    {dict.security.cta}
                  </Link>
                </p>
              </Reveal>

              <div className="overflow-hidden rounded-[16px] bg-card">
                {SECURITY.map((cell, i) => (
                  <Reveal
                    key={cell.title}
                    index={i}
                    className={cn(
                      "px-7 py-8 sm:px-9",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                      {cell.title}
                    </h3>
                    <p className="mt-2 max-w-[52ch] text-[16px] leading-[1.6] text-muted-foreground">
                      {t(cell.desc, { brand: COMPANY.brand })}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ya en camino — honest momentum, and the home for everything that
            is not live yet. It has to read as "not yet" at a glance, and it
            does that by ELEVATION, the same ranking the comparison band uses:
            every other group on this page is a white card floating on a
            shadow; this one sits at ground level with a hairline and no fill.
            §2 asked for a "lighter ground", which was written when the page
            still alternated band grounds — that alternation was retired (§4),
            so the surviving instruction is "no card shadow", and no fill is
            what keeps it from looking like a card that lost its shadow.

            The marker is the navy square HOLLOW — same 7px, same radius, no
            fill. It is the one mark on the page that says "not yet" without
            words, and it introduces no icon set (§4).

            Copy rule, enforced in review: future tense in all three
            languages. A present-tense line here is a claim, and claims belong
            above this band or nowhere. */}
        <section className="border-t border-border px-6 py-24 md:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="grid gap-x-12 gap-y-4 lg:grid-cols-[5fr_7fr] lg:items-end">
              <div>
                <Eyebrow>{dict.comingSoon.eyebrow}</Eyebrow>
                <h2 className="mt-4 text-[clamp(1.875rem,3.6vw,2.875rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                  {dict.comingSoon.headline}
                </h2>
              </div>
              <p className="max-w-[56ch] text-[17px] leading-[1.6] text-muted-foreground">
                {dict.comingSoon.lead}
              </p>
            </Reveal>
            <div className="mt-12 grid overflow-hidden rounded-[18px] border border-border sm:grid-cols-2">
              {COMING_SOON.map((item, i) => (
                <Reveal
                  key={item.title}
                  index={i}
                  className={cn(
                    "flex flex-col px-6 py-8 sm:px-8 sm:py-10",
                    i < COMING_SOON.length - 1 && "border-b border-border",
                    i === 2 && "sm:border-b-0",
                    i % 2 === 0 && "sm:border-r sm:border-border"
                  )}
                >
                  {/* Hollow — see the band comment. Drawn here rather than as
                      a SquareMarker prop: the filled square means "live" on
                      four other bands, and giving it a variant that means the
                      opposite would make the shared component ambiguous. */}
                  <span
                    aria-hidden
                    className="block size-[7px] rounded-[2px] border border-[var(--fonda-accent)]"
                  />
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-sm leading-[1.55] text-muted-foreground">
                    {t(item.desc, { brand: COMPANY.brand })}
                  </p>
                </Reveal>
              ))}
            </div>
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
            {/* One white card holding four cells, not four loose cells on the
                page: the internal hairlines only read as "one thought split
                four ways" when something contains them, and on the grey ground
                an uncontained grid just floats. Same treatment as the
                dashboard's stat-row (§6). */}
            <div className="grid grid-cols-2 overflow-hidden rounded-[16px] bg-card md:grid-cols-4">
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
            <div className="rounded-[28px] bg-card px-6 py-16 text-center md:px-16">
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
