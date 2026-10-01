import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BrandPanel } from "@/components/brand/brand-panel";
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
    <div className="flex min-h-screen">
      {/* Form column */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-1/2 lg:px-16">
        <div className="flex items-center justify-between">
          <Wordmark withMark href={localizedHref(locale, "/")} />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(dict.footer.rights, { year: new Date().getFullYear() })}
        </p>
      </div>

      {/* Brand panel — ink, value prop (Mobbin: split-screen auth). Shared with
          onboarding so signup → setup reads as one flow. */}
      <BrandPanel dict={dict} homeHref={localizedHref(locale, "/")} />
    </div>
  );
}
