import { cn } from "@/lib/utils";

interface EmailDraftPreviewWindowProps {
  windowTitle: string;
  receivedLabel: string;
  fromName: string;
  subject: string;
  message: string;
  contextLine: string;
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
  draftLabel,
  draftBody,
  size = "default",
  className,
}: EmailDraftPreviewWindowProps) {
  const isLarge = size === "lg";

  return (
    <div
      className={cn(
        // Keeps its hairline where the page's cards dropped theirs: this is a
        // product shot in a window frame, not a card, and the frame is the
        // point. Depth is tinted with the warm ink (28 26 22) rather than the
        // old neutral rgba(10,10,10) so it matches the v3 material.
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
      <div className={isLarge ? "p-8" : "p-6"}>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
          {receivedLabel}
        </p>
        <p
          className={cn(
            "mt-2.5 font-semibold leading-snug tracking-[-0.015em] text-foreground",
            isLarge ? "text-xl" : "text-lg"
          )}
        >
          {subject}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">{fromName}</p>
        <p className="mt-3 text-[13px] leading-[1.55] text-muted-foreground">
          {message}
        </p>

        <div className="mt-5 border-t border-border pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
            {contextLine}
          </p>
          {/* The well is --fonda-surface-2, not --fonda-surface: since the
              ground flipped, "surface" IS white, so this panel was white on
              white and the draft had lost its container entirely. */}
          <div className="mt-3 rounded-[12px] bg-[var(--fonda-surface-2)] p-4">
            {/* Neutral chip, matching the source/result chips the real chat
                now renders (§8.2). It was the pale-blue accent tint — v2's
                --fonda-accent-light, since deleted, and exactly the "reads
                SaaS" micro-surface §2 calls out. */}
            <span className="inline-flex items-center rounded-full border border-border bg-[var(--fonda-surface)] px-3 py-1 font-mono text-[11px] text-[var(--fonda-text-2)]">
              {draftLabel}
            </span>
            <p className="mt-3 text-[13px] leading-[1.6] text-foreground">
              {draftBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
