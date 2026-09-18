import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Reputation is shared between both pillars (APP_UX_PROPOSAL.md §2.5), so it
 * sits under neither one's path: it lives at /dashboard/reputation now.
 */
export default async function FrontDeskReputationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localizedHref(lang, "/dashboard/reputation"));
}
