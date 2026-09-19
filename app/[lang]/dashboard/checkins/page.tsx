import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { arrivalsHref } from "@/lib/i18n/navigation";

/**
 * Check-ins is Arrivals & departures now (APP_UX_PROPOSAL.md §5.2) — the page
 * covers the whole day, both ends of it, so the route says what it lists. This
 * stub survives so bookmarks, the Morning Brief's older links and anything a GM
 * pinned still land there instead of 404ing.
 *
 * The query string travels with them: `?tab=departures` is the one parameter
 * the new page reads, and dropping it would silently send a departures link to
 * the arrivals tab.
 */
export default async function CheckinsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) for (const v of value) query.append(key, v);
    else if (value !== undefined) query.set(key, value);
  }
  const suffix = query.toString();

  redirect(`${arrivalsHref(lang)}${suffix ? `?${suffix}` : ""}`);
}
