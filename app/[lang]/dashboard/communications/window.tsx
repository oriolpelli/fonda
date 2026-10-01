import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { loadDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import { EmailInbox } from "@/components/dashboard/email-inbox";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { InboxStats } from "@/components/dashboard/inbox-stats";
import { GuestContextPanel } from "@/components/dashboard/guest-context-panel";
import { WhatsAppConnectButton } from "@/components/dashboard/whatsapp-connect-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getHotel } from "@/lib/auth";
import { loadGuestContexts, type GuestContext } from "@/lib/guest-context";
import { loadInbox, type InboxEmail } from "@/lib/inbox";
// Server-readable sort contract — deliberately NOT imported from the client
// inbox module, whose exports become throwing client references here.
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
  const contexts = timed("comms.contexts", loadGuestContexts(emails));
  // Observed here; each pane awaits the same promise and handles it there.
  contexts.catch(() => {});
  const contextKeys = [...new Set(emails.map((email) => email.contextKey))];
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

  // What the client list carries. A sent message shows its text only when it
  // is opened, and never its draft (the reading pane shows neither for a sent
  // reply), so it travels as a preview and the full text is fetched on open
  // (loadEmailBody). Mail still waiting on someone — and ignored mail, which
  // can still be sent — keeps everything, so the work a GM actually does is
  // never a fetch away. The page payload used to carry every body and draft of
  // the window's share of 200 messages (performance audit §4.2).
  const listEmails = emails.map((email) =>
    email.status === "sent" ? toSentPreview(email) : email
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

/** Characters of a sent message's body that travel with the list. */
const SENT_PREVIEW_CHARS = 280;

/**
 * A sent message as the list carries it: the first lines of its body, no
 * draft, and a flag saying the rest is a fetch away. The inbox loads the full
 * text when the message is opened.
 */
function toSentPreview(
  email: InboxEmail
): InboxEmail & { body_truncated: boolean } {
  const body = email.body ?? null;
  const truncated = body !== null && body.length > SENT_PREVIEW_CHARS;
  // Never cut between the two halves of an emoji (a surrogate pair).
  let cut = SENT_PREVIEW_CHARS;
  if (truncated && /[\uD800-\uDBFF]/.test(body[cut - 1])) cut -= 1;
  return {
    ...email,
    body: truncated ? body.slice(0, cut) : body,
    draft_reply: null,
    body_truncated: truncated,
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
function ContextPaneSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="flex w-[280px] shrink-0 flex-col gap-5 border-l border-[var(--fonda-border-2)] bg-[var(--fonda-surface)] p-5"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full bg-inset" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3 bg-inset" />
          <Skeleton className="h-3 w-1/3 bg-inset" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full bg-inset" />
        <Skeleton className="h-3 w-5/6 bg-inset" />
        <Skeleton className="h-3 w-2/3 bg-inset" />
      </div>
    </aside>
  );
}
