import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadEmailStayPhase, loadInboxBadges } from "@/lib/inbox";
import { timed } from "@/lib/timing";
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

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") forwarded.set(key, value);
    else if (Array.isArray(value)) for (const v of value) forwarded.append(key, v);
  }

  // What it costs to decide. This used to load the whole inbox — 200 messages
  // with their bodies, drafts and guest context — and then the window loaded
  // it all again (docs/audits/2026-10-01-performance.md §3). Now a deep link
  // reads the one message it names, and a bare visit asks the badge question,
  // which the sidebar has usually already answered in this request.
  const requested = typeof query.email === "string" ? query.email : undefined;
  const targetPhase = requested
    ? await timed("comms.redirect.target", loadEmailStayPhase(requested))
    : null;

  let window: "in-house" | "upcoming";

  if (targetPhase) {
    // Send a deep link to the window that actually owns the message, so it can
    // be selected on arrival. An id we cannot see belongs to another hotel or
    // no longer exists; it falls through to the no-link path below rather than
    // being reported, so the parameter can't be used to probe for ids.
    window = targetPhase === "in_house" ? "in-house" : "upcoming";
    // post_stay and unmatched live behind Upcoming's chip, which is off by
    // default — so a link to one of those has to turn the chip on, or it would
    // arrive at a window that does not contain the message it named.
    if (!phasesFor("upcoming", false).includes(targetPhase)) {
      if (window === "upcoming") forwarded.set("past", "1");
    }
  } else {
    // No particular message: go where the work is. In-house only wins when it
    // has unanswered mail and Upcoming does not — otherwise Upcoming, which is
    // the bigger window and the one a GM works through in the morning.
    //
    // Asked of the sidebar badges, which count exactly "unanswered, by window"
    // (lib/inbox.ts — UNHANDLED_STATUSES says this route and the badge must ask
    // the same question; now they are literally one question). Badges fail soft
    // to zero, which lands on Upcoming, as an empty inbox always did.
    const badges = await timed("comms.redirect.badges", loadInboxBadges());
    window =
      badges.inHouse.count > 0 && badges.upcoming.count === 0
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
