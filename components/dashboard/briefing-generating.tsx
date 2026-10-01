"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { aiFailureText } from "@/lib/ai-failure";

/**
 * Shown when no briefing exists for today. Kicks off generation once on mount,
 * then refreshes the route so the server component renders the new briefing.
 */
export function BriefingGenerating() {
  const router = useRouter();
  const { dict } = useDictionary();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/briefing", { method: "POST" });
        if (cancelled) {
          // Left the page mid-generation. The brief exists now, but Home and
          // this page may be held in the client router cache (staleTimes) with
          // "no brief yet" — a refresh clears it from wherever the user is.
          if (res.ok) router.refresh();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          // Server sends a code (lib/ai-failure.ts), never provider text.
        setError(aiFailureText(dict, data?.error) ?? dict.briefing.generateError);
          return;
        }
        router.refresh();
      } catch {
        if (!cancelled) setError(dict.common.serverUnreachable);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, dict]);

  function retry() {
    started.current = false;
    setError(null);
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button onClick={retry} variant="outline">
          {dict.common.tryAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-lg">{dict.briefing.generating}</p>
    </div>
  );
}
