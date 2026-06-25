"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";

export default function Error({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{dict.error.title}</h1>
      <p className="max-w-md text-muted-foreground">{dict.error.body}</p>
      <Button onClick={() => unstable_retry()}>{dict.error.retry}</Button>
    </div>
  );
}
