import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * A per-section dashboard is a worse version of a customizable Home, so all
 * six of them redirect to /dashboard (APP_UX_PROPOSAL.md §2.4, deletion 1).
 */
export default async function FrontDeskPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localizedHref(lang, "/dashboard"));
}
