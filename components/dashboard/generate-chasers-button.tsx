"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  generateChasers,
  type GenerateChasersError,
} from "@/app/[lang]/dashboard/arrivals/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";

/**
 * "Generate chasers" — the arrivals page's one action, at the right of its
 * header (APP_UX_PROPOSAL.md §5.2).
 *
 * It used to live inside the chaser grid's toolbar, which meant it disappeared
 * on exactly the day you needed it: a hotel with no pending chasers saw the
 * grid's empty state and no way to ask for any. In the header it belongs to the
 * page, not to the queue.
 *
 * Errors are shown as text under the button rather than thrown: a failed
 * generation is usually a missing key or an unreachable model, and the rest of
 * the day's arrivals are still worth reading.
 *
 * The action reports a code, not a sentence — it has no locale to write one in
 * (see `GenerateChasersError`). The wording is chosen here, where the dictionary
 * is, so an es/ca session gets its own language and no vendor error text ever
 * reaches the screen.
 */
export function GenerateChasersButton({ label }: { label: string }) {
  const { dict } = useDictionary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<GenerateChasersError | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await generateChasers();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} disabled={pending} variant="outline" size="sm">
        {label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {dict.arrivals.chaserErrors[error]}
        </p>
      ) : null}
    </div>
  );
}
