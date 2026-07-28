import type { Metadata } from "next";
import { cookies } from "next/headers";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import {
  EmailInbox,
  isSortMode,
  SORT_COOKIE,
} from "@/components/dashboard/email-inbox";
import { InboxStats } from "@/components/dashboard/inbox-stats";
import { loadInbox } from "@/lib/inbox";

/**
 * Communications — the single guest-email inbox. Every guest message lands
 * here, whatever stay phase the sender is in and whether or not a booking
 * matched; urgency notes and the sort toggle do the triage that a separate
 * in-house inbox used to.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.communications.title };
}

export default async function CommunicationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);
  const [inbox, cookieStore] = await Promise.all([loadInbox(), cookies()]);

  // Read the remembered sort server-side so the list doesn't flip after paint.
  const saved = cookieStore.get(SORT_COOKIE)?.value;
  const initialSort = isSortMode(saved) ? saved : "date";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.communications.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.communications.title}
        </h1>
        <InboxStats
          dict={dict}
          draftsReady={inbox.draftsReady}
          sentToday={inbox.sentToday}
          avgResponseHours={inbox.avgResponseHours}
        />
      </div>

      <EmailInbox
        emails={inbox.emails}
        emptyMessage={dict.communications.emptyState}
        emptyIcon="emails"
        initialSort={initialSort}
      />
    </div>
  );
}
