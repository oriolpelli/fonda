import type { Metadata } from "next";

import {
  EmailInbox,
  type InboxEmail,
} from "@/components/dashboard/email-inbox";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Emails" };

// Urgency order: complaints (flagged) → pending drafts → sent → ignored.
const STATUS_RANK: Record<string, number> = {
  needs_attention: 0,
  pending: 1,
  sent: 2,
  ignored: 3,
};

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default async function EmailsPage() {
  const supabase = await createClient();

  // RLS scopes emails to the caller's hotel.
  const { data } = await supabase
    .from("emails")
    .select(
      "id, from_email, subject, body, classification, draft_reply, status, created_at, sent_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const emails: InboxEmail[] = (data ?? []).slice().sort((a, b) => {
    const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (rank !== 0) return rank;
    return b.created_at.localeCompare(a.created_at);
  });

  // Stats.
  const draftsReady = emails.filter(
    (e) => e.status === "pending" && e.draft_reply
  ).length;
  const sentToday = emails.filter(
    (e) => e.status === "sent" && e.sent_at && isToday(e.sent_at)
  ).length;

  const responded = emails.filter((e) => e.status === "sent" && e.sent_at);
  const avgHours =
    responded.length > 0
      ? responded.reduce(
          (sum, e) =>
            sum +
            (new Date(e.sent_at!).getTime() - new Date(e.created_at).getTime()) /
              3_600_000,
          0
        ) / responded.length
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
        <p className="text-muted-foreground">
          {draftsReady} draft{draftsReady === 1 ? "" : "s"} ready ·{" "}
          {sentToday} sent today · Average response time:{" "}
          {avgHours === null ? "—" : `${avgHours.toFixed(1)} hours`}
        </p>
      </div>

      <EmailInbox emails={emails} />
    </div>
  );
}
