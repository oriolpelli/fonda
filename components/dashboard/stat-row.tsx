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
    // 2×2 all the way up to `lg`. At exactly `md` the desktop rail is already
    // taking 256px, which leaves each of four cells ~64px of text — narrow
    // enough that "OCCUPANCY TONIGHT" spills out of its cell.
    <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-border bg-card lg:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.key}
          className={cn(
            // Tighter cells on a phone, where four numbers share ~335px.
            "px-4 py-5 md:px-6 md:py-7",
            // 2×2: second column and second row get a rule.
            i % 2 === 1 && "border-l border-border",
            i >= 2 && "border-t border-border",
            // One row from lg up: rules between columns only.
            "lg:border-t-0",
            i > 0 && "lg:border-l lg:border-border"
          )}
        >
          <div className="text-3xl font-semibold leading-none tracking-[-0.03em] text-foreground lg:text-4xl">
            {stat.value}
          </div>
          <div className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)] lg:mt-3">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
