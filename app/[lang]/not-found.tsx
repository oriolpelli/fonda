import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

// Rendered both for in-locale misses AND for invalid locales (the layout calls
// notFound() before mounting the DictionaryProvider), so this must NOT depend
// on the dictionary context. Links to "/" — the proxy localizes it.
export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Wordmark href="/" />
      <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
        Page not found
      </h1>
      <p className="max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
