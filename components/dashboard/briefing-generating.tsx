"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shown when no briefing exists for today. Kicks off generation once on mount,
 * then refreshes the route so the server component renders the new briefing.
 */
export function BriefingGenerating() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/briefing", { method: "POST" });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(data?.error ?? "Couldn't generate your briefing.");
          return;
        }
        router.refresh();
      } catch {
        if (!cancelled) setError("Couldn't reach the server.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-lg">Generating your briefing…</p>
    </div>
  );
}
