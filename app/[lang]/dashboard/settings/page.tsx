import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Plug,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { t } from "@/lib/i18n/format";
import {
  settingsGroupHref,
  settingsGroups,
  type SettingsGroupKey,
} from "@/lib/settings-groups";
import { createClient } from "@/lib/supabase/server";

/** Menu icons. Keys match `SETTINGS_GROUPS` — add a group, add an icon. */
const GROUP_ICONS: Record<SettingsGroupKey, LucideIcon> = {
  connections: Plug,
  hotel: Building2,
  account: UserRound,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.settings.title };
}

/**
 * Settings is a menu of three groups, not one long page — opening it shows what
 * the categories are and nothing else. The forms live one click in, under
 * settings/{connections,hotel,account}.
 */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ apaleo?: string; gmail?: string; ingested?: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const { apaleo, gmail, ingested } = await searchParams;

  // The OAuth callbacks land on /dashboard/settings with a status query. The
  // connectors — and so the banner that reports on them — now live in the
  // Connections group, so carry the query the last hop rather than dropping a
  // "connected!" message on a page that no longer shows the connection.
  if (apaleo || gmail) {
    const query = new URLSearchParams();
    if (apaleo) query.set("apaleo", apaleo);
    if (gmail) query.set("gmail", gmail);
    if (ingested) query.set("ingested", ingested);
    redirect(`${settingsGroupHref(locale, "connections")}?${query}`);
  }

  const supabase = await createClient();
  const { data: hotel } = await supabase.from("hotels").select("name").single();

  const groups = settingsGroups(locale, dict);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.settings.title}
        </h1>
        <p className="text-muted-foreground">
          {t(dict.settings.groups.indexDesc, {
            hotel: hotel?.name ?? dict.settings.fallbackHotel,
          })}
        </p>
      </div>

      <nav
        aria-label={dict.settings.groups.navLabel}
        className="flex flex-col gap-3"
      >
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.key];
          return (
            <Link
              key={group.key}
              href={group.href}
              className="group flex items-center gap-4 rounded-[16px] bg-card p-5"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--fonda-inset)] text-foreground"
              >
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold tracking-[-0.01em] text-foreground">
                  {group.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {group.desc}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                strokeWidth={1.5}
                className="ml-auto size-[18px] shrink-0 text-[var(--fonda-text-3)] transition-colors duration-[180ms] group-hover:text-foreground"
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
