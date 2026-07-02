import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.analytics.title };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.analytics.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.analytics.title}
        </h1>
      </div>
      <div className="rounded-lg border border-border bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
        {dict.analytics.emptyState}
      </div>
    </div>
  );
}
