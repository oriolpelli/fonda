import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { loadDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import { EmailInbox } from "@/components/dashboard/email-inbox";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { InboxStats } from "@/components/dashboard/inbox-stats";
import { ContextPaneSkeleton } from "@/components/dashboard/context-pane-skeleton";
import { GuestContextPanel } from "@/components/dashboard/guest-context-panel";
import { WhatsAppConnectButton } from "@/components/dashboard/whatsapp-connect-button";
import { getHotel } from "@/lib/auth";
import { loadGuestContexts, type GuestContext } from "@/lib/guest-context";
import { loadInbox, type InboxEmail } from "@/lib/inbox";
// Server-readable sort contract — deliberately NOT imported from the client
// inbox module, whose exports become throwing client references here.
import { byDate, byUrgency } from "@/lib/email-urgency";
import { isSortMode, SORT_COOKIE } from "@/lib/inbox-sort";
import {
  DEFAULT_QUEUE,
  isQueueMode,
  matchesQueue,
  QUEUE_COOKIE,
} from "@/lib/inbox-queue";
import { hotelToday, localDateOf } from "@/lib/stay-phase";
import { timed } from "@/lib/timing";
import type { Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * The body both Communications windows share (APP_UX_PROPOSAL.md §5.3).
 *
 * The two routes differ by which stay phases they own and by one card each, so
 * everything else — the Gmail first-run gate, the stats row, the server-read
 * sort cookie, the `?email=` deep link — lives here once. The pages are thin on
 * purpose: two copies of this would drift, and the sort cookie in particular
 * has to stay server-read on BOTH or the list flips after paint on one of them.
 */

/** Which window is being rendered. */
export type CommsWindowKey = "in_house" | "upcoming";

/**
 * The phases each window owns.
 *
 * Upcoming is the one that needs explaining. It owns future arrivals, and it is
 * also where `post_stay` and `unmatched` go — a guest who checked out and a
 * supplier who never booked are neither in-house nor upcoming, and they have to
 * be reachable somewhere or they are simply lost. They are held behind a chip
 * that is off by default, so the window reads as "who is coming" until you ask
 * it for everything else.
 */
export function phasesFor(
  windowKey: CommsWindowKey,
  includePast: boolean
): InboxEmail["stayPhase"][] {
  if (windowKey === "in_house") return ["in_house"];
  return includePast
    ? ["pre_arrival", "post_stay", "unmatched"]
    : ["pre_arrival"];
}

export async function CommunicationsWindow({
  lang,
  windowKey,
  query,
}: {
  lang: string;
  windowKey: CommsWindowKey;
  query: { [key: string]: string | string[] | undefined };
}) {
  const { locale, dict } = await loadDictionary(lang);
  // The hotel row is the request's one hotels read (lib/auth.ts), shared with
  // the inbox loader and the guest-context panes. It used to be read again
  // here, after the inbox had finished (performance audit §4.3).
  const [inbox, cookieStore, hotel] = await Promise.all([
    timed("comms.inbox", loadInbox()),
    cookies(),
    timed("comms.hotel", getHotel()),
  ]);

  // This inbox is fed by Gmail, not the PMS — a hotel can be fully synced and
  // still have nothing here. "No guest messages right now" would be a lie when
  // the real answer is that no mailbox is connected yet.
  const inboxConnected = Boolean(hotel?.gmail_email);

  // "Done today" is a hotel-local question, so the hotel's today and its
  // timezone both cross to the client rather than the browser's being assumed.
  const timeZone = hotel?.timezone || "UTC";
  const today = hotelToday(timeZone);

  const includePast = query.past === "1";
  const phases = phasesFor(windowKey, includePast);
  const emails = inbox.emails.filter((e) => phases.includes(e.stayPhase));

  // Read the remembered sort AND queue server-side so neither flips after
  // paint. Two cookies, one property: whatever the server renders is what the
  // client starts from.
  const saved = cookieStore.get(SORT_COOKIE)?.value;
  const initialSort = isSortMode(saved) ? saved : "date";
  const savedQueue = cookieStore.get(QUEUE_COOKIE)?.value;
  const rememberedQueue = isQueueMode(savedQueue) ? savedQueue : DEFAULT_QUEUE;

  // `?email=<id>` opens a specific message. Matched against THIS window's
  // filtered list, not the whole inbox: the parent route is what works out
  // which window a message belongs to, so an id that survives to here and is
  // absent is one that belongs to the other window, and silently selecting
  // nothing is the right outcome.
  const requested = typeof query.email === "string" ? query.email : undefined;
  const target = emails.find((e) => e.id === requested);
  const initialSelectedId = target ? requested : undefined;

  /**
   * A deep link outranks the remembered queue.
   *
   * The parent route works out which WINDOW owns a message, but the queue is a
   * second filter on top of that, and the default queue is "Needs you". A link
   * to a message you already replied to — which is most of what the morning
   * brief links at — would arrive at the right window with the message filtered
   * out of the list, and the reading pane showing something the list does not
   * offer. Falling back to "all" is the one queue guaranteed to contain it.
   */
  const initialQueue =
    target &&
    !matchesQueue(target, rememberedQueue, today, (sentAt) =>
      localDateOf(timeZone, sentAt)
    )
      ? "all"
      : rememberedQueue;

  /**
   * The guest-context panes, rendered here on the server and handed to the
   * inbox as slots (§5.3). Built from THIS window's filtered list, and keyed by
   * guest, so a conversation of ten messages costs one pane.
   *
   * This is the whole reason the pane is a Server Component: the nationality,
   * language and party size it shows never enter the client payload.
   *
   * Streamed (performance audit §4.4): the list and the open message no longer
   * wait for the guests' details. Each slot is a Suspense boundary over the
   * same one read, so the panes fill in together a beat after the inbox.
   */
  //
  // Only for the messages that travel complete (below): a pane is ~1.8 KB of
  // rendered markup, and one per guest in a 200-message window was 64% of the
  // page (S3). Any other message's pane is rendered on demand when it is
  // opened on a screen wide enough to show it (loadContextPane).
  const complete = completeTextIds(emails, initialSelectedId);
  const paneEmails = emails.filter((email) => complete.has(email.id));
  const contexts = timed("comms.contexts", loadGuestContexts(paneEmails));
  // Observed here; each pane awaits the same promise and handles it there.
  contexts.catch(() => {});
  const contextKeys = [...new Set(paneEmails.map((email) => email.contextKey))];
  const contextPanes = Object.fromEntries(
    contextKeys.map((key) => [
      key,
      <Suspense key={key} fallback={<ContextPaneSkeleton />}>
        <StreamedContextPane
          contextKey={key}
          contexts={contexts}
          dict={dict}
          locale={locale}
        />
      </Suspense>,
    ])
  );

  // What the client list carries. Only the messages a GM is about to open
  // travel complete: the top of "Needs you" by urgency and by date, and a
  // deep-linked message. Everything else carries the first lines of its body
  // and draft, and the inbox fetches the rest on hover or open
  // (app/api/emails/[id]). A sent message never needs its draft at all. The
  // page used to carry every body and draft of the window's share of 200
  // messages, ~1.5 MB on a busy test hotel (performance audit §4.2; S3).
  const listEmails = emails.map((email) =>
    email.status === "sent"
      ? toSentPreview(email)
      : complete.has(email.id)
        ? email
        : toOpenPreview(email)
  );

  const isInHouse = windowKey === "in_house";
  const title = isInHouse
    ? dict.communications.inHouseTitle
    : dict.communications.upcomingTitle;
  const emptyMessage = isInHouse
    ? dict.communications.inHouseEmpty
    : dict.communications.upcomingEmpty;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.communications.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {inboxConnected ? (
          <InboxStats
            dict={dict}
            draftsReady={inbox.draftsReady}
            sentToday={inbox.sentToday}
            avgResponseHours={inbox.avgResponseHours}
          />
        ) : null}
      </div>

      {/* In-house is honestly half a channel until WhatsApp lands, so it says
          so ABOVE the list rather than instead of it: in-stay email is real
          and still has to be answered. */}
      {isInHouse ? (
        <FirstRunState
          title={dict.communications.whatsappTitle}
          body={dict.communications.whatsappBody}
          ctaSlot={
            <WhatsAppConnectButton
              label={dict.communications.whatsappCta}
              requestedLabel={dict.communications.whatsappRequested}
            />
          }
        />
      ) : null}

      {/* The past-stays chip. A link, not a toggle button: the state lives in
          the URL so it is shareable, survives a reload, and is read on the
          server — the same property the sort cookie has, for the same reason. */}
      {!isInHouse ? (
        <div>
          <Link
            href={localizedHref(
              locale,
              includePast
                ? "/dashboard/communications/upcoming"
                : "/dashboard/communications/upcoming?past=1"
            )}
            aria-pressed={includePast}
            className="inline-flex items-center rounded-full border border-[var(--fonda-border-2)] px-3 py-1 font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-2)] transition-colors hover:text-foreground aria-pressed:bg-[var(--fonda-inset)] aria-pressed:text-foreground"
          >
            {includePast
              ? dict.communications.hidePast
              : dict.communications.showPast}
          </Link>
        </div>
      ) : null}

      {!inboxConnected && emails.length === 0 ? (
        <FirstRunState
          title={dict.communications.presyncTitle}
          body={dict.communications.presyncBody}
          ctaLabel={dict.communications.presyncCta}
          ctaHref="/connect/gmail"
          external
          // The screen's one gradient is already spent on the WhatsApp card in
          // the In-house window (FONDA_SANA_REDESIGN.md §7.2).
          tone={isInHouse ? "plain" : "gradient"}
        />
      ) : (
        <EmailInbox
          emails={listEmails}
          emptyMessage={emptyMessage}
          emptyIcon="emails"
          initialSort={initialSort}
          initialQueue={initialQueue}
          initialSelectedId={initialSelectedId}
          today={today}
          timeZone={timeZone}
          contextPanes={contextPanes}
        />
      )}
    </div>
  );
}

/** Characters of a body that travel with the list when it is a preview. */
const BODY_PREVIEW_CHARS = 280;

/**
 * Characters of a draft that travel with the list when it is a preview: what
 * the bulk-send dialog shows of each (firstLineOf), so the dialog reads the
 * same either way. The editor never shows a preview — it waits for the whole
 * draft (email-inbox.tsx), so a cut-off reply can't be sent.
 */
const DRAFT_PREVIEW_CHARS = 240;

/**
 * How many open messages travel complete from the top of each sort. A GM
 * works down "Needs you" from the top, by urgency or by date, and the list
 * shows about ten rows on a laptop. Fifteen of each covers the first screen in
 * either sort with room to spare; anything further down is fetched on hover,
 * and the next message is fetched as soon as one is opened.
 */
const COMPLETE_ROWS = 15;

/** The open messages that travel with their full body and draft. */
function completeTextIds(
  emails: InboxEmail[],
  selectedId: string | undefined
): Set<string> {
  const open = emails.filter(
    (e) => e.status === "pending" || e.status === "needs_attention"
  );
  const ids = new Set<string>();
  for (const e of [...open].sort(byUrgency).slice(0, COMPLETE_ROWS)) ids.add(e.id);
  for (const e of [...open].sort(byDate).slice(0, COMPLETE_ROWS)) ids.add(e.id);
  if (selectedId) ids.add(selectedId);
  return ids;
}

/** The first `n` characters, never cutting an emoji (a surrogate pair) in two. */
function cut(text: string, n: number): string {
  let end = n;
  if (/[\uD800-\uDBFF]/.test(text[end - 1] ?? "")) end -= 1;
  return text.slice(0, end);
}

/**
 * A sent message as the list carries it: the first lines of its body, no
 * draft, and a flag saying the rest is a fetch away.
 */
function toSentPreview(email: InboxEmail): InboxEmail & { body_truncated: boolean } {
  const body = email.body ?? null;
  const truncated = body !== null && body.length > BODY_PREVIEW_CHARS;
  return {
    ...email,
    body: truncated ? cut(body, BODY_PREVIEW_CHARS) : body,
    draft_reply: null,
    body_truncated: truncated,
  };
}

/**
 * An open (or ignored) message beyond the top of the queues: the first lines
 * of its body and draft, each flagged when there is more. Enough for the list,
 * the bulk-send dialog and "approve all"'s count; the inbox fetches the rest
 * before the editor or Send appears.
 */
function toOpenPreview(email: InboxEmail): InboxEmail & {
  body_truncated: boolean;
  draft_truncated: boolean;
} {
  const body = email.body ?? null;
  const draft = email.draft_reply ?? null;
  const bodyCut = body !== null && body.length > BODY_PREVIEW_CHARS;
  const draftCut = draft !== null && draft.length > DRAFT_PREVIEW_CHARS;
  return {
    ...email,
    body: bodyCut ? cut(body, BODY_PREVIEW_CHARS) : body,
    draft_reply: draftCut ? cut(draft, DRAFT_PREVIEW_CHARS) : draft,
    body_truncated: bodyCut,
    draft_truncated: draftCut,
  };
}

/** One guest's pane, once the window's single guest-context read lands. */
async function StreamedContextPane({
  contextKey,
  contexts,
  dict,
  locale,
}: {
  contextKey: string;
  contexts: Promise<Map<string, GuestContext>>;
  dict: Dictionary;
  locale: Locale;
}) {
  const context = (await contexts).get(contextKey);
  return context ? (
    <GuestContextPanel context={context} dict={dict} locale={locale} />
  ) : null;
}

/** The pane's frame while it streams in — same width, same well, no data. */
