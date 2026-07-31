import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BrandPanel } from "@/components/brand/brand-panel";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { localizedHref } from "@/lib/i18n/navigation";
import { t } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome" };

/**
 * The setup wizard's shell — the same split-screen as the auth routes, so
 * signing up and setting up read as one continuous flow.
 *
 * Signed-in-only. Each step page then decides, from the hotel's actual state,
 * whether it is the right step to be on (see app/[lang]/onboarding/page.tsx).
 */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col px-6 py-8 lg:w-1/2 lg:px-16">
        <div className="flex items-center justify-between">
          <Wordmark href={localizedHref(locale, "/onboarding")} />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(dict.footer.rights, { year: new Date().getFullYear() })}
        </p>
      </div>

      <BrandPanel dict={dict} homeHref={localizedHref(locale, "/")} />
    </div>
  );
}
