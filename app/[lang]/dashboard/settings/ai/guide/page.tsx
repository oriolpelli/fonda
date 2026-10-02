import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { getHotel } from "@/lib/auth";
import { AI_LITERACY_VERSION } from "@/lib/ai-literacy";
import { t } from "@/lib/i18n/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.ai.literacy.title };
}

/**
 * "Working with Fondas AI" on one sheet of paper (A6): the five cards, for the
 * staff-room wall or the induction folder. On screen it is a plain page in the
 * dashboard; printed, the dashboard's chrome drops away (`print:hidden` in the
 * layout) and the cards sit two to a row in a compact type scale, so the whole
 * thing fits one A4 page in all three languages.
 */
export default async function AiGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const [{ dict }, hotel] = await Promise.all([
    loadDictionary((await params).lang),
    getHotel(),
  ]);
  const copy = dict.ai.literacy;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 print:max-w-none print:gap-4 print:text-black">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <header className="flex flex-col gap-1">
        {hotel?.name ? (
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
            {hotel.name}
          </span>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground print:text-[22pt]">
          {copy.title}
        </h1>
      </header>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        {copy.cards.map((card, i) => (
          <li
            key={card.title}
            className="flex break-inside-avoid flex-col gap-2 rounded-[16px] bg-card p-5 print:rounded-[8px] print:border print:border-[var(--fonda-border)] print:bg-transparent print:p-3.5"
          >
            <span className="font-mono text-[11px] text-[var(--fonda-text-3)] print:text-[8pt]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground print:text-[11.5pt]">
              {card.title}
            </h2>
            <p className="text-[14px] leading-[1.55] text-[var(--fonda-text-2)] print:text-[9.5pt] print:leading-[1.45]">
              {card.body}
            </p>
          </li>
        ))}
      </ol>

      <footer className="font-mono text-[11px] text-[var(--fonda-text-3)] print:text-[8pt]">
        {t(dict.settings.aiPage.guideFooter, { version: AI_LITERACY_VERSION })}
      </footer>
    </article>
  );
}
