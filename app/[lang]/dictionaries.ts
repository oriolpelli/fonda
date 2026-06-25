import "server-only";

import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n/config";

// `en.json` is the canonical shape; `es`/`ca` are type-checked against it.
import type en from "@/dictionaries/en.json";

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  es: () => import("@/dictionaries/es.json").then((m) => m.default),
  ca: () => import("@/dictionaries/ca.json").then((m) => m.default),
} satisfies Record<Locale, () => Promise<unknown>>;

export type Dictionary = typeof en;

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]() as Promise<Dictionary>;

/**
 * Validates a route `lang` param (404 if unsupported) and returns the locale
 * plus its dictionary. Convenience for server pages that receive `params`.
 */
export async function loadDictionary(
  lang: string
): Promise<{ locale: Locale; dict: Dictionary }> {
  if (!isLocale(lang)) notFound();
  return { locale: lang, dict: await getDictionary(lang) };
}
