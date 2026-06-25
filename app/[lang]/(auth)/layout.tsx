import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { localizedHref } from "@/lib/i18n/navigation";
import { t } from "@/lib/i18n/format";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Wordmark href={localizedHref(locale, "/")} />
      {children}
      <p className="text-xs text-muted-foreground">
        {t(dict.footer.rights, { year: new Date().getFullYear() })}
      </p>
    </div>
  );
}
