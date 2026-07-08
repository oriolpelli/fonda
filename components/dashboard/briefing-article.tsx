import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { BriefingContent } from "@/lib/briefing";

/** Renders briefing prose: blank-line-separated paragraphs. */
function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-lg leading-relaxed text-foreground/90">
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {title}
      </h2>
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
}: {
  content: BriefingContent;
  dict: Dictionary;
}) {
  return (
    <article className="flex flex-col gap-8">
      <Prose text={content.summary} />
      <Section title={dict.briefing.arrivals} text={content.arrivals} />
      <Section title={dict.briefing.overnightEmail} text={content.emails} />
      <Section title={dict.briefing.rateAlert} text={content.rate_alert} />
    </article>
  );
}
