import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * "Finish setup — connect your PMS."
 *
 * Shown on every dashboard page while no PMS is connected, because skipping
 * that step in the wizard leaves the whole product empty and there is otherwise
 * nothing on screen explaining why. It links back into the wizard rather than
 * into Settings: setup is a guided flow that ends in a real brief, and burying
 * the one thing a new hotel must do in Settings is the problem B10 exists to
 * fix.
 *
 * It disappears the moment a PMS is connected — there is no dismiss, and no
 * "completed" flag to go stale, because the hotel row already answers the only
 * question that matters.
 */
export function SetupBanner({
  href,
  title,
  body,
  cta,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--fonda-accent)]/25 bg-[var(--fonda-accent-light)] px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm leading-relaxed text-[var(--fonda-text-2)]">
          {body}
        </span>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--fonda-accent)] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--fonda-accent-hover)]"
      >
        {cta}
        <ArrowRight className="size-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}
