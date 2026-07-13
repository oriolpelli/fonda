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
        "overflow-hidden border border-border bg-popover transition-[transform,box-shadow] duration-300 ease-out",
        isLarge
          ? "rounded-[20px] shadow-[0_24px_60px_-24px_rgba(10,10,10,0.18)] hover:-translate-y-1 hover:shadow-[0_28px_70px_-20px_rgba(10,10,10,0.22)]"
          : "rounded-[18px] shadow-[0_12px_48px_rgba(10,10,10,0.06)] hover:-translate-y-0.5 hover:shadow-[0_16px_56px_rgba(10,10,10,0.08)] lg:sticky lg:top-24",
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
          <div className="mt-3 rounded-[12px] bg-[var(--fonda-surface)] p-4">
            <span className="inline-flex items-center rounded-full bg-[var(--fonda-accent-light)] px-3 py-1 font-mono text-[11px] text-[var(--fonda-accent)]">
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
