import type { Metadata } from "next";
import Link from "next/link";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { absoluteUrl, languageAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { locale, dict } = await loadDictionary((await params).lang);
  return {
    title: dict.trustPage.metaTitle,
    description: dict.trustPage.metaDescription,
    alternates: {
      canonical: absoluteUrl(locale, "/trust"),
      languages: languageAlternates("/trust"),
    },
    openGraph: openGraphFor(locale, {
      title: dict.trustPage.metaTitle,
      description: dict.trustPage.metaDescription,
      path: "/trust",
    }),
  };
}

/**
 * The trust page — what we read, what we store, where it lives, what we never
 * do, what happens when a hotel leaves, and who is controller of what.
 *
 * Three things make this page different from its neighbours in (legal):
 *
 *  1. It is LOCALISED. /privacy and /terms are deliberately English-only —
 *     legal text has to be professionally translated — but this is not legal
 *     text. It is the answer to "¿están seguros mis datos?" asked by a GM in
 *     Spanish, and it is the destination of the security band's CTA, so it
 *     has to answer in the language they were reading. All the copy is in the
 *     `trustPage` namespace. (`trust` was already taken by the works-with
 *     band.)
 *  2. Every claim on it is checked against the code, not against the pitch:
 *     the PMS scopes really are read-only (`reservations.read` on Apaleo,
 *     `getAll` endpoints only on MEWS), a send really does require a person
 *     (`sendReply` in dashboard/communications/actions.ts), and disconnecting
 *     really does clear the credentials in the same transaction
 *     (`PMS_CREDENTIAL_COLUMNS` in dashboard/settings/actions.ts). If any of
 *     those change, the matching line here changes with them.
 *  3. It claims no certification. We hold no ISO 27001 and no SOC 2, and the
 *     `honest` section says so out loud rather than leaving the reader to
 *     assume. Do not add a badge, a seal or a "compliant with" line here
 *     unless the certificate exists.
 *
 * It sits in the (legal) group for the chrome — warm ground, wordmark,
 * language switcher, one way home — and joins the `.marketing-surface` set
 * that the group layout applies.
 *
 * `trustPage.updated` is the revision date, written out per language. All
 * three have to move together when this page is revised.
 */

// The navy square, Signal's marker in place of a bullet. The same 7px square
// the landing page's SquareMarker draws; inlined rather than imported because
// that one is local to page.tsx.
function Marker() {
  return (
    <span
      aria-hidden
      className="mt-[9px] block size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-accent)]"
    />
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-3.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3.5">
          <Marker />
          <span className="text-[16px] leading-[1.6] text-muted-foreground">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-foreground">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[17px] leading-[1.65] text-muted-foreground">
      {children}
    </p>
  );
}

export default async function TrustPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const copy: Dictionary["trustPage"] = dict.trustPage;
  const brand = { brand: COMPANY.brand };

  return (
    <article className="flex flex-col gap-10">
      <header>
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {copy.eyebrow}
        </span>
        <h1 className="mt-4 text-[clamp(1.875rem,4vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
          {copy.heading}
        </h1>
        <p className="mt-5 text-[19px] leading-[1.6] text-muted-foreground">
          {t(copy.lead, brand)}
        </p>
        <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
          {copy.updated}
        </p>
      </header>

      <Section heading={copy.readsTitle}>
        <Body>{copy.readsBody}</Body>
        <Bullets items={[copy.readsB1, copy.readsB2, copy.readsB3]} />
      </Section>

      {/* The section that earns the page. Fondas stores hotel and guest data —
          the briefs are built from stored rows — and saying so here is the
          same commitment the privacy policy's Security section makes. Any
          "we use and discard" wording is false and must not appear. */}
      <Section heading={copy.storesTitle}>
        <Body>{copy.storesBody}</Body>
        <Bullets items={[copy.storesB1, copy.storesB2, copy.storesB3]} />
        <Body>{copy.storesNote}</Body>
      </Section>

      <Section heading={copy.whereTitle}>
        <Body>{copy.whereBody}</Body>
        <Body>{copy.whereBody2}</Body>
      </Section>

      <Section heading={copy.neverTitle}>
        <Bullets
          items={[
            t(copy.never1, brand),
            copy.never2,
            copy.never3,
            copy.never4,
            copy.never5,
          ]}
        />
      </Section>

      <Section heading={copy.deleteTitle}>
        <Body>{copy.deleteBody}</Body>
        <Body>{copy.deleteBody2}</Body>
      </Section>

      <Section heading={copy.rolesTitle}>
        <Body>{t(copy.rolesBody, brand)}</Body>
        <Body>{copy.rolesBody2}</Body>
      </Section>

      <Section heading={copy.honestTitle}>
        <Body>{copy.honestBody}</Body>
      </Section>

      {/* The hand-off to the legal text. A card rather than another hairline
          section: it is the one block on the page that asks for an action. */}
      <section className="rounded-[18px] bg-card p-8 shadow-card">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
          {copy.moreTitle}
        </h2>
        <p className="mt-3 text-[16px] leading-[1.6] text-muted-foreground">
          {copy.moreBody}{" "}
          <a
            href={`mailto:${COMPANY.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {COMPANY.privacyEmail}
          </a>
        </p>
        {/* The landing page's link treatment (showcase.gateCta,
            security.cta): ink, underlined in the border colour. Not accent —
            §4 keeps navy for content, never for chrome, and the security
            band's CTA that sends a reader here looks exactly like this. */}
        <p className="mt-6">
          <Link
            href={localizedHref(locale, "/privacy")}
            className="text-[16px] font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
          >
            {copy.moreCta}
          </Link>
        </p>
      </section>
    </article>
  );
}
