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

  const asideLines = [
    dict.authAside.line1,
    dict.authAside.line2,
    dict.authAside.line3,
  ];

  return (
    <div className="flex min-h-screen">
      {/* Form column */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-1/2 lg:px-16">
        <div className="flex items-center justify-between">
          <Wordmark href={localizedHref(locale, "/")} />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(dict.footer.rights, { year: new Date().getFullYear() })}
        </p>
      </div>

      {/* Brand panel — ink, value prop (Mobbin: split-screen auth) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-ink p-16 lg:flex">
        <Wordmark
          href={localizedHref(locale, "/")}
          className="text-[var(--fonda-text-inv)]"
        />
        <div>
          <p className="max-w-[18ch] text-[clamp(1.75rem,2.4vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--fonda-text-inv)]">
            {dict.authAside.headline}
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {asideLines.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  className="mt-[9px] block size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-accent)]"
                  aria-hidden
                />
                <span className="text-[15px] leading-[1.5] text-[color-mix(in_srgb,white_72%,transparent)]">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,white_45%,transparent)]">
          {dict.hero.badge}
        </span>
      </div>
    </div>
  );
}
