import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Concierge is absorbed by Communications › In-house (APP_UX_PROPOSAL.md §2.5).
 * That window shipped in W6, so this now lands on it directly instead of on
 * the unscoped inbox. Kept as a redirect, not deleted: the route was in the nav
 * for months and the links are still in people's bookmarks.
 */
export default async function ConciergePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localizedHref(lang, "/dashboard/communications/in-house"));
}
