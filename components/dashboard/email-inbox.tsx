"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  approveAllStandard,
  flagEmail,
  ignoreEmail,
  sendReply,
} from "@/app/[lang]/dashboard/communications/actions";
import { loadContextPane } from "@/app/[lang]/dashboard/communications/pane-actions";
import {
  BulkSendDialog,
  firstLineOf,
  firstNameOf,
  type BulkSendItem,
} from "@/components/dashboard/bulk-send-dialog";
import { AiReportButton } from "@/components/dashboard/ai-report-button";
import { ContextPaneSkeleton } from "@/components/dashboard/context-pane-skeleton";
import { EmptyState, type EmptyStateIcon } from "@/components/dashboard/empty-state";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  byDate,
  byUrgency,
  computeUrgency,
  type Urgency,
} from "@/lib/email-urgency";
import {
  isSortMode,
  SORT_COOKIE,
  SORT_MODES,
  type SortMode,
} from "@/lib/inbox-sort";
import {
  DEFAULT_QUEUE,
  isQueueMode,
  matchesQueue,
  QUEUE_COOKIE,
  QUEUE_MODES,
  type QueueMode,
} from "@/lib/inbox-queue";
import { urgencyNoteFor } from "@/lib/urgency-note";
import { intlLocale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * The guest inbox: review → edit → send, with a rule-based urgency note per
 * message and a sort toggle. Kept parameterized (empty state, icon, initial
 * sort) so the parked Concierge route can reuse it if in-house messaging comes
 * back as its own surface.
 *
 * Two layouts, one component. From `lg` up it's the classic two-pane inbox:
 * list on the left, the open message on the right. Below that it becomes
 * stacked navigation — the list, then the message, then back — which is what a
 * phone user expects anyway. Both panes stay mounted and one is hidden with
 * CSS, so switching costs no re-render of the draft.
 *
 * The split is at `lg`, not `md`: the 256px nav rail appears at `md`, which
 * would leave a 768px tablet about 110px for the message next to the 320px
 * list. Stacked is the honest layout at that width.
 */

/** Tailwind's `lg` breakpoint — kept in sync with the `lg:` classes below. */
const LG_QUERY = "(min-width: 64rem)";

/** Tailwind's `xl` breakpoint: where the guest-context column exists. */
const XL_QUERY = "(min-width: 80rem)";

export interface InboxEmail {
  id: string;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  classification: string | null;
  draft_reply: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  /** True/false once a Fondas draft is sent; null otherwise — lib/inbox.ts. */
  draft_edited: boolean | null;
  guest_name: string | null;
  booking_ref: string | null;
  arrival: string | null;
  departure: string | null;
  /** Which guest-context pane this row shows — see lib/inbox.ts. Opaque. */
  contextKey: string;
  urgency: Urgency;
  /**
   * True when `body` is only the first lines: sent messages travel as a
   * preview (communications/window.tsx), and the full text is fetched when
   * one is opened.
   */
  body_truncated?: boolean;
  /**
   * True when `draft_reply` is only its first lines (communications/window.tsx
   * sends most open messages that way). The editor and Send wait for the full
   * draft — a preview is never what goes out.
   */
  draft_truncated?: boolean;
  /**
   * Client-only: the reply is on its way. Set by the optimistic update when
   * Send is clicked, and gone once the server's own render of the row lands —
   * so the inbox can move on at once without claiming "sent" before Gmail has
   * accepted it.
   */
  sending?: boolean;
}

/**
 * What a click changes, applied to the list before the server has answered.
 * The server's render replaces it when the action returns — the same row, now
 * really sent (or flagged, or dismissed), or unchanged if the action failed.
 */
interface InboxChange {
  ids: readonly string[];
  status: "sent" | "needs_attention" | "ignored";
}

/**
 * Persists the choice for a year, so tomorrow's inbox opens the way you left
 * it. A cookie rather than localStorage so the page can read it while
 * rendering on the server and the list never flips after paint.
 *
 * The sort contract itself lives in `@/lib/inbox-sort` — a `"use client"`
 * module must not be the source of values the server reads.
 */
function rememberSort(mode: SortMode): void {
  document.cookie = `${SORT_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

/** Same contract for the queue — see `rememberSort`. */
function rememberQueue(queue: QueueMode): void {
  document.cookie = `${QUEUE_COOKIE}=${queue}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * A cookie's current value in the browser, or undefined on the server.
 *
 * Why the client reads the cookies it writes. The server reads them to render
 * (so nothing flips after paint), but since 1 Oct the client router keeps a
 * visited page for 30 s (next.config.ts staleTimes), and a cookie written here
 * does not clear that cache. Change the sort in Upcoming, click In-house within
 * 30 s, and its cached render would carry the old choice. Seeding state from
 * the cookie itself fixes that, and agrees with the server on every hard load,
 * because the server read this same cookie a moment earlier.
 */
/** A message's full body and draft, as fetched or as it arrived complete. */
interface FullText {
  body: string | null;
  draft: string | null;
  /** The list version it was fetched against (see `listVersion`). */
  version: number;
}

/**
 * Whether a cached full text belongs to the row the list shows now.
 *
 * Fetched against the current list: yes. From an earlier one, it must still
 * extend the row's preview — the server may have written a draft since (a
 * cached "no draft" must not stand in for a draft that now exists), or
 * rewritten the body. A miss means fetch again; the editor never falls back
 * to a preview.
 */
function fullTextFits(
  entry: FullText | undefined,
  email: InboxEmail,
  listVersion: number
): entry is FullText {
  if (!entry) return false;
  if (entry.version === listVersion) return true;
  if (email.body_truncated && !(entry.body ?? "").startsWith(email.body ?? "")) {
    return false;
  }
  if (
    email.draft_truncated &&
    !(entry.draft !== null && entry.draft.startsWith(email.draft_reply ?? ""))
  ) {
    return false;
  }
  return true;
}

/**
 * Remembers the messages that arrived complete. If one later comes back as a
 * preview (it fell out of the top of the queue in a new render) while it is
 * open, its cached text still extends the preview, so its editor stays exactly
 * as it is — the GM's edits included — instead of swapping to a skeleton and
 * back to the stored draft. Returns `prev` itself when nothing changed.
 */
function seedComplete(
  prev: Record<string, FullText>,
  emails: InboxEmail[],
  version: number
): Record<string, FullText> {
  let next = prev;
  for (const email of emails) {
    if (email.body_truncated || email.draft_truncated) continue;
    const known = prev[email.id];
    if (known && known.body === email.body && known.draft === email.draft_reply) {
      continue;
    }
    if (next === prev) next = { ...prev };
    next[email.id] = { body: email.body, draft: email.draft_reply, version };
  }
  return next;
}

/** `record` without the given keys — for the per-message maps below. */
function withoutIds<T>(
  record: Record<string, T>,
  ids: readonly string[]
): Record<string, T> {
  if (!ids.some((id) => id in record)) return record;
  const next = { ...record };
  for (const id of ids) delete next[id];
  return next;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

// Quiet, neutral badges (one signal only). Negative categories that need
// attention get the single destructive tint; everything else stays neutral.
const NEUTRAL = "bg-[var(--fonda-surface)] text-[var(--fonda-text-2)]";
const NEGATIVE = "bg-destructive/10 text-destructive";
const MUTED = "bg-[var(--fonda-surface)] text-[var(--fonda-text-3)]";

const BADGE_CLASS: Record<string, string> = {
  complaint: NEGATIVE,
  cancellation_request: NEGATIVE,
  irrelevant: MUTED,
};

function badgeClass(classification: string | null): string {
  if (!classification) return MUTED;
  return BADGE_CLASS[classification] ?? NEUTRAL;
}

// Urgency notes stay quiet by default. A complaint is the one red note — a
// semantic status colour, not the accent. "Arrives today" was navy in v2; v3
// keeps the accent out of chrome entirely (§10), so it leads by darkness. Kept
// in step with components/dashboard/needs-reply-card.tsx.
const NOTE_CLASS: Record<string, string> = {
  complaint: "text-destructive",
  arrives_today: "text-[var(--fonda-text)]",
  arrives_soon: "text-[var(--fonda-text-3)]",
  waiting: "text-[var(--fonda-text-3)]",
};

export function EmailInbox({
  emails,
  emptyMessage,
  emptyIcon,
  initialSort = "date",
  initialQueue = DEFAULT_QUEUE,
  initialSelectedId,
  today,
  timeZone,
  contextPanes,
}: {
  emails: InboxEmail[];
  emptyMessage: string;
  emptyIcon: EmptyStateIcon;
  initialSort?: SortMode;
  /** Read from a cookie on the server, so the list never flips after paint. */
  initialQueue?: QueueMode;
  /** Opens a specific message on first paint (the dashboard links here). */
  initialSelectedId?: string;
  /** The hotel's today (YYYY-MM-DD) — "Done today" is a hotel-local question. */
  today: string;
  /** The hotel's IANA timezone, for dating `sent_at` the way the hotel does. */
  timeZone: string;
  /**
   * Guest-context panes, already rendered on the server, keyed by
   * `InboxEmail.contextKey` (APP_UX_PROPOSAL.md §5.3).
   *
   * Server Components handed in as slots rather than data. It is why this
   * component can show a guest's nationality, language and party size without
   * any of it crossing the `"use client"` boundary at the top of this file —
   * the only thing that crosses is the opaque key. Keyed by GUEST, so a
   * conversation of ten messages reuses one pane.
   */
  contextPanes?: Record<string, ReactNode>;
}) {
  const { dict, locale } = useDictionary();
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>(() => {
    const saved = readCookie(SORT_COOKIE);
    return isSortMode(saved) ? saved : initialSort;
  });
  const [queue, setQueue] = useState<QueueMode>(() => {
    // A deep link's queue was chosen on the server to contain that message
    // (communications/window.tsx) — it outranks the remembered one.
    if (initialSelectedId) return initialQueue;
    const saved = readCookie(QUEUE_COOKIE);
    return isQueueMode(saved) ? saved : initialQueue;
  });
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? emails[0]?.id ?? null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draftRef = useRef<HTMLTextAreaElement>(null);

  /**
   * The list as the user expects it to be: `emails` with every click still in
   * flight already applied. Send, Flag and Dismiss used to hold the whole pane
   * until Gmail and the database had answered and the window had re-rendered —
   * one to three seconds of a disabled button (performance audit §4.6). Now
   * the row moves the moment it is clicked, and the server's render takes over
   * when the action returns: the same move, confirmed, or — if it failed — the
   * row back where it was, with the error above the list.
   *
   * Urgency is recomputed with the same rule the server uses, so a flagged
   * message ranks as one at once and a sent one drops out of the ranking.
   */
  const [optimisticEmails, applyChange] = useOptimistic(
    emails,
    (current: InboxEmail[], change: InboxChange): InboxEmail[] => {
      const ids = new Set(change.ids);
      const now = new Date();
      return current.map((email) => {
        // Already there — the server's render landed before the transition
        // ended. Leave its row alone rather than restamp it.
        if (!ids.has(email.id) || email.status === change.status) return email;
        const sent = change.status === "sent";
        return {
          ...email,
          status: change.status,
          sent_at: sent ? now.toISOString() : email.sent_at,
          sending: sent,
          urgency: computeUrgency({
            classification: email.classification,
            status: change.status,
            arrival: email.arrival,
            createdAt: email.created_at,
            today,
            now,
          }),
        };
      });
    }
  );

  /**
   * A reply's text while it is being sent. The editor unmounts the moment the
   * row turns "sent", so if the send then fails and the row comes back, its
   * editor would remount with the stored draft and silently drop the GM's
   * edits. It reads from here first instead. Cleared once the send succeeds.
   */
  const [unsent, setUnsent] = useState<Record<string, string>>({});

  /**
   * Messages whose last action failed, with what went wrong. Shown on the row
   * and in the reading pane until the next action on that message.
   */
  const [failures, setFailures] = useState<Record<string, string>>({});

  /**
   * What the inbox shows: the optimistic list, except that a message whose
   * action has already failed is back to its real row straight away. Without
   * this, a failed send kept reading "Sending…" until every other click still
   * in flight had finished — React settles all of them together.
   */
  const shownEmails = useMemo(() => {
    if (Object.keys(failures).length === 0) return optimisticEmails;
    const real = new Map(emails.map((email) => [email.id, email]));
    return optimisticEmails.map((email) =>
      email.id in failures ? (real.get(email.id) ?? email) : email
    );
  }, [optimisticEmails, emails, failures]);

  /** A failure still worth showing: the message is still waiting on someone. */
  function failureOf(email: InboxEmail): string | null {
    if (!(email.id in failures)) return null;
    return email.status === "pending" || email.status === "needs_attention"
      ? failures[email.id]
      : null;
  }
  /** Messages whose send has been clicked and not yet answered. */
  const inFlight = useRef(new Set<string>());
  // The bulk-send confirmation (AI_ACT_PROMPTS.md A4) and the button it
  // returns focus to.
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkButtonRef = useRef<HTMLButtonElement>(null);

  // Which pane a phone is looking at. A deep link from the dashboard names a
  // specific message, so it opens straight into it rather than into the list.
  const [mobileView, setMobileView] = useState<"list" | "detail">(
    initialSelectedId ? "detail" : "list"
  );
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Moving between the panes on a phone is a navigation, so move focus with it
  // — otherwise the page looks like it changed but a screen reader is still
  // reading the pane that just disappeared. Skipped from `lg` up, where both
  // panes are visible and nothing has navigated.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (window.matchMedia(LG_QUERY).matches) return;
    const pane = mobileView === "detail" ? detailRef.current : listRef.current;
    pane?.focus();
  }, [mobileView]);

  /**
   * The full body and draft of messages the list carries as a preview
   * (communications/window.tsx), fetched from app/api/emails/[id] when one is
   * hovered, focused or opened — usually before the click lands. Kept for the
   * page's life, so going back to a message never fetches it twice;
   * `requested` stops a double fetch while one is in flight. A GET, not a
   * Server Action: those run one at a time, and a body would wait behind every
   * Send in flight.
   */
  // Seeded with the messages that arrived complete — see `seedComplete`.
  const [fullText, setFullText] = useState<Record<string, FullText>>(() =>
    seedComplete({}, emails, 0)
  );
  /** Messages whose full text failed to load; the pane offers a retry. */
  const [loadFailed, setLoadFailed] = useState<Record<string, true>>({});
  /** In-flight fetches, keyed `id@listVersion`: one per message per list. */
  const requested = useRef(new Set<string>());

  /**
   * Which list the server last sent. Moves every time `emails` changes — a
   * Send's revalidated render, a refresh — so a cached full text can tell
   * whether it was fetched against the list on screen (`fullTextFits`).
   * Adjusted during render, React's pattern for state derived from a prop.
   */
  const [listVersion, setListVersion] = useState(0);
  const [versionedList, setVersionedList] = useState(emails);
  if (versionedList !== emails) {
    const next = listVersion + 1;
    setVersionedList(emails);
    setListVersion(next);
    setFullText((prev) => seedComplete(prev, emails, next));
  }
  // Mirrors for ensureFullText, which is stable and reads them at call time.
  // Declared before the effects that call it, so they are current first.
  const versionRef = useRef(listVersion);
  const fullTextRef = useRef(fullText);
  useEffect(() => {
    versionRef.current = listVersion;
    fullTextRef.current = fullText;
  }, [listVersion, fullText]);

  const ensureFullText = useCallback((email: InboxEmail | null | undefined) => {
    if (!email || !(email.body_truncated || email.draft_truncated)) return;
    const id = email.id;
    const version = versionRef.current;
    if (fullTextFits(fullTextRef.current[id], email, version)) return;
    const key = `${id}@${version}`;
    if (requested.current.has(key)) return;
    requested.current.add(key);
    setLoadFailed((prev) => withoutIds(prev, [id]));
    fetch(`/api/emails/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { body: string | null; draft_reply: string | null }) => {
        setFullText((prev) => ({
          ...prev,
          [id]: {
            body: data.body ?? null,
            draft: data.draft_reply ?? null,
            version,
          },
        }));
      })
      .catch(() => {
        requested.current.delete(key);
        setLoadFailed((prev) => ({ ...prev, [id]: true }));
      });
  }, []);

  /** Select a message, and on a phone move into it. */
  function openEmail(id: string) {
    setSelectedId(id);
    setMobileView("detail");
  }

  /**
   * `sent_at` as the hotel would date it. Built once per timezone rather than
   * per row: constructing an Intl.DateTimeFormat is the expensive part, and
   * "Done today" asks this of every sent message in the list.
   */
  const sentAtLocalDate = useMemo(() => {
    let fmt: Intl.DateTimeFormat;
    try {
      fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      // Same failure mode lib/stay-phase.ts guards: one hotel with a bad
      // timezone must not take down the page for everyone.
      fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    return (sentAt: string) => {
      const d = new Date(sentAt);
      return Number.isNaN(d.getTime()) ? null : fmt.format(d);
    };
  }, [timeZone]);

  /**
   * Counts for every segment, off the UNFILTERED list — a count that changed
   * with the selected queue would only ever tell you about the queue you are
   * already looking at.
   */
  const queueCounts = useMemo(() => {
    const now = new Date();
    return Object.fromEntries(
      QUEUE_MODES.map((mode) => [
        mode,
        shownEmails.filter((e) =>
          matchesQueue(e, mode, today, sentAtLocalDate, now)
        ).length,
      ])
    ) as Record<QueueMode, number>;
  }, [shownEmails, today, sentAtLocalDate]);

  // Filter, then sort. Both are client-side so the controls are instant; the
  // server always sends the same rows with their urgency already computed.
  const sorted = useMemo(() => {
    const now = new Date();
    return shownEmails
      .filter((e) => matchesQueue(e, queue, today, sentAtLocalDate, now))
      .sort(sort === "urgency" ? byUrgency : byDate);
  }, [shownEmails, queue, sort, today, sentAtLocalDate]);

  function chooseSort(mode: SortMode) {
    setSort(mode);
    rememberSort(mode);
  }

  function chooseQueue(mode: QueueMode) {
    setQueue(mode);
    rememberQueue(mode);
    // The open message may not be in the new queue. Fall to that queue's first
    // row rather than leaving the reading pane showing something the list no
    // longer offers.
    setSelectedId((current) => {
      const stillThere = shownEmails.some(
        (e) =>
          e.id === current && matchesQueue(e, mode, today, sentAtLocalDate)
      );
      return stillThere ? current : null;
    });
  }

  const queueLabels: Record<QueueMode, string> = {
    needs_you: dict.emails.queueNeedsYou,
    waiting: dict.emails.queueWaiting,
    done_today: dict.emails.queueDoneToday,
    all: dict.emails.queueAll,
  };

  const badges = dict.emails.badges as Record<string, string>;
  function badgeLabel(classification: string | null): string {
    if (!classification) return dict.emails.badges.processing;
    return badges[classification] ?? classification;
  }

  /**
   * The short plain-language note shown at the right of a row. The rule itself
   * lives in lib/urgency-note.ts so the dashboard's "needs a reply" card — a
   * server component — words these identically.
   */
  function urgencyNote(urgency: Urgency): string | null {
    const note = urgencyNoteFor(urgency);
    return note ? t(dict.emails.urgency[note.key], note.vars) : null;
  }

  /** The guest's name when the booking matched, else their address. */
  function senderName(email: InboxEmail): string {
    return email.guest_name || email.from_email || dict.emails.unknownSender;
  }

  function shortTime(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return new Intl.DateTimeFormat(intlLocale[locale], {
      ...(sameDay
        ? { hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "short" }),
    }).format(d);
  }

  /** A YYYY-MM-DD hotel-local date, rendered in the reader's locale. */
  function shortDate(date: string): string {
    return new Intl.DateTimeFormat(intlLocale[locale], {
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00Z`));
  }

  /** "12 Aug → 15 Aug · Booking 4471" — null when nothing matched. */
  function bookingContext(email: InboxEmail): string | null {
    const parts: string[] = [];
    if (email.arrival && email.departure) {
      parts.push(
        t(dict.emails.stayDates, {
          arrival: shortDate(email.arrival),
          departure: shortDate(email.departure),
        })
      );
    }
    if (email.booking_ref) {
      parts.push(t(dict.emails.bookingRef, { ref: email.booking_ref }));
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  const selected = sorted.find((e) => e.id === selectedId) ?? null;

  // The open message's full text, and the next one down the list's — the one
  // a GM opens after dealing with this.
  const nextRow = selected ? sorted[sorted.indexOf(selected) + 1] : undefined;

  /**
   * Guest-context panes fetched for messages whose pane didn't travel with the
   * page (communications/window.tsx sends panes for the top of the queues
   * only). Rendered on the server by loadContextPane — the guest's details
   * still arrive as markup, never as props. Only from `xl` up, the one width
   * that shows the pane; `null` is kept too, so a guest with no pane is asked
   * about once.
   */
  const [fetchedPanes, setFetchedPanes] = useState<Record<string, ReactNode>>(
    {}
  );
  const panesRequested = useRef(new Set<string>());
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(XL_QUERY);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!wide || !selected) return;
    const key = selected.contextKey;
    if (contextPanes?.[key] || panesRequested.current.has(key)) return;
    panesRequested.current.add(key);
    loadContextPane(locale, selected.id)
      .then((pane) => setFetchedPanes((prev) => ({ ...prev, [key]: pane })))
      .catch(() => {
        panesRequested.current.delete(key);
        setFetchedPanes((prev) => ({ ...prev, [key]: null }));
      });
  }, [wide, selected, contextPanes, locale]);

  /**
   * The open message's full text, when the cache holds one that belongs to
   * the row on screen (see `fullTextFits`). Never the list's preview.
   */
  const selectedFull =
    selected && fullTextFits(fullText[selected.id], selected, listVersion)
      ? fullText[selected.id]
      : undefined;
  /** The open message's draft is still only its first lines. */
  const draftPending = Boolean(selected?.draft_truncated && !selectedFull);
  useEffect(() => {
    ensureFullText(selected);
    ensureFullText(nextRow);
  }, [selected, nextRow, ensureFullText]);
  const complaints = sorted.filter((e) => e.urgency.kind === "complaint");
  // What "approve all" would send from the queue on screen. The server action
  // re-applies the same filter to these ids (communications/actions.ts) —
  // this copy only decides what the dialog lists.
  const standard = sorted.filter(
    (e) =>
      e.status === "pending" &&
      e.draft_reply &&
      // An Ask-started draft has no recipient yet; it can't go in a batch.
      e.from_email &&
      (e.classification === "arrival_info" ||
        e.classification === "general_inquiry")
  );
  const standardCount = standard.length;
  const bulkItems: BulkSendItem[] = standard.map((e) => ({
    id: e.id,
    name: firstNameOf(senderName(e)),
    firstLine: firstLineOf(e.draft_reply),
  }));

  /**
   * Applies `change` to the list at once, then runs the action; `settled`
   * hears whether it went through.
   *
   * A failure is recorded against the message itself (`failures`), not in one
   * shared banner: the GM may have sent three more replies by the time the
   * first one fails, and a banner the next click clears would let that row
   * slip back into the queue unexplained. The bulk send keeps the banner — it
   * reports on a batch, not a row.
   */
  function run(
    change: InboxChange,
    fn: () => Promise<{ error?: string } | void>,
    { settled, bulk = false }: { settled?: (ok: boolean) => void; bulk?: boolean } = {}
  ) {
    setActionError(null);
    setFailures((prev) => withoutIds(prev, change.ids));
    startTransition(async () => {
      applyChange(change);
      let error: string | null = null;
      try {
        const result = await fn();
        if (result && "error" in result && result.error) error = result.error;
      } catch {
        // A thrown action — the connection dropped, the function timed out —
        // may still have done its work before the answer was lost. Fetch the
        // real state rather than show a row as undone that the guest has in
        // fact received. (sendReply also refuses to send a sent row twice.)
        error = dict.emails.actionFailed;
        router.refresh();
      }
      if (error !== null) {
        const message = error;
        if (bulk) {
          setActionError(message);
        } else {
          setFailures((prev) => ({
            ...prev,
            ...Object.fromEntries(change.ids.map((id) => [id, message])),
          }));
        }
      }
      settled?.(error === null);
      // No router.refresh() on success. Every one of these actions ends in
      // revalidateInbox() (communications/actions.ts) — both windows and the
      // layout's badges — and a Server Action that revalidates the page being
      // viewed returns the new render in the same response. Refreshing on top
      // rendered the layout and this window a second time after every send,
      // flag and dismiss (docs/audits/2026-10-01-performance.md §4.6).
    });
  }

  function handleSend() {
    // Never send a draft the list carried as a preview (see `draftPending`).
    if (!selected || draftPending) return;
    const id = selected.id;
    // One send per message per flight. The button is gone as soon as the row
    // turns "sent", so this only matters for a second click landing before
    // that render — but a reply sent twice can't be unsent.
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    const content = draftRef.current?.value ?? "";
    setUnsent((prev) => ({ ...prev, [id]: content }));
    run({ ids: [id], status: "sent" }, () => sendReply(id, content), {
      // Sent: forget the text. Failed: keep it, so the editor comes back with
      // the GM's words rather than the stored draft.
      settled: (ok) => {
        inFlight.current.delete(id);
        if (ok) setUnsent((prev) => withoutIds(prev, [id]));
      },
    });
  }

  function handleBulk() {
    if (standardCount === 0) return;
    setBulkOpen(true);
  }

  function confirmBulk() {
    // Exactly the rows the dialog listed — captured now, not re-derived after
    // a refresh could have changed the queue.
    const ids = bulkItems.map((item) => item.id);
    setBulkOpen(false);
    // All of them leave "Needs you" at once. Any that don't go come back when
    // the server's render lands, and the partial notice below says how many.
    run(
      { ids, status: "sent" },
      async () => {
        const result = await approveAllStandard(ids);
        if (result.error) return { error: result.error };
        // Say so when fewer went than were confirmed — never let "Send 5"
        // quietly mean three. Set directly rather than returned as an error:
        // this is a partial success, and the rows that did go stay gone.
        if (result.skipped > 0) {
          setActionError(
            t(dict.bulkSend.partial, { sent: result.sent, count: ids.length })
          );
        }
        return undefined;
      },
      { bulk: true }
    );
  }

  const selectedContext = selected ? bookingContext(selected) : null;

  // The pane for whoever is open. Absent when nothing is selected, and absent
  // on every width below `xl` because the column itself is not rendered there.
  // A pane that didn't travel with the page is fetched (see `fetchedPanes`),
  // and its column holds a skeleton meanwhile, so the message column doesn't
  // jump narrower when it lands.
  const selectedKey = selected?.contextKey;
  const contextPane = !selectedKey
    ? null
    : (contextPanes?.[selectedKey] ??
      (selectedKey in fetchedPanes
        ? fetchedPanes[selectedKey]
        : wide
          ? <ContextPaneSkeleton />
          : null));

  // Nothing in the inbox at all: the whole surface is the empty state, rather
  // than an empty list sitting next to an empty reading pane. Note this is the
  // whole list, not `sorted` — an empty QUEUE keeps its segmented control,
  // since the way out of an empty queue is to pick another one.
  if (shownEmails.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

  /**
   * What an empty queue says. "Needs you" gets its own wording because
   * emptying it is an achievement and a generic "nothing here" throws that
   * away — a queue can be finished, and that moment should be visible
   * (APP_UX_PROPOSAL.md §5.3).
   */
  const queueEmptyMessage =
    queue === "needs_you" ? dict.emails.queueClear : dict.emails.queueEmpty;

  return (
    <div className="flex flex-col gap-4">
      {complaints.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          {plural(
            complaints.length,
            dict.emails.needAttentionBannerOne,
            dict.emails.needAttentionBannerOther
          )}
        </div>
      ) : null}

      {/* The queue segmented control (§5.3). Same treatment as the arrivals
          tabs, and above the count/sort row because it decides what is being
          counted. Hidden with the rest of the list chrome on a phone that has
          navigated into a message. */}
      <div
        role="group"
        aria-label={dict.emails.queueLabel}
        className={cn(
          "inline-flex flex-wrap self-start rounded-[10px] border border-[var(--fonda-border-2)] p-0.5",
          mobileView === "detail" && "hidden lg:inline-flex"
        )}
      >
        {QUEUE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => chooseQueue(mode)}
            aria-pressed={queue === mode}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
              queue === mode
                ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
                : "text-[var(--fonda-text-2)] hover:text-foreground"
            )}
          >
            {queueLabels[mode]}
            <span
              className={cn(
                "ml-1.5 font-mono text-[11px] tabular-nums",
                queue === mode
                  ? "text-[var(--fonda-text-inv)]/70"
                  : "text-[var(--fonda-text-3)]"
              )}
            >
              {queueCounts[mode]}
            </span>
          </button>
        ))}
      </div>

      {/* Count, sort and bulk approve all belong to the list — on a phone
          showing one message they'd be chrome for a screen you've left. */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          mobileView === "detail" && "hidden lg:flex"
        )}
      >
        <p className="text-sm text-muted-foreground">
          {plural(sorted.length, dict.emails.countOne, dict.emails.countOther)}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sort toggle — soft-cornered segmented control, ink for active. */}
          <div
            role="group"
            aria-label={dict.emails.sortLabel}
            className="inline-flex rounded-[10px] border border-[var(--fonda-border-2)] p-0.5"
          >
            {SORT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseSort(mode)}
                aria-pressed={sort === mode}
                className={cn(
                  "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                  sort === mode
                    ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
                    : "text-[var(--fonda-text-2)] hover:text-foreground"
                )}
              >
                {mode === "date"
                  ? dict.emails.sortByDate
                  : dict.emails.sortByUrgency}
              </button>
            ))}
          </div>

          <Button
            ref={bulkButtonRef}
            onClick={handleBulk}
            disabled={pending || standardCount === 0}
            variant="outline"
            size="sm"
          >
            {t(dict.emails.approveAllStandard, { count: standardCount })}
          </Button>
          <BulkSendDialog
            open={bulkOpen}
            title={plural(
              standardCount,
              dict.bulkSend.titleRepliesOne,
              dict.bulkSend.titleRepliesOther
            )}
            items={bulkItems}
            sendLabel={t(dict.bulkSend.send, { count: standardCount })}
            onSend={confirmBulk}
            onCancel={() => setBulkOpen(false)}
            returnFocusTo={bulkButtonRef}
          />
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {actionError}
        </p>
      ) : null}

      {/* minmax(0,1fr), not 1fr: a plain 1fr track takes its minimum from the
          pane's min-content, and a long subject line would then widen the
          whole page instead of being truncated. */}
      {/* Three columns from `xl`: list · thread · context. Below that the pane
          does not render AT ALL — not squeezed, not a drawer. At 1280 the
          sidebar has already taken 240px, and a 280px pane on top of a 320px
          list would leave the message itself the narrowest column on screen,
          which inverts the whole point of the layout. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]",
          contextPane && "xl:grid-cols-[320px_minmax(0,1fr)_280px]"
        )}
      >
        {/* Left: list. On a phone it is the whole page until you tap a row, and
            scrolls with the page rather than inside its own 70vh well. */}
        <div
          ref={listRef}
          tabIndex={-1}
          className={cn(
            // A top-level card (§6): white, floating on the grey ground, no
            // outer hairline — the divide-y rules between rows are the only
            // borders inside it.
           "flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card lg:max-h-[70vh] lg:overflow-y-auto",
            mobileView === "detail" && "hidden lg:flex"
          )}
        >
          {sorted.length === 0 ? (
            <div className="px-4 py-10">
              <p className="text-center text-sm text-muted-foreground">
                {queueEmptyMessage}
              </p>
            </div>
          ) : null}
          {sorted.map((email) => {
            const isSelected = email.id === selectedId;
            const note = urgencyNote(email.urgency);
            return (
              <button
                key={email.id}
                onClick={() => openEmail(email.id)}
                // Fetch a preview's full text on the way to the click, so the
                // message is usually complete by the time it opens.
                onMouseEnter={() => ensureFullText(email)}
                onFocus={() => ensureFullText(email)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                  // The selected row only reads as selected next to a detail
                  // pane; on a phone the detail has replaced the list entirely.
                  isSelected && "lg:bg-accent"
                )}
              >
                {/* The row's one spot of colour (§7.3); everything to its
                    right stays neutral. */}
                <GuestAvatar name={senderName(email)} className="mt-0.5" />
                {/* min-w-0 so the long subject truncates instead of widening
                    the whole 320px list track. */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {senderName(email)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {shortTime(email.created_at)}
                    </span>
                  </div>
                  <span className="truncate text-sm text-muted-foreground">
                    {email.subject || dict.emails.noSubject}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          badgeClass(email.classification)
                        )}
                      >
                        {badgeLabel(email.classification)}
                      </span>
                      {failureOf(email) ? (
                        // Back in the queue because the last click failed —
                        // the one row state that must not look like the rest.
                        <span className="text-xs font-medium text-destructive">
                          {dict.emails.notDone}
                        </span>
                      ) : email.status === "sent" ? (
                        // Handled is a finished state, not a live one — quiet
                        // grey, never the accent (§10).
                        <span className="text-xs font-medium text-[var(--fonda-text-3)]">
                          {email.sending
                            ? dict.emails.sending
                            : dict.emails.sent}
                        </span>
                      ) : email.status === "ignored" ? (
                        <span className="text-xs text-muted-foreground">
                          {dict.emails.ignored}
                        </span>
                      ) : null}
                    </div>
                    {note ? (
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[11px] font-medium",
                          NOTE_CLASS[email.urgency.kind] ??
                            "text-[var(--fonda-text-3)]"
                        )}
                      >
                        {note}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: detail. Its own screen below `md`. */}
        <div
          ref={detailRef}
          tabIndex={-1}
          className={cn(
           "rounded-[16px] bg-card p-4 lg:p-5",
            mobileView === "list" && "hidden lg:block"
          )}
        >
          {selected ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="-ml-1 inline-flex items-center gap-1.5 self-start rounded-[8px] px-1 py-1 text-sm font-medium text-[var(--fonda-text-2)] transition-colors hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} />
                {dict.emails.backToList}
              </button>

              <div>
                <h2 className="font-semibold">
                  {selected.subject || dict.emails.noSubject}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(dict.emails.from, {
                    sender: senderName(selected),
                    time: shortTime(selected.created_at),
                  })}
                </p>
              </div>

              {/* Guest + booking context inline. */}
              {selectedContext ? (
                <div className="flex flex-col gap-1 rounded-[10px] bg-[var(--fonda-surface)] px-3 py-2">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                    {dict.emails.bookingContext}
                  </span>
                  <span className="text-sm text-[var(--fonda-text-2)]">
                    {selectedContext}
                  </span>
                </div>
              ) : null}

              <div className="max-h-48 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-3 text-sm">
                {selected.body_truncated
                  ? selectedFull
                    ? selectedFull.body || dict.emails.emptyMessage
                    : `${selected.body ?? ""}…`
                  : selected.body || dict.emails.emptyMessage}
              </div>

              {/* The rest of a preview didn't arrive. Says so once, here, for
                  the body and the draft alike; Send stays held below. */}
              {loadFailed[selected.id] &&
              (selected.body_truncated || selected.draft_truncated) &&
              !selectedFull ? (
                <div className="flex items-center gap-3">
                  <p role="alert" className="text-sm text-destructive">
                    {dict.emails.loadFailed}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ensureFullText(selected)}
                  >
                    {dict.common.tryAgain}
                  </Button>
                </div>
              ) : null}

              {selected.status === "sent" ? (
                <div className="flex flex-col gap-1">
                  <p
                    role="status"
                    className="text-sm font-medium text-[var(--fonda-text-2)]"
                  >
                    {/* Not "sent" until Gmail has said so. */}
                    {selected.sending
                      ? dict.emails.sending
                      : selected.sent_at
                      ? t(dict.emails.replySentAt, {
                          time: shortTime(selected.sent_at),
                        })
                      : dict.emails.replySent}
                  </p>
                  {/* The "· edited" marker P-8 deferred, now honest: migration
                      0025 records draft_edited on the email itself when it is
                      sent. Null — no draft, or sent before 0025 — shows
                      nothing rather than a guess. */}
                  {selected.draft_edited !== null ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-3)]">
                        {selected.draft_edited
                          ? dict.ai.sentEdited
                          : dict.ai.sentAsDrafted}
                      </p>
                      <AiReportButton key={selected.id} itemType="reply" itemId={selected.id} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  {selected.status === "needs_attention" ? (
                    <p className="text-sm font-medium text-destructive">
                      {dict.emails.needsAttentionNote}
                    </p>
                  ) : (
                    <label className="text-sm font-medium" htmlFor="draft">
                      {dict.emails.draftLabel}
                    </label>
                  )}
                  {draftPending ? (
                    // The list carried only the draft's first lines; the
                    // whole draft is on its way (usually already, from the
                    // hover). The editor waits for it, and so does Send: a
                    // preview must never be what a guest receives.
                    // Failed: the alert under the body says so and offers the
                    // retry; the editor's place stays empty until it works.
                    loadFailed[selected.id] ? null : (
                      <div aria-busy="true">
                        <span role="status" className="sr-only">
                          {dict.emails.loadingDraft}
                        </span>
                        <Skeleton className="h-[226px] w-full" />
                      </div>
                    )
                  ) : (
                    <textarea
                      id="draft"
                      key={selected.id}
                      ref={draftRef}
                      // A send that failed comes back with what the GM wrote
                      // (`unsent`); otherwise the whole draft, fetched if the
                      // list carried only its first lines.
                      defaultValue={
                        unsent[selected.id] ??
                        (selected.draft_truncated
                          ? (selectedFull?.draft ?? "")
                          : (selected.draft_reply ?? ""))
                      }
                      rows={10}
                      className="w-full rounded-[10px] border border-input bg-popover p-3 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]"
                      placeholder={dict.emails.replyPlaceholder}
                    />
                  )}
                  {/* A LINE, not a chip (§7.4). The brief's sections get chips
                      because a chip sits in a heading row and reads as a label;
                      a chip under a draft would sit beside the Send button and
                      start to rattle, which is precisely what §7.4 warns
                      about. One quiet mono line, once, under the thing it
                      describes.

                      It names the AI (Art. 50(1), AI_ACT_PROMPTS.md A3) and
                      asks for the check, because the check is the human
                      oversight the whole product claims. Whether the draft was
                      edited is only knowable once it is sent, so the "· edited"
                      marker lives on the sent state above (P-8, resolved by
                      migration 0025). */}
                  {selected.draft_reply ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-3)]">
                        {dict.ai.draftLine}
                      </p>
                      {/* A8: the AI incident channel, as quiet as the line
                          it sits beside. */}
                      <AiReportButton key={selected.id} itemType="reply" itemId={selected.id} />
                    </div>
                  ) : null}
                  {failureOf(selected) ? (
                    <p
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      {failureOf(selected)}
                    </p>
                  ) : null}
                  {/* Never disabled while something else is in flight: each
                      click moves its own row at once (`shownEmails`), so the
                      GM can work down the queue without waiting on Gmail. */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSend} disabled={draftPending}>
                      {dict.emails.send}
                    </Button>
                    {selected.status !== "needs_attention" ? (
                      <Button
                        onClick={() => {
                          const id = selected.id;
                          run({ ids: [id], status: "needs_attention" }, () =>
                            flagEmail(id)
                          );
                        }}
                        variant="outline"
                      >
                        {dict.emails.needsAttention}
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => {
                        const id = selected.id;
                        run({ ids: [id], status: "ignored" }, () =>
                          ignoreEmail(id)
                        );
                      }}
                      variant="ghost"
                    >
                      {dict.emails.ignore}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.emails.selectPrompt}
            </p>
          )}
        </div>

        {/* Third column: who you are talking to. Rendered on the server and
            handed in as a slot — see `contextPanes`. `hidden xl:flex` rather
            than a conditional render so the grid track and the pane appear
            together; the track only exists at `xl` too. */}
        {contextPane ? (
          <div className="hidden overflow-hidden rounded-[16px] bg-card xl:flex">
            {contextPane}
          </div>
        ) : null}
      </div>
    </div>
  );
}
