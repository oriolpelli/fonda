import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ComingSoon } from "@/components/dashboard/coming-soon";

/**
 * Concierge — parked, not deleted.
 *
 * In-house guests turn out to email rarely enough that a dedicated in-house
 * inbox wasn't worth splitting the guest mail over; everything now lives in
 * /dashboard/communications, where an "arrives today" note does the same job.
 * The route is held for real in-house messaging (WhatsApp and the like), where
 * the volume actually is — and it stays out of the sidebar until then
 * (`inNav: false` in lib/roadmap.ts). The page still has to be presentable: a
 * bookmark or an old link can land here.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.sidebar.concierge };
}

export default async function ConciergePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);
  return <ComingSoon featureKey="concierge" dict={dict} />;
}
