"use client";

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

// Urgency notes stay quiet by default. A complaint is the one red note; an
// arrival happening today is the one navy note — the design identity allows the
// signal colour only for something genuinely live.
const NOTE_CLASS: Record<string, string> = {
  complaint: "text-destructive",
  arrives_today: "text-[var(--fonda-accent)]",
  arrives_soon: "text-[var(--fonda-text-3)]",
  waiting: "text-[var(--fonda-text-3)]",
};

export function EmailInbox({
  emails,
  emptyMessage,
  emptyIcon,
  initialSort = "date",
  initialSelectedId,
}: {
  emails: InboxEmail[];
  emptyMessage: string;
  emptyIcon: EmptyStateIcon;
  initialSort?: SortMode;
  /** Opens a specific message on first paint (the dashboard links here). */
  initialSelectedId?: string;
}) {
  const router = useRouter();
  const { dict, locale } = useDictionary();
  const [sort, setSort] = useState<SortMode>(initialSort);
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

  // Sorting is client-side so the toggle is instant; the server always sends
  // the same rows with their urgency already computed.
  const sorted = useMemo(
    () => emails.slice().sort(sort === "urgency" ? byUrgency : byDate),
    [emails, sort]
  );

  function chooseSort(mode: SortMode) {
    setSort(mode);
    rememberSort(mode);
  }

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

  // Nothing to triage: the whole surface is the empty state, rather than an
  // empty list sitting next to an empty reading pane.
  if (emails.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left: list. On a phone it is the whole page until you tap a row, and
            scrolls with the page rather than inside its own 70vh well. */}
        <div
          ref={listRef}
          tabIndex={-1}
          className={cn(
            "flex flex-col divide-y divide-border overflow-hidden rounded-[16px] border border-border lg:max-h-[70vh] lg:overflow-y-auto",
            mobileView === "detail" && "hidden lg:flex"
          )}
        >
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
                        <span className="text-xs font-medium text-[var(--fonda-accent)]">
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
            "rounded-[16px] border border-border p-4 lg:p-5",
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
                <p className="text-sm font-medium text-[var(--fonda-accent)]">
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
                    className="w-full rounded-[10px] border border-input bg-popover p-3 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent"
                    placeholder={dict.emails.replyPlaceholder}
                  />
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
      </div>
    </div>
  );
}
