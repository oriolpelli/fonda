import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Settings is a short menu of categories, not one long page. This is the single
 * place that decides what those categories are — the menu at
 * /dashboard/settings, the sub-nav on every group page, and the group routes
 * themselves all read from here.
 *
 * Each key doubles as the route segment (`/dashboard/settings/<key>`) and as
 * the icon key in the menu, so adding a group means: a row in `SETTINGS_GROUPS`,
 * a `settings.groups.<key>` block in all three dictionaries, an icon in
 * `app/[lang]/dashboard/settings/page.tsx`, and a page at that segment.
 */
export const SETTINGS_GROUPS = ["connections", "hotel", "account"] as const;

export type SettingsGroupKey = (typeof SETTINGS_GROUPS)[number];

export interface SettingsGroup {
  key: SettingsGroupKey;
  /** Locale-prefixed route for the group's page. */
  href: string;
  label: string;
  /** One line naming what lives in the group. */
  desc: string;
}

/** The group's route, without a dictionary lookup — for redirects. */
export function settingsGroupHref(
  locale: Locale,
  key: SettingsGroupKey
): string {
  return localizedHref(locale, `/dashboard/settings/${key}`);
}

/** Every group, in menu order, labelled in the caller's language. */
export function settingsGroups(
  locale: Locale,
  dict: Dictionary
): SettingsGroup[] {
  return SETTINGS_GROUPS.map((key) => ({
    key,
    href: settingsGroupHref(locale, key),
    label: dict.settings.groups[key].label,
    desc: dict.settings.groups[key].desc,
  }));
}
