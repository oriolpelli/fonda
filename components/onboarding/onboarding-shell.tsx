import type { Dictionary } from "@/app/[lang]/dictionaries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { t } from "@/lib/i18n/format";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * One step of the setup wizard: the counter, the progress rule, a title and a
 * description, around whatever that step needs.
 *
 * Every step renders through this so the four screens can't drift apart. The
 * card itself is only chrome — the step pages own their own footers, because a
 * step's actions differ too much to generalise (a form submit, a skip link, a
 * pair of buttons after a sync).
 */
export function OnboardingShell({
  step,
  title,
  description,
  dict,
  framed = true,
  children,
}: {
  step: number;
  title: string;
  description: string;
  dict: Dictionary;
  /**
   * False when the step's own content is already made of cards — the PMS
   * connectors on step 2. A card inside a card is two borders saying the same
   * thing, so that step gets a plain header and lets its cards be the frame.
   */
  framed?: boolean;
  children: React.ReactNode;
}) {
  const header = (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {t(dict.onboarding.stepLabel, {
          current: step,
          total: ONBOARDING_TOTAL_STEPS,
        })}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: ONBOARDING_TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-[var(--fonda-accent)]" : "bg-[var(--fonda-inset)]"
            )}
          />
        ))}
      </div>
    </>
  );

  if (!framed) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <div>
          {header}
          <h1 className="mt-4 text-xl font-semibold tracking-[-0.01em]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        {header}
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
