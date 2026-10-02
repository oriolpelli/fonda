import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AiReportButton } from "@/components/dashboard/ai-report-button";
import { StatRow } from "@/components/dashboard/stat-row";
import { loadAiActivity } from "@/lib/ai-activity";
import { getHotel } from "@/lib/auth";
import { intlLocale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { timed } from "@/lib/timing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.aiActivity.title };
}

/**
 * AI activity — "AI management", un-parked (AI_ACT_PROMPTS.md A8, ROADMAP §6).
 * What Fondas AI wrote for this hotel in the last 30 days and what happened to
 * it: the strongest thing to show a group owner, and human oversight made
 * visible. Three numbers, then the items, newest first, each with a link and
 * "Report a problem".
 *
 * Per hotel only — no staff names, no per-person counts, no ranking
 * (ROADMAP §5 #10). The page says so at its foot, because a GM will wonder.
 */
export default async function AiActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, dict }, { page }, hotel, supabase] = await Promise.all([
    params.then((p) => loadDictionary(p.lang)),
    searchParams,
    getHotel(),
    createClient(),
  ]);
  const copy = dict.aiActivity;
  const activity = hotel
    ? await timed("aiActivity.load", loadAiActivity(supabase, hotel.id, Number(page ?? "1")))
    : null;

  const tz = hotel?.timezone || "UTC";
  const when = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const number = new Intl.NumberFormat(intlLocale[locale]);
  const pageHref = (n: number) =>
    `${localizedHref(locale, "/dashboard/oversight/ai")}${n > 1 ? `?page=${n}` : ""}`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {copy.title}
        </h1>
        <p className="text-muted-foreground">
          {t(copy.desc, { hotel: hotel?.name?.trim() || "Fondas" })}
        </p>
      </header>

      {!activity ? (
        <p className="rounded-[16px] bg-card p-6 text-sm text-[var(--fonda-text-2)]">
          {copy.unavailable}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <StatRow
              columns={3}
              stats={[
                { key: "generated", label: copy.generated, value: number.format(activity.totals.generated) },
                { key: "asDrafted", label: copy.sentAsDrafted, value: number.format(activity.totals.sentAsDrafted) },
                { key: "edited", label: copy.edited, value: number.format(activity.totals.edited) },
              ]}
            />
            {activity.totals.bulk > 0 ? (
              <p className="px-1 text-[13px] text-[var(--fonda-text-2)]">
                {plural(activity.totals.bulk, copy.bulkOne, copy.bulkOther)}
              </p>
            ) : null}
          </div>

          <section aria-labelledby="ai-activity-list" className="flex flex-col gap-3">
            <h2
              id="ai-activity-list"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]"
            >
              {copy.listTitle}
            </h2>
            {activity.items.length === 0 ? (
              <p className="rounded-[16px] bg-card p-6 text-sm text-[var(--fonda-text-2)]">
                {copy.empty}
              </p>
            ) : (
              <ol className="flex flex-col overflow-hidden rounded-[16px] bg-card">
                {activity.items.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="grid grid-cols-1 gap-x-5 gap-y-1 border-t border-[var(--fonda-border-2)] px-5 py-3.5 first:border-t-0 md:grid-cols-[8.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-baseline"
                  >
                    <span className="font-mono text-[12px] tabular-nums text-[var(--fonda-text-3)]">
                      {when.format(new Date(item.at))}
                    </span>
                    <span className="min-w-0 text-[14px] text-foreground">
                      {copy.types[item.type]}
                      {item.guest ? (
                        <span className="text-[var(--fonda-text-2)]"> · {item.guest}</span>
                      ) : null}
                    </span>
                    <span className="text-[14px] text-[var(--fonda-text-2)]">
                      {copy.outcomes[item.outcome]}
                    </span>
                    <span className="text-[13px] text-[var(--fonda-text-3)]">
                      {item.model ?? copy.notRecorded}
                    </span>
                    <span className="flex items-baseline gap-4 md:justify-end">
                      <Link
                        href={localizedHref(locale, item.path)}
                        className="text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
                      >
                        {copy.open}
                      </Link>
                      <AiReportButton itemType={item.type} itemId={item.id} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {activity.pages > 1 ? (
              <nav className="flex items-center justify-between gap-4 px-1 text-[13px]">
                {activity.page > 1 ? (
                  <Link href={pageHref(activity.page - 1)} className="font-medium text-foreground">
                    {copy.newer}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="font-mono text-[var(--fonda-text-3)]">
                  {t(copy.page, { n: activity.page, total: activity.pages })}
                </span>
                {activity.page < activity.pages ? (
                  <Link href={pageHref(activity.page + 1)} className="font-medium text-foreground">
                    {copy.older}
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </section>

          <p className="text-[13px] text-[var(--fonda-text-3)]">{copy.hotelOnly}</p>
        </>
      )}
    </div>
  );
}
