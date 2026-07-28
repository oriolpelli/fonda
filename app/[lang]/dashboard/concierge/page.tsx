import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { EmptyState } from "@/components/dashboard/empty-state";

/**
 * Concierge — parked, not deleted.
 *
 * In-house guests turn out to email rarely enough that a dedicated in-house
 * inbox wasn't worth splitting the guest mail over; everything now lives in
 * /dashboard/communications, where an "arrives today" note does the same job.
 * The route is held for real in-house messaging (WhatsApp and the like), where
 * the volume actually is — and it stays out of the sidebar until then.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.concierge.title };
}

export default async function ConciergePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.concierge.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.concierge.title}
        </h1>
      </div>
      <EmptyState icon="concierge" message={dict.concierge.comingSoon} />
    </div>
  );
}
