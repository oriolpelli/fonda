import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * Which parts of the dictionary reach the browser, and where.
 *
 * Until 1 Oct every page shipped the whole dictionary (about 55 KB of JSON in
 * English, more in Spanish and Catalan) to a client provider. That was 58 KB
 * of an 86 KB login page, even though the browser reads a handful of
 * namespaces (docs/audits/2026-10-01-performance.md §4.11, prompt P9). Now
 * each area sends only what its client components read:
 *
 * - every page: `PUBLIC_CLIENT_NAMESPACES`, from the `[lang]` layout;
 * - onboarding adds `ONBOARDING_CLIENT_NAMESPACES`, from its layout;
 * - the dashboard adds `DASHBOARD_CLIENT_NAMESPACES`, from its layout.
 *
 * Server components are unaffected: they still get the full dictionary from
 * `loadDictionary`.
 *
 * WHEN A CLIENT COMPONENT STARTS READING A NEW NAMESPACE, add it to the list
 * for the area that renders it. TypeScript rejects a namespace that is on no
 * list at all. `npm run check:client-dict` (part of the gate) rejects one that
 * is on the wrong list, and in development the provider throws a plain error
 * naming the namespace.
 */

export const PUBLIC_CLIENT_NAMESPACES = [
  "common",
  "error",
  "auth",
  "footer",
  "newsletterConfirm",
  "newsletterUnsubscribe",
  "sampleBrief",
] as const satisfies readonly (keyof Dictionary)[];

export const ONBOARDING_CLIENT_NAMESPACES = [
  "onboarding",
  "briefing",
  "settings",
] as const satisfies readonly (keyof Dictionary)[];

export const DASHBOARD_CLIENT_NAMESPACES = [
  "ai",
  "arrivals",
  "askYourHotel",
  "briefing",
  "bulkSend",
  "checkin",
  "emails",
  "guests",
  "home",
  "onboarding",
  "palette",
  "roadmap",
  "settings",
  "sidebar",
  "sync",
] as const satisfies readonly (keyof Dictionary)[];

export type ClientNamespace =
  | (typeof PUBLIC_CLIENT_NAMESPACES)[number]
  | (typeof ONBOARDING_CLIENT_NAMESPACES)[number]
  | (typeof DASHBOARD_CLIENT_NAMESPACES)[number];

/** What a client component can read through `useDictionary()`. */
export type ClientDictionary = Pick<Dictionary, ClientNamespace>;

/** Every namespace on any list, for the development guard in the provider. */
export const CLIENT_NAMESPACES: ReadonlySet<string> = new Set<string>([
  ...PUBLIC_CLIENT_NAMESPACES,
  ...ONBOARDING_CLIENT_NAMESPACES,
  ...DASHBOARD_CLIENT_NAMESPACES,
]);

/** The named namespaces of `dict`, and nothing else. */
export function pickNamespaces<K extends keyof Dictionary>(
  dict: Dictionary,
  keys: readonly K[]
): Pick<Dictionary, K> {
  const out = {} as Pick<Dictionary, K>;
  for (const key of keys) out[key] = dict[key];
  return out;
}
