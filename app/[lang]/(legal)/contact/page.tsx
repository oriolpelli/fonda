import type { Metadata } from "next";

import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { COMPANY } from "@/app/[lang]/(legal)/company";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { locale, dict } = await loadDictionary((await params).lang);
  return {
    title: dict.contact.metaTitle,
    alternates: {
      canonical: absoluteUrl(locale, "/contact"),
      languages: languageAlternates("/contact"),
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {dict.contact.heading}
        </h1>
        <p className="text-muted-foreground">{dict.contact.intro}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{dict.contact.emailHeading}</h2>
        <p className="text-muted-foreground">{dict.contact.emailHint}</p>
        <a
          href={`mailto:${COMPANY.contactEmail}`}
          className="font-medium text-[var(--fonda-accent)] hover:underline"
        >
          {COMPANY.contactEmail}
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{dict.contact.pilotHeading}</h2>
        <p className="text-muted-foreground">{dict.contact.pilotBody}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{dict.contact.locationHeading}</h2>
        <p className="text-muted-foreground">{dict.contact.locationBody}</p>
      </section>
    </article>
  );
}
