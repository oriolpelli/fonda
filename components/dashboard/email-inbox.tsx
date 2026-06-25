"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveAllStandard,
  flagEmail,
  ignoreEmail,
  sendReply,
} from "@/app/[lang]/dashboard/emails/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { intlLocale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export interface InboxEmail {
  id: string;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  classification: string | null;
  draft_reply: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
}

// Quiet, neutral badges (one signal only). Negative categories that need
// attention get the single destructive tint; everything else stays neutral.
const NEUTRAL = "bg-[var(--fonda-surface)] text-[var(--fonda-text-2)]";
const NEGATIVE = "bg-destructive/10 text-destructive";
const MUTED = "bg-[var(--fonda-surface)] text-[var(--fonda-text-3)]";

const BADGE_CLASS: Record<string, string> = {
  complaint: NEGATIVE,
  cancellation_request: NEGATIVE,
  irrelevant: MUTED,
};

function badgeClass(classification: string | null): string {
  if (!classification) return MUTED;
  return BADGE_CLASS[classification] ?? NEUTRAL;
}

export function EmailInbox({ emails }: { emails: InboxEmail[] }) {
  const router = useRouter();
  const { dict, locale } = useDictionary();
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const badges = dict.emails.badges as Record<string, string>;
  function badgeLabel(classification: string | null): string {
    if (!classification) return dict.emails.badges.processing;
    return badges[classification] ?? classification;
  }

  function senderName(email: string | null): string {
    return email || dict.emails.unknownSender;
  }

  function shortTime(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return new Intl.DateTimeFormat(intlLocale[locale], {
      ...(sameDay
        ? { hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "short" }),
    }).format(d);
  }

  const selected = emails.find((e) => e.id === selectedId) ?? null;
  const complaints = emails.filter((e) => e.status === "needs_attention");
  const standardCount = emails.filter(
    (e) =>
      e.status === "pending" &&
      e.draft_reply &&
      (e.classification === "arrival_info" ||
        e.classification === "general_inquiry")
  ).length;

  function run(fn: () => Promise<{ error?: string } | void>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSend() {
    if (!selected) return;
    const content = draftRef.current?.value ?? "";
    run(() => sendReply(selected.id, content));
  }

  function handleBulk() {
    if (standardCount === 0) return;
    if (
      !window.confirm(
        plural(
          standardCount,
          dict.emails.confirmBulkOne,
          dict.emails.confirmBulkOther
        )
      )
    ) {
      return;
    }
    run(async () => {
      const result = await approveAllStandard();
      return result.error ? { error: result.error } : undefined;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {complaints.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          {plural(
            complaints.length,
            dict.emails.needAttentionBannerOne,
            dict.emails.needAttentionBannerOther
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {plural(emails.length, dict.emails.countOne, dict.emails.countOther)}
        </p>
        <Button
          onClick={handleBulk}
          disabled={pending || standardCount === 0}
          variant="outline"
          size="sm"
        >
          {t(dict.emails.approveAllStandard, { count: standardCount })}
        </Button>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {actionError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Left: list */}
        <div className="flex max-h-[70vh] flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {emails.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {dict.emails.noEmails}
            </p>
          ) : (
            emails.map((email) => {
              const isSelected = email.id === selectedId;
              return (
                <button
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted",
                    isSelected && "bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {senderName(email.from_email)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {shortTime(email.created_at)}
                    </span>
                  </div>
                  <span className="truncate text-sm text-muted-foreground">
                    {email.subject || dict.emails.noSubject}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        badgeClass(email.classification)
                      )}
                    >
                      {badgeLabel(email.classification)}
                    </span>
                    {email.status === "sent" ? (
                      <span className="text-xs font-medium text-[var(--fonda-accent)]">
                        {dict.emails.sent}
                      </span>
                    ) : email.status === "ignored" ? (
                      <span className="text-xs text-muted-foreground">
                        {dict.emails.ignored}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: detail */}
        <div className="rounded-lg border border-border p-5">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold">
                  {selected.subject || dict.emails.noSubject}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(dict.emails.from, {
                    sender: senderName(selected.from_email),
                    time: shortTime(selected.created_at),
                  })}
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-3 text-sm">
                {selected.body || dict.emails.emptyMessage}
              </div>

              {selected.status === "sent" ? (
                <p className="text-sm font-medium text-[var(--fonda-accent)]">
                  {selected.sent_at
                    ? t(dict.emails.replySentAt, {
                        time: shortTime(selected.sent_at),
                      })
                    : dict.emails.replySent}
                </p>
              ) : (
                <>
                  {selected.status === "needs_attention" ? (
                    <p className="text-sm font-medium text-destructive">
                      {dict.emails.needsAttentionNote}
                    </p>
                  ) : (
                    <label className="text-sm font-medium" htmlFor="draft">
                      {dict.emails.draftLabel}
                    </label>
                  )}
                  <textarea
                    id="draft"
                    key={selected.id}
                    ref={draftRef}
                    defaultValue={selected.draft_reply ?? ""}
                    rows={10}
                    className="w-full rounded-[10px] border border-input bg-popover p-3 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent"
                    placeholder={dict.emails.replyPlaceholder}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSend} disabled={pending}>
                      {pending ? dict.emails.sending : dict.emails.send}
                    </Button>
                    {selected.status !== "needs_attention" ? (
                      <Button
                        onClick={() => run(() => flagEmail(selected.id))}
                        disabled={pending}
                        variant="outline"
                      >
                        {dict.emails.needsAttention}
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => run(() => ignoreEmail(selected.id))}
                      disabled={pending}
                      variant="ghost"
                    >
                      {dict.emails.ignore}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.emails.selectPrompt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
