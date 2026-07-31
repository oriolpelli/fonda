import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { DictionaryProvider } from "@/components/i18n/dictionary-provider";
import { isLocale, locales } from "@/lib/i18n/config";
import { openGraphFor, SITE_URL } from "@/lib/seo";

// Fonda v2 "Signal" — one grotesque for everything. No serif.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Geist Mono — eyebrows, labels, metadata, code.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
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
    // Lets every child page use relative URLs in metadata, and is what the
    // opengraph-image file convention resolves its absolute og:image against.
    metadataBase: new URL(SITE_URL),
    title: {
      default: dict.meta.title,
      template: "%s · Fondas",
    },
    description: dict.meta.description,
    // NOTE: no `alternates` here on purpose. This layout wraps every page
    // under /[lang], so a canonical set here would be inherited by /privacy,
    // /terms, /dashboard… all pointing at the locale root. Canonical +
    // hreflang are set per page, where the path is known.
    openGraph: openGraphFor(lang, {
      title: dict.meta.title,
      description: dict.meta.description,
    }),
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DictionaryProvider locale={lang} dict={dict}>
          {/* WCAG 2.4.1 (Bypass Blocks) — first tab stop on every page, so a
              keyboard or screen-reader user can jump the sticky nav. Visually
              hidden until focused, then a normal ink chip in the top-left. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-medium focus:text-[var(--fonda-text-inv)]"
          >
            {dict.common.skipToContent}
          </a>
          {/* The skip target lives here, not on each page's <main>, so every
              route under /[lang] has one. tabIndex=-1 lets focus land on it
              without adding a tab stop. */}
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </DictionaryProvider>
      </body>
    </html>
  );
}
