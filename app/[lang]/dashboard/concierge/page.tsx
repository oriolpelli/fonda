import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Concierge is absorbed by Communications › In-house (APP_UX_PROPOSAL.md §2.5).
 * That window ships in W6; until then the unscoped inbox is the right home.
 */
export default async function ConciergePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localizedHref(lang, "/dashboard/communications"));
}
