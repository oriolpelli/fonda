"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { useDictionary } from "@/components/i18n/dictionary-provider";
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
  const { dict } = useDictionary();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        {dict.error.dashboardTitle}
      </h1>
      <p className="max-w-md text-muted-foreground">{dict.error.dashboardBody}</p>
      <Button onClick={() => unstable_retry()}>{dict.error.retry}</Button>
    </div>
  );
}
