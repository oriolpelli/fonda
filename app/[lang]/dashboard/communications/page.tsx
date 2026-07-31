import type { Metadata } from "next";
import { cookies } from "next/headers";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { EmailInbox } from "@/components/dashboard/email-inbox";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { InboxStats } from "@/components/dashboard/inbox-stats";
import { loadInbox } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
// Server-readable sort contract — deliberately NOT imported from the client
// inbox module, whose exports become throwing client references here.
import { isSortMode, SORT_COOKIE } from "@/lib/inbox-sort";

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
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { dict } = await loadDictionary((await params).lang);
  const [inbox, cookieStore, query, supabase] = await Promise.all([
    loadInbox(),
    cookies(),
    searchParams,
    createClient(),
  ]);

  // This inbox is fed by Gmail, not the PMS — a hotel can be fully synced and
  // still have nothing here. "No guest messages right now" would be a lie when
  // the real answer is that no mailbox is connected yet.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("gmail_email")
    .maybeSingle();
  const inboxConnected = Boolean(hotel?.gmail_email);

  // Read the remembered sort server-side so the list doesn't flip after paint.
  const saved = cookieStore.get(SORT_COOKIE)?.value;
  const initialSort = isSortMode(saved) ? saved : "date";

  // `?email=<id>` opens a specific message — the dashboard's "needs a reply"
  // card and to-do items link straight to the one they name. Ignored unless it
  // matches a message this hotel can actually see, so the parameter can't be
  // used to probe for ids belonging to another hotel.
  const requested = typeof query.email === "string" ? query.email : undefined;
  const initialSelectedId = inbox.emails.some((e) => e.id === requested)
    ? requested
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.communications.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.communications.title}
        </h1>
        {inboxConnected ? (
          <InboxStats
            dict={dict}
            draftsReady={inbox.draftsReady}
            sentToday={inbox.sentToday}
            avgResponseHours={inbox.avgResponseHours}
          />
        ) : null}
      </div>

      {!inboxConnected && inbox.emails.length === 0 ? (
        <FirstRunState
          title={dict.communications.presyncTitle}
          body={dict.communications.presyncBody}
          ctaLabel={dict.communications.presyncCta}
          ctaHref="/connect/gmail"
          external
        />
      ) : (
        <EmailInbox
          emails={inbox.emails}
          emptyMessage={dict.communications.emptyState}
          emptyIcon="emails"
          initialSort={initialSort}
          initialSelectedId={initialSelectedId}
        />
      )}
    </div>
  );
}
