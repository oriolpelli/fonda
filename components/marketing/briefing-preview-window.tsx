import { cn } from "@/lib/utils";

interface BriefingPreviewWindowProps {
  windowTitle: string;
  dateLine: string;
  greeting: string;
  rows: [string, string][];
  /** "default" — the smaller feature-list side panel. "lg" — the hero's
   * primary product visual: bigger radius, softer depth shadow, not sticky. */
  size?: "default" | "lg";
  className?: string;
}

export function BriefingPreviewWindow({
  windowTitle,
  dateLine,
  greeting,
  rows,
  size = "default",
  className,
}: BriefingPreviewWindowProps) {
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
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-accent)]">
          {dateLine}
        </p>
        <p
          className={cn(
            "mt-2.5 font-semibold leading-snug tracking-[-0.015em] text-foreground",
            isLarge ? "text-xl" : "text-lg"
          )}
        >
          {greeting}
        </p>
        <div className="mt-4 flex flex-col">
          {rows.map(([strong, rest], i, arr) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 py-2.5",
                i < arr.length - 1 ? "border-b border-border" : ""
              )}
            >
              <span className="mt-[7px] size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-accent)]" />
              <p className="text-[13px] leading-[1.55] text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  {strong}
                </strong>
                {rest}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
