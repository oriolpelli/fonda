"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  approveAllStandard,
  flagEmail,
  ignoreEmail,
  sendReply,
} from "@/app/[lang]/dashboard/communications/actions";
import { EmptyState, type EmptyStateIcon } from "@/components/dashboard/empty-state";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { byDate, byUrgency, type Urgency } from "@/lib/email-urgency";
import { SORT_COOKIE, SORT_MODES, type SortMode } from "@/lib/inbox-sort";
import {
  DEFAULT_QUEUE,
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
  guest_name: string | null;
  booking_ref: string | null;
  arrival: string | null;
  departure: string | null;
  /** Which guest-context pane this row shows — see lib/inbox.ts. Opaque. */
  contextKey: string;
  urgency: Urgency;
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
  const router = useRouter();
  const { dict, locale } = useDictionary();
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [queue, setQueue] = useState<QueueMode>(initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? emails[0]?.id ?? null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draftRef = useRef<HTMLTextAreaElement>(null);

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
        emails.filter((e) => matchesQueue(e, mode, today, sentAtLocalDate, now))
          .length,
      ])
    ) as Record<QueueMode, number>;
  }, [emails, today, sentAtLocalDate]);

  // Filter, then sort. Both are client-side so the controls are instant; the
  // server always sends the same rows with their urgency already computed.
  const sorted = useMemo(() => {
    const now = new Date();
    return emails
      .filter((e) => matchesQueue(e, queue, today, sentAtLocalDate, now))
      .sort(sort === "urgency" ? byUrgency : byDate);
  }, [emails, queue, sort, today, sentAtLocalDate]);

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
      const stillThere = emails.some(
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
  const complaints = sorted.filter((e) => e.urgency.kind === "complaint");
  const standardCount = sorted.filter(
    (e) =>
      e.status === "pending" &&
      e.draft_reply &&
      (e.classification === "arrival_info" ||
        e.classification === "general_inquiry")
  ).length;

  function run(fn: () => Promise<{ error?: string } | void>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSend() {
    if (!selected) return;
    const content = draftRef.current?.value ?? "";
    run(() => sendReply(selected.id, content));
  }

  function handleBulk() {
    if (standardCount === 0) return;
    if (
      !window.confirm(
        plural(
          standardCount,
          dict.emails.confirmBulkOne,
          dict.emails.confirmBulkOther
        )
      )
    ) {
      return;
    }
    run(async () => {
      const result = await approveAllStandard();
      return result.error ? { error: result.error } : undefined;
    });
  }

  const selectedContext = selected ? bookingContext(selected) : null;

  // The pane for whoever is open. Absent when nothing is selected, and absent
  // on every width below `xl` because the column itself is not rendered there.
  const contextPane = selected
    ? (contextPanes?.[selected.contextKey] ?? null)
    : null;

  // Nothing in the inbox at all: the whole surface is the empty state, rather
  // than an empty list sitting next to an empty reading pane. Note this is
  // `emails`, not `sorted` — an empty QUEUE keeps its segmented control, since
  // the way out of an empty queue is to pick another one.
  if (emails.length === 0) {
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
            onClick={handleBulk}
            disabled={pending || standardCount === 0}
            variant="outline"
            size="sm"
          >
            {t(dict.emails.approveAllStandard, { count: standardCount })}
          </Button>
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
                      {email.status === "sent" ? (
                        // Handled is a finished state, not a live one — quiet
                        // grey, never the accent (§10).
                        <span className="text-xs font-medium text-[var(--fonda-text-3)]">
                          {dict.emails.sent}
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
                {selected.body || dict.emails.emptyMessage}
              </div>

              {selected.status === "sent" ? (
                <p className="text-sm font-medium text-[var(--fonda-text-2)]">
                  {selected.sent_at
                    ? t(dict.emails.replySentAt, {
                        time: shortTime(selected.sent_at),
                      })
                    : dict.emails.replySent}
                </p>
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
                  <textarea
                    id="draft"
                    key={selected.id}
                    ref={draftRef}
                    defaultValue={selected.draft_reply ?? ""}
                    rows={10}
                    className="w-full rounded-[10px] border border-input bg-popover p-3 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]"
                    placeholder={dict.emails.replyPlaceholder}
                  />
                  {/* A LINE, not a chip (§7.4). The brief's sections get chips
                      because a chip sits in a heading row and reads as a label;
                      a chip under a draft would sit beside the Send button and
                      start to rattle, which is precisely what §7.4 warns
                      about. One quiet mono line, once, under the thing it
                      describes.

                      No "· edited" marker: draft_edit_events records a bucket
                      and a similarity score per HOTEL, with no link to an
                      email — deliberately, since it is an analytics table and
                      linking it to a message would make it guest-adjacent. So
                      there is no honest way to say whether THIS draft was
                      edited. See decision P-8. */}
                  {selected.draft_reply ? (
                    <p className="font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-3)]">
                      {dict.briefing.provenance.draftProvenance}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSend} disabled={pending}>
                      {pending ? dict.emails.sending : dict.emails.send}
                    </Button>
                    {selected.status !== "needs_attention" ? (
                      <Button
                        onClick={() => run(() => flagEmail(selected.id))}
                        disabled={pending}
                        variant="outline"
                      >
                        {dict.emails.needsAttention}
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => run(() => ignoreEmail(selected.id))}
                      disabled={pending}
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
