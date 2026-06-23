"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

// Scoped to the dashboard: the header/nav (in the layout) stays mounted, only
// the page content is replaced with this fallback.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        We couldn&apos;t load this page
      </h1>
      <p className="max-w-md text-muted-foreground">
        Something went wrong fetching your hotel data — this can happen if the
        PMS or email connection is temporarily unavailable.
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
