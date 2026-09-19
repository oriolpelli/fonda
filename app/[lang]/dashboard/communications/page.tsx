import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadInbox, UNHANDLED_STATUSES } from "@/lib/inbox";
import { phasesFor } from "./window";

/**
 * Communications is two windows now (APP_UX_PROPOSAL.md §5.3), so this route
 * has no page of its own — it works out which window you meant and forwards.
 *
 * It stays a real route rather than becoming a redirect in next.config because
 * the answer depends on data: which window has work in it, and for a deep link,
 * which window owns that particular message.
 *
 * THE QUERY STRING IS LOAD-BEARING. `/dashboard/communications?email=<id>` is a
 * live deep link — the morning brief, the "needs a reply" card, to-do items and
 * the chat's draft hand-off all point at it, and old ones stay in inboxes and
 * bookmarks for as long as anybody's mail client keeps them. Every parameter is
 * carried across, not just the one this function reads.
 */
export default async function CommunicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const { locale } = await loadDictionary(lang);
  const inbox = await loadInbox();

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") forwarded.set(key, value);
    else if (Array.isArray(value)) for (const v of value) forwarded.append(key, v);
  }

  const requested = typeof query.email === "string" ? query.email : undefined;
  const target = requested
    ? inbox.emails.find((e) => e.id === requested)
    : undefined;

  let window: "in-house" | "upcoming";

  if (target) {
    // Send a deep link to the window that actually owns the message, so it can
    // be selected on arrival. An id we cannot see belongs to another hotel or
    // no longer exists; it falls through to the no-link path below rather than
    // being reported, so the parameter can't be used to probe for ids.
    window = target.stayPhase === "in_house" ? "in-house" : "upcoming";
    // post_stay and unmatched live behind Upcoming's chip, which is off by
    // default — so a link to one of those has to turn the chip on, or it would
    // arrive at a window that does not contain the message it named.
    if (!phasesFor("upcoming", false).includes(target.stayPhase)) {
      if (window === "upcoming") forwarded.set("past", "1");
    }
  } else {
    // No particular message: go where the work is. In-house only wins when it
    // has unanswered mail and Upcoming does not — otherwise Upcoming, which is
    // the bigger window and the one a GM works through in the morning.
    const unanswered = (phase: "in-house" | "upcoming") =>
      inbox.emails.some(
        (e) =>
          (UNHANDLED_STATUSES as readonly string[]).includes(e.status) &&
          (phase === "in-house"
            ? e.stayPhase === "in_house"
            : e.stayPhase !== "in_house")
      );
    window =
      unanswered("in-house") && !unanswered("upcoming")
        ? "in-house"
        : "upcoming";
  }

  const search = forwarded.toString();
  redirect(
    localizedHref(
      locale,
      `/dashboard/communications/${window}${search ? `?${search}` : ""}`
    )
  );
}
