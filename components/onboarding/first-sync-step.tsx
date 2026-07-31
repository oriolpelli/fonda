"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { plural, t } from "@/lib/i18n/format";

/**
 * Step 3 — pull the hotel's bookings in, then show what came back.
 *
 * This is the moment the product stops being a promise: real reservation counts
 * from their own PMS, and a brief they can read immediately rather than waiting
 * for tomorrow's 7am cron. Every number shown here comes from the sync that
 * just ran — nothing is illustrative.
 *
 * The sync starts on mount because there is nothing to decide: they connected a
 * PMS one screen ago, and a "Start sync" button would only be a step between
 * them and the payoff.
 */

type Phase = "syncing" | "synced" | "generating" | "failed";

interface SyncResult {
  reservations: number;
}

export function FirstSyncStep({
  briefTime,
  previewDoneHref,
  nextHref,
}: {
  /** When tomorrow's brief lands, already formatted (e.g. "07:00"). */
  briefTime: string;
  /** Step 4, told that a brief was generated so it can offer it. */
  previewDoneHref: string;
  /** Step 4, plain. */
  nextHref: string;
}) {
  const router = useRouter();
  const { dict } = useDictionary();

  const [phase, setPhase] = useState<Phase>("syncing");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sync", { method: "POST" });
        if (cancelled) return;
        const data = (await res.json().catch(() => null)) as
          | (Partial<SyncResult> & { error?: string })
          | null;
        if (!res.ok) {
          setError(data?.error ?? dict.onboarding.syncFailed);
          setPhase("failed");
          return;
        }
        setResult({ reservations: data?.reservations ?? 0 });
        setPhase("synced");
      } catch {
        if (cancelled) return;
        setError(dict.common.serverUnreachable);
        setPhase("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, dict]);

  function retry() {
    setError(null);
    setPhase("syncing");
    setAttempt((n) => n + 1);
  }

  /**
   * Write today's brief now rather than waiting for tomorrow's 7am cron, then
   * finish the wizard with the brief waiting as its primary action. Ending on
   * step 4 rather than dropping straight into the brief is deliberate: it is
   * the one screen that tells them about connecting their inbox.
   */
  async function generatePreview() {
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? dict.briefing.generateError);
        setPhase("synced");
        return;
      }
      router.push(previewDoneHref);
    } catch {
      setError(dict.common.serverUnreachable);
      setPhase("synced");
    }
  }

  if (phase === "syncing") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="size-6 animate-spin text-[var(--fonda-accent)]" />
        <p className="text-sm font-medium text-foreground">
          {dict.onboarding.syncing}
        </p>
        <p className="max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
          {dict.onboarding.syncingNote}
        </p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {dict.onboarding.syncFailedNote}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={retry}>{dict.common.tryAgain}</Button>
          <Button asChild variant="outline">
            <Link href={nextHref}>{dict.onboarding.continueAnyway}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const reservations = result?.reservations ?? 0;
  const busy = phase === "generating";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-[10px] bg-[var(--fonda-surface)] px-4 py-3.5">
        <p className="text-sm font-medium leading-relaxed text-foreground">
          {reservations > 0
            ? plural(
                reservations,
                dict.onboarding.syncFoundOne,
                dict.onboarding.syncFoundOther
              )
            : dict.onboarding.syncFoundNone}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {reservations > 0
            ? t(dict.onboarding.firstBriefAt, { time: briefTime })
            : dict.onboarding.syncFoundNoneNote}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button onClick={generatePreview} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {dict.onboarding.generatingPreview}
            </>
          ) : (
            dict.onboarding.generatePreview
          )}
        </Button>
        <Button asChild variant="ghost">
          <Link href={nextHref}>{dict.onboarding.skipPreview}</Link>
        </Button>
      </div>
    </div>
  );
}
