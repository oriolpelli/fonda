import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { DictionaryProvider } from "@/components/i18n/dictionary-provider";
import { isLocale, locales } from "@/lib/i18n/config";

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
    title: {
      default: dict.meta.title,
      template: "%s · Fonda",
    },
    description: dict.meta.description,
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
          {children}
        </DictionaryProvider>
      </body>
    </html>
  );
}
