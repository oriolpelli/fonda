import { cn } from "@/lib/utils";

/**
 * The dashboard's top row: four numbers, one card, hairline dividers between
 * the cells (design identity §4 — "stat row repeat(4,1fr) with 1px dividers").
 *
 * Big number, Geist Mono eyebrow underneath. Deliberately not four separate
 * cards: these four readings are one thought — "how full are we, and who is
 * moving today".
 *
 * A plain server component; the values arrive already formatted so this file
 * never needs to know about locales or percentages.
 */

export interface Stat {
  key: string;
  label: string;
  value: string;
}

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-border bg-card md:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.key}
          className={cn(
            "px-6 py-7",
            // 2×2 on small screens: second column and second row get a rule.
            i % 2 === 1 && "border-l border-border",
            i >= 2 && "border-t border-border",
            // One row from md up: rules between columns only.
            "md:border-t-0",
            i > 0 && "md:border-l md:border-border"
          )}
        >
          <div className="text-4xl font-semibold leading-none tracking-[-0.03em] text-foreground">
            {stat.value}
          </div>
          <div className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
