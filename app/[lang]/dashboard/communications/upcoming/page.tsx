import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { CommunicationsWindow } from "../window";

/**
 * Upcoming stays — messages from guests who have not arrived yet
 * (APP_UX_PROPOSAL.md §5.3), plus past stays and unmatched mail behind a chip
 * that is off by default. See `phasesFor` for why those two live here.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.communications.upcomingTitle };
}

export default async function CommunicationsUpcomingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  return (
    <CommunicationsWindow lang={lang} windowKey="upcoming" query={query} />
  );
}
