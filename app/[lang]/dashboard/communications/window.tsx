import { cookies } from "next/headers";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { EmailInbox } from "@/components/dashboard/email-inbox";
import { FirstRunState } from "@/components/dashboard/first-run-state";
import { InboxStats } from "@/components/dashboard/inbox-stats";
import { WhatsAppConnectButton } from "@/components/dashboard/whatsapp-connect-button";
import { loadInbox, type InboxEmail } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
// Server-readable sort contract — deliberately NOT imported from the client
// inbox module, whose exports become throwing client references here.
import { isSortMode, SORT_COOKIE } from "@/lib/inbox-sort";
import { localizedHref } from "@/lib/i18n/navigation";

/**
 * The body both Communications windows share (APP_UX_PROPOSAL.md §5.3).
 *
 * The two routes differ by which stay phases they own and by one card each, so
 * everything else — the Gmail first-run gate, the stats row, the server-read
 * sort cookie, the `?email=` deep link — lives here once. The pages are thin on
 * purpose: two copies of this would drift, and the sort cookie in particular
 * has to stay server-read on BOTH or the list flips after paint on one of them.
 */

/** Which window is being rendered. */
export type CommsWindowKey = "in_house" | "upcoming";

/**
 * The phases each window owns.
 *
 * Upcoming is the one that needs explaining. It owns future arrivals, and it is
 * also where `post_stay` and `unmatched` go — a guest who checked out and a
 * supplier who never booked are neither in-house nor upcoming, and they have to
 * be reachable somewhere or they are simply lost. They are held behind a chip
 * that is off by default, so the window reads as "who is coming" until you ask
 * it for everything else.
 */
export function phasesFor(
  windowKey: CommsWindowKey,
  includePast: boolean
): InboxEmail["stayPhase"][] {
  if (windowKey === "in_house") return ["in_house"];
  return includePast
    ? ["pre_arrival", "post_stay", "unmatched"]
    : ["pre_arrival"];
}

export async function CommunicationsWindow({
  lang,
  windowKey,
  query,
}: {
  lang: string;
  windowKey: CommsWindowKey;
  query: { [key: string]: string | string[] | undefined };
}) {
  const { locale, dict } = await loadDictionary(lang);
  const [inbox, cookieStore, supabase] = await Promise.all([
    loadInbox(),
    cookies(),
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

  const includePast = query.past === "1";
  const phases = phasesFor(windowKey, includePast);
  const emails = inbox.emails.filter((e) => phases.includes(e.stayPhase));

  // Read the remembered sort server-side so the list doesn't flip after paint.
  const saved = cookieStore.get(SORT_COOKIE)?.value;
  const initialSort = isSortMode(saved) ? saved : "date";

  // `?email=<id>` opens a specific message. Matched against THIS window's
  // filtered list, not the whole inbox: the parent route is what works out
  // which window a message belongs to, so an id that survives to here and is
  // absent is one that belongs to the other window, and silently selecting
  // nothing is the right outcome.
  const requested = typeof query.email === "string" ? query.email : undefined;
  const initialSelectedId = emails.some((e) => e.id === requested)
    ? requested
    : undefined;

  const isInHouse = windowKey === "in_house";
  const title = isInHouse
    ? dict.communications.inHouseTitle
    : dict.communications.upcomingTitle;
  const emptyMessage = isInHouse
    ? dict.communications.inHouseEmpty
    : dict.communications.upcomingEmpty;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.communications.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {title}
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

      {/* In-house is honestly half a channel until WhatsApp lands, so it says
          so ABOVE the list rather than instead of it: in-stay email is real
          and still has to be answered. */}
      {isInHouse ? (
        <FirstRunState
          title={dict.communications.whatsappTitle}
          body={dict.communications.whatsappBody}
          ctaSlot={
            <WhatsAppConnectButton
              label={dict.communications.whatsappCta}
              requestedLabel={dict.communications.whatsappRequested}
            />
          }
        />
      ) : null}

      {/* The past-stays chip. A link, not a toggle button: the state lives in
          the URL so it is shareable, survives a reload, and is read on the
          server — the same property the sort cookie has, for the same reason. */}
      {!isInHouse ? (
        <div>
          <Link
            href={localizedHref(
              locale,
              includePast
                ? "/dashboard/communications/upcoming"
                : "/dashboard/communications/upcoming?past=1"
            )}
            aria-pressed={includePast}
            className="inline-flex items-center rounded-full border border-[var(--fonda-border-2)] px-3 py-1 font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-2)] transition-colors hover:text-foreground aria-pressed:bg-[var(--fonda-inset)] aria-pressed:text-foreground"
          >
            {includePast
              ? dict.communications.hidePast
              : dict.communications.showPast}
          </Link>
        </div>
      ) : null}

      {!inboxConnected && emails.length === 0 ? (
        <FirstRunState
          title={dict.communications.presyncTitle}
          body={dict.communications.presyncBody}
          ctaLabel={dict.communications.presyncCta}
          ctaHref="/connect/gmail"
          external
          // The screen's one gradient is already spent on the WhatsApp card in
          // the In-house window (FONDA_SANA_REDESIGN.md §7.2).
          tone={isInHouse ? "plain" : "gradient"}
        />
      ) : (
        <EmailInbox
          emails={emails}
          emptyMessage={emptyMessage}
          emptyIcon="emails"
          initialSort={initialSort}
          initialSelectedId={initialSelectedId}
        />
      )}
    </div>
  );
}
