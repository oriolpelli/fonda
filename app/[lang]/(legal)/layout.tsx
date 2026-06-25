import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { localizedHref } from "@/lib/i18n/navigation";

export default async function LegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Wordmark href={localizedHref(locale, "/")} />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href={localizedHref(locale, "/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {dict.legal.home}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
