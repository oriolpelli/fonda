import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * Parked to the roadmap (APP_UX_PROPOSAL.md §2.4, deletion 0): the stub page
 * is gone, its lib/roadmap.ts row stays and feeds the customize panel.
 */
export default async function TeamActivityPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localizedHref(lang, "/dashboard"));
}
