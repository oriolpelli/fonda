import type { ReactNode } from "react";

import { intlLocale, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The phone-first pieces of /sample-brief. The page used to be the brief as
 * prose and nothing else — right for a GM reading at 6:45, wrong for a director
 * who scans a QR code at the desk and decides in fifteen seconds whether this
 * is more than "text anyone could generate". These cards show the same morning
 * as the product shows it: numbers, guests, the drafted email, the chart.
 *
 * Design: FONDA_SANA_REDESIGN.md v4 — white canvas, warm wells, no shadows on
 * wells, ONE gradient hero per screen (§7.2), and the one content accent only
 * inside the chart (§10). All server components; nothing here needs the client.
 */

const eyebrow =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]";

/** Body copy on this page is justified with hyphenation — it reads as a
 * printed brief, and hyphens keep the gaps even on a 390px column. */
export const justified = "text-justify hyphens-auto";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={cn(eyebrow, "mb-3")}>{children}</h2>;
}

export function Well({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] bg-[var(--fonda-surface)] p-5 md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The warm sunrise card: the date, the title, and the morning in four numbers. */
export function BriefHeroCard({
  dateLine,
  title,
  hotelLine,
  badge,
  stats,
}: {
  dateLine: string;
  title: string;
  hotelLine: string;
  badge: string;
  stats: { value: string; label: string }[];
}) {
  return (
    <section className="gradient-hero rounded-[20px] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/85">
          {dateLine}
        </p>
        <span className="rounded-full bg-white/18 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white">
          {badge}
        </span>
      </div>
      <h1 className="mt-4 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-white md:text-[44px]">
        {title}
      </h1>
      <p className="mt-1.5 text-[15px] text-white/85">{hotelLine}</p>
      <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] bg-white/14 px-4 py-3.5 backdrop-blur-[2px]"
          >
            <dd className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-white tabular-nums">
              {stat.value}
            </dd>
            <dt className="mt-1.5 text-[12px] leading-tight text-white/85">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Small round initials disc — the only other colour on the page (§7.3). */
const DISC_COLOURS = ["#F8D9B0", "#F4C7B3", "#E9DCC4", "#F6CFA0"];

function Disc({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-[var(--fonda-text)]"
      style={{ backgroundColor: DISC_COLOURS[index % DISC_COLOURS.length] }}
    >
      {initials}
    </span>
  );
}

function StatusChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--fonda-text)]">
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
        <path
          d="M2.5 6.2 5 8.5l4.5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </span>
  );
}

export function ArrivalCards({
  arrivals,
}: {
  arrivals: { name: string; detail: string; note: string; status: string }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {arrivals.map((a, i) => (
        <li
          key={a.name}
          className="rounded-[16px] bg-[var(--fonda-surface)] p-4 md:p-5"
        >
          <div className="flex items-start gap-3">
            <Disc name={a.name} index={i} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] leading-snug font-semibold tracking-[-0.015em] text-foreground">
                {a.name}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {a.detail}
              </p>
            </div>
          </div>
          <p
            className={cn(
              "mt-3 text-[14px] leading-[1.5] text-foreground/85",
              justified
            )}
          >
            {a.note}
          </p>
          <div className="mt-3">
            <StatusChip>{a.status}</StatusChip>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NameChips({
  names,
  tag,
}: {
  names: string[];
  tag: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {names.map((n) => (
        <span
          key={n}
          className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-foreground"
        >
          {n}
        </span>
      ))}
      <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--fonda-text-2)]">
        {tag}
      </span>
    </div>
  );
}

/**
 * Rooms sold per night for the next 14 nights, as bars against capacity. The
 * soft night carries the page's one accent; tonight is ink; everything else is
 * the neutral inset. Weekday initials come from Intl so they follow the locale.
 */
export function OccupancyChart({
  nights,
  rooms,
  startISO,
  softIndex,
  locale,
  todayLabel,
  softLabel,
}: {
  nights: readonly number[];
  rooms: number;
  startISO: string;
  softIndex: number;
  locale: Locale;
  todayLabel: string;
  softLabel: string;
}) {
  const start = new Date(`${startISO}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], {
    weekday: "narrow",
    timeZone: "UTC",
  });
  return (
    <div>
      <div className="flex h-32 items-end gap-[5px]" role="img" aria-label={`${nights.join(", ")} / ${rooms}`}>
        {nights.map((sold, i) => {
          const pct = Math.round((sold / rooms) * 100);
          return (
            <div key={i} className="flex h-full flex-1 flex-col justify-end">
              <div
                className={cn(
                  "w-full rounded-t-[5px]",
                  i === softIndex
                    ? "bg-[var(--fonda-accent)]"
                    : i === 0
                      ? "bg-[var(--fonda-ink)]"
                      : "bg-[var(--fonda-inset)]"
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[5px]">
        {nights.map((_, i) => {
          const d = new Date(start.getTime() + i * 86_400_000);
          return (
            <span
              key={i}
              className={cn(
                "flex-1 text-center font-mono text-[10px] uppercase text-[var(--fonda-text-3)]",
                (i === 0 || i === softIndex) && "font-medium text-foreground"
              )}
            >
              {fmt.format(d)}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--fonda-ink)]" />
          {todayLabel} · {Math.round((nights[0] / rooms) * 100)}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--fonda-accent)]" />
          {softLabel} · {nights[softIndex]}/{rooms}
        </span>
      </div>
    </div>
  );
}

export function OvernightTimeline({
  steps,
}: {
  steps: { time: string; text: string }[];
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => (
        <li
          key={step.time}
          className="grid grid-cols-[3rem_10px_1fr] gap-x-3"
        >
          <span className="pt-px font-mono text-[12px] text-[var(--fonda-text-2)] tabular-nums">
            {step.time}
          </span>
          {/* Dot, and the rail down to the next one (none after the last). */}
          <span aria-hidden="true" className="relative flex justify-center">
            <span className="mt-[5px] size-2.5 rounded-full bg-[var(--fonda-ink)]" />
            {i < steps.length - 1 ? (
              <span className="absolute top-[18px] bottom-0 w-px bg-[var(--fonda-border-2)]" />
            ) : null}
          </span>
          <p
            className={cn(
              "pb-4 text-[14px] leading-[1.5] text-foreground",
              justified
            )}
          >
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
