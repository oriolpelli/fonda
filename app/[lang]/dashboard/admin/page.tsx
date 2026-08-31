import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { settingsGroupHref } from "@/lib/settings-groups";

/**
 * There is no Admin page any more — its sync view lives in
 * Settings → Connections, and the Admin item is gone from the sidebar. This
 * route survives only so bookmarks and old links land there instead of 404ing.
 *
 * The owner-only gate moved with the content: a non-owner arrives at
 * Connections and simply doesn't see the sync section.
 */
export default async function AdminPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(settingsGroupHref(lang, "connections"));
}
