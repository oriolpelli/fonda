import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AccountLanguageForm } from "@/components/dashboard/account-language-form";
import { GmNameForm } from "@/components/dashboard/gm-name-form";
import { SettingsGroupHeader } from "@/components/dashboard/settings-nav";
import { localizedHref } from "@/lib/i18n/navigation";
import { settingsGroups } from "@/lib/settings-groups";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.settings.groups.account.label };
}

/**
 * Settings → Account: the settings that are about the person using Fondas
 * rather than the property — the language the product speaks, and the name the
 * briefings and drafts are signed with.
 */
export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("gm_name, default_locale")
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <SettingsGroupHeader
        title={dict.settings.groups.account.label}
        desc={dict.settings.groups.account.desc}
        groups={settingsGroups(locale, dict)}
        active="account"
        navLabel={dict.settings.groups.navLabel}
        backHref={localizedHref(locale, "/dashboard/settings")}
        backLabel={dict.settings.groups.back}
      />

      <AccountLanguageForm defaultLocale={settings?.default_locale ?? "en"} />

      <GmNameForm gmName={settings?.gm_name ?? ""} />
    </div>
  );
}
