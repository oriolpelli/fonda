import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ComingSoon } from "@/components/dashboard/coming-soon";

/**
 * One guest's record — the destination of every name on the arrivals and
 * departures lists (APP_UX_PROPOSAL.md §5.2, §5.4).
 *
 * A stub until Guests v1, and deliberately the *same* stub as /dashboard/guests
 * rather than a 404: the rows link to the right place today, and the day the
 * real record ships, not one call site changes. The id is not read here — there
 * is nothing yet to read it for, and looking a guest up only to throw the row
 * away would put a PMS id in a query log for no reason.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.sidebar.guests };
}

export default async function GuestRecordPage({
  params,
}: {
  params: Promise<{ lang: string; guestId: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);
  return <ComingSoon featureKey="guests" dict={dict} />;
}
