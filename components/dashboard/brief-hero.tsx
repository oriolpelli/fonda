import { Sunrise } from "lucide-react";

/**
 * The Morning Brief's page header as a warm gradient hero
 * (FONDA_SANA_REDESIGN.md §7.3) — a literal sunrise on the one page a GM opens
 * at 6:45am. The date is the eyebrow, the title is the headline, and a soft
 * translucent sun sits behind them (§7.2).
 *
 * This is the brief page's ONE gradient (§7.2), which is why the first-run
 * cards below it are rendered `tone="plain"`.
 *
 * White text is safe here only because `.gradient-hero` carries the scrim —
 * see the contrast note in globals.css. Nothing on this card may use a
 * translucent white for text.
 */
export function BriefHero({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  /** Mono uppercase line above the title — the long-form date. */
  eyebrow: string;
  title: string;
  /** Optional second line under the title, e.g. the hotel's name. */
  subtitle?: string;
  /** Right-hand slot, e.g. the refresh button. Style it for a dark surface. */
  action?: React.ReactNode;
}) {
  return (
    <section className="gradient-hero relative overflow-hidden rounded-[20px] px-6 py-8 shadow-card md:px-10 md:py-12">
      <Sunrise
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 size-40 text-[var(--fonda-text-inv)]/20 md:size-52"
        strokeWidth={1}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-inv)]">
            {eyebrow}
          </span>
          {/* Editorial scale, per §4: the brief is a document, not a panel. */}
          <h1 className="text-[clamp(30px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.025em] text-[var(--fonda-text-inv)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[15px] leading-relaxed text-[var(--fonda-text-inv)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
