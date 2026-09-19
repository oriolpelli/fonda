import type { Dictionary } from "@/app/[lang]/dictionaries";
import { SourceChip } from "@/components/dashboard/source-chip";
import type { BriefingContent } from "@/lib/briefing";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";

/**
 * Renders briefing prose: blank-line-separated paragraphs.
 *
 * Capped at 60ch (design identity §3, "body never exceeds ~60ch"). This is a
 * document a GM reads top to bottom at 6:45am, so the measure matters more here
 * than anywhere else in the app — the container is wider than that on a laptop,
 * and 18px text run to its full width is tiring to read.
 *
 * Except in print: /sample-brief's A4 rules are tuned to land on one sheet, and
 * a narrower measure would run it onto a second page.
 */
function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="flex max-w-[60ch] flex-col gap-4 print:max-w-none">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-lg leading-relaxed text-foreground/90">
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function Section({
  title,
  text,
  source,
}: {
  title: string;
  text: string;
  /** One chip, or none. §7.4's whole instruction here is restraint. */
  source?: string | null;
}) {
  return (
    <section className="border-t border-border pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {title}
        </h2>
        {source ? <SourceChip label={source} /> : null}
      </div>
      <Prose text={text} />
    </section>
  );
}

/**
 * Shared rendering for one briefing's content — used by both the live
 * Morning Brief page (today) and the brief history detail page (past days).
 */
export function BriefingArticle({
  content,
  dict,
  locale,
}: {
  content: BriefingContent;
  dict: Dictionary;
  locale: Locale;
}) {
  /**
   * Provenance is optional and absent on every brief written before it
   * existed. An old brief renders no chips, which is the honest outcome — we
   * genuinely do not know what it was built from, and a backfilled guess would
   * be worse than a blank.
   */
  const p = content.provenance;
  const copy = dict.briefing.provenance;

  const pmsChip = p
    ? p.syncedAt
      ? `${copy.fromPms} · ${t(copy.syncedAt, {
          time: new Intl.DateTimeFormat(intlLocale[locale], {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(p.syncedAt)),
        })}`
      : copy.fromPms
    : null;

  return (
    <article className="flex flex-col gap-8">
      <Prose text={content.summary} />
      <Section
        title={dict.briefing.arrivals}
        text={content.arrivals}
        source={pmsChip}
      />
      <Section
        title={dict.briefing.overnightEmail}
        text={content.emails}
        source={p?.usedInbox ? copy.fromGmail : null}
      />
      <Section
        title={dict.briefing.rateAlert}
        text={content.rate_alert}
        source={pmsChip}
      />
    </article>
  );
}
