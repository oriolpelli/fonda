import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { NewsletterUnsubscribe } from "@/components/marketing/newsletter-unsubscribe";
import { localizedHref } from "@/lib/i18n/navigation";

// Reached only from a link in an email, each URL carrying a one-time token.
// Keep it out of the index (and out of PUBLIC_PATHS / the sitemap): an indexed
// unsubscribe URL is a live opt-out token published on the open web.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await loadDictionary((await params).lang);
  const { token } = await searchParams;

  return (
    <main className="marketing-surface flex min-h-screen flex-col px-6 py-10 md:px-8">
      {/* Warm marketing ground, not the app's neutral grey. This is a
          landing page for the sample-brief request flow: the lead clicks the
          confirm link in their email and arrives here mid-conversion, so it
          has to look like the site they just came from. */}
      <Wordmark href={localizedHref(locale, "/")} />
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-[520px]">
          <NewsletterUnsubscribe token={token ?? ""} />
        </div>
      </div>
    </main>
  );
}
