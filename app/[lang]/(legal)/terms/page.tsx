import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.legal.termsTitle };
}

// SCAFFOLD ONLY — placeholder structure, not legal advice. Replace with terms
// reviewed by a qualified professional before launch. The substantive body is
// intentionally kept in English; only the title + notice are localized.
export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dict.legal.termsTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{dict.legal.englishNotice}</p>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}. This is a placeholder — replace
        with your reviewed terms.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">The service</h2>
        <p className="text-muted-foreground">
          Fonda provides AI-assisted operations tooling for hotels, including
          morning briefings, email drafting, check-in chasing, and natural-language
          queries over the hotel&apos;s own data.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Acceptable use</h2>
        <p className="text-muted-foreground">
          The hotel is responsible for reviewing AI-generated drafts before they
          are sent to guests. Describe acceptable use and account responsibilities.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Subscription &amp; billing</h2>
        <p className="text-muted-foreground">
          Describe pricing, billing cycle, cancellation, and refunds.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Liability &amp; contact</h2>
        <p className="text-muted-foreground">
          Include limitation of liability, warranty disclaimers, governing law,
          and a contact address.
        </p>
      </section>
    </article>
  );
}
