import { cn } from "@/lib/utils";

/** One row of the matched reservation — a PMS field and its value. */
export interface ReservationField {
  label: string;
  value: string;
}

interface EmailDraftPreviewWindowProps {
  windowTitle: string;
  receivedLabel: string;
  fromName: string;
  subject: string;
  message: string;
  /** Heading of the middle pane — "Reservation matched". */
  contextLine: string;
  /** Which system the reservation came out of, rendered as a neutral chip. */
  pmsSource: string;
  /** Guest, room type, dates and status, in that order. */
  reservation: ReservationField[];
  draftLabel: string;
  draftBody: string;
  /** "default" — the smaller feature-list side panel. "lg" — the hero's
   * primary product visual: bigger radius, softer depth shadow, not sticky. */
  size?: "default" | "lg";
  className?: string;
}

export function EmailDraftPreviewWindow({
  windowTitle,
  receivedLabel,
  fromName,
  subject,
  message,
  contextLine,
  pmsSource,
  reservation,
  draftLabel,
  draftBody,
  size = "default",
  className,
}: EmailDraftPreviewWindowProps) {
  const isLarge = size === "lg";

  // Every pane carries its own padding rather than the body carrying one box
  // of it, so the dividers between them run the full height of the window
  // instead of stopping short. That is what makes it read as three panes of
  // one app rather than three stacked paragraphs.
  const pane = isLarge ? "p-7" : "p-5";
  const eyebrow =
    "font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]";

  return (
    <div
      className={cn(
        // Keeps its hairline where the page's cards dropped theirs: this is a
        // product shot in a window frame, not a card, and the frame is the
        // point. Depth is tinted with the warm ink (28 26 22) rather than the
        // old neutral rgba(10,10,10) so it matches the v3 material.
        //
        // These classes are deliberately character-for-character the ones in
        // briefing-preview-window.tsx: the two windows are a pair, and the
        // pairing is the argument — same hotel, same night, one system. If you
        // change the radius, shadow or border here, change it there too.
        "overflow-hidden border border-border bg-popover transition-[transform,box-shadow] duration-300 ease-out",
        isLarge
          ? "rounded-[20px] shadow-[0_24px_60px_-24px_rgb(28_26_22_/_0.18)] hover:-translate-y-1 hover:shadow-[0_28px_70px_-20px_rgb(28_26_22_/_0.22)]"
          : "rounded-[18px] shadow-[0_12px_48px_rgb(28_26_22_/_0.06)] hover:-translate-y-0.5 hover:shadow-[0_16px_56px_rgb(28_26_22_/_0.08)] lg:sticky lg:top-24",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-xs text-[var(--fonda-text-3)]">
          {windowTitle}
        </span>
      </div>

      {/* Left to right: what the guest sent, what the PMS matched it to, and
          what Fondas wrote back. Below lg the same three stack in that order —
          the reading order and the DOM order are the same thing, so nothing
          needs reordering for phones. */}
      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {/* 1 — the incoming email, as it arrived. */}
        <div className={pane}>
          <p className={eyebrow}>{receivedLabel}</p>
          <p
            className={cn(
              "mt-2.5 font-semibold leading-snug tracking-[-0.015em] text-foreground",
              isLarge ? "text-lg" : "text-base"
            )}
          >
            {subject}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{fromName}</p>
          <p className="mt-3 text-[13px] leading-[1.55] text-muted-foreground">
            {message}
          </p>
        </div>

        {/* 2 — the reservation the message was matched to. This pane is the
            whole point of the band: the draft is only trustworthy because the
            system knew who was writing and what they had booked. */}
        <div className={pane}>
          <p className={eyebrow}>{contextLine}</p>
          {/* Neutral chip, matching the source/result chips the real chat
              now renders (§8.2). It was the pale-blue accent tint — v2's
              --fonda-accent-light, since deleted, and exactly the "reads
              SaaS" micro-surface §2 calls out. */}
          <span className="mt-3 inline-flex items-center rounded-full border border-border bg-[var(--fonda-surface)] px-3 py-1 font-mono text-[11px] text-[var(--fonda-text-2)]">
            {pmsSource}
          </span>
          <dl className="mt-4 flex flex-col gap-3">
            {reservation.map((field) => (
              <div key={field.label} className="flex flex-col gap-1">
                <dt className={eyebrow}>{field.label}</dt>
                <dd className="text-[13px] leading-[1.45] text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 3 — the drafted reply, waiting for a yes. */}
        <div className={pane}>
          <p className={eyebrow}>{draftLabel}</p>
          {/* Back to --fonda-surface in v4. That v3 note was right at the time
              and the inversion turns it inside out: "surface" meant white then,
              so a well drawn with it vanished against the window's white body
              and had to drop to surface-2. v4 makes --fonda-surface the well
              again (#f6f3ee) — which is what the real product draws this panel
              with, so the mock and the product agree. surface-2 here would now
              be a level deeper than anything the real draft view uses. */}
          <div className="mt-3 rounded-[12px] bg-[var(--fonda-surface)] p-4">
            <p className="text-[13px] leading-[1.6] text-foreground">
              {draftBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
