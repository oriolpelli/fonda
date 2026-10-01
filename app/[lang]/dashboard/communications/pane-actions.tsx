"use server";

import type { ReactNode } from "react";

import { getDictionary } from "@/app/[lang]/dictionaries";
import { GuestContextPanel } from "@/components/dashboard/guest-context-panel";
import { loadGuestContexts } from "@/lib/guest-context";
import { isLocale } from "@/lib/i18n/config";
import { loadInboxEmail } from "@/lib/inbox";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One message's guest-context pane, rendered on the server.
 *
 * The Communications window sends panes only for the messages it sends
 * complete (window.tsx); the inbox asks for any other one here when it is
 * opened on a screen wide enough to show the pane. Returned as rendered
 * markup — the same GuestContextPanel, the same data path — so a guest's
 * nationality, language and party size still never travel as client props
 * (APP_UX_PROPOSAL.md §5.3). Read through the user's RLS client: another
 * hotel's message, or a made-up id, renders nothing.
 */
export async function loadContextPane(
  lang: string,
  emailId: string
): Promise<ReactNode> {
  if (!isLocale(lang) || typeof emailId !== "string" || !UUID.test(emailId)) {
    return null;
  }
  const email = await loadInboxEmail(emailId);
  if (!email) return null;
  const [dict, contexts] = await Promise.all([
    getDictionary(lang),
    loadGuestContexts([email]),
  ]);
  const context = contexts.get(email.contextKey);
  return context ? (
    <GuestContextPanel context={context} dict={dict} locale={lang} />
  ) : null;
}
