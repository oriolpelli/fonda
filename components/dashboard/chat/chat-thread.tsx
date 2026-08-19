"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ArrowUpRight,
  Check,
  Hotel,
  Mail,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { ChatMessage } from "@/components/dashboard/chat/use-hotel-chat";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { LocaleLink } from "@/components/i18n/locale-link";
import { Card } from "@/components/ui/card";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The conversation, Sana-style (FONDA_SANA_REDESIGN.md §8).
 *
 * The user speaks in a light greige bubble; Fondas answers in plain prose with
 * no bubble at all — a dark bubble on one side and a grey one on the other is
 * the chatbot tell the redesign is removing. Around the answer sit the two
 * things that make it read as grounded rather than generated: a source chip
 * naming the data it was built from, and a quiet status line while it works.
 */

/**
 * A small rounded chip naming a piece of context the answer was built from
 * (§8.2). Neutral by construction — chips are chrome, and chrome is colorless.
 */
function SourceChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[12px] leading-none text-[var(--fonda-text-2)] ring-1 ring-[var(--fonda-border)]">
      <Icon
        aria-hidden="true"
        className="size-3.5 text-[var(--fonda-text-3)]"
        strokeWidth={1.5}
      />
      {label}
    </span>
  );
}

/**
 * The working line: a soft pulsing dot and a plain-language description of what
 * Fondas is doing, resolving to a muted "Done" (§8.2). Not a spinner — spinners
 * read as loading chrome; this reads as someone working.
 *
 * The pulse is `animate-pulse`, which the global `prefers-reduced-motion` rule
 * in globals.css collapses to a static dot. No extra guard needed here.
 */
function StatusLine({ label, working }: { label: string; working: boolean }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-[13px] leading-none text-[var(--fonda-text-3)]"
    >
      {working ? (
        <span
          aria-hidden="true"
          className="size-1.5 animate-pulse rounded-full bg-[var(--fonda-text-3)]"
        />
      ) : (
        <Check aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
      )}
      {label}
    </span>
  );
}

/**
 * A concrete result — today only the draft hand-off (§8.4). White card, leading
 * icon, timestamp, hairline, then the one value and a quiet "Open" link. This
 * replaces the accent-tinted pill the widget used to show: a result is content,
 * but it isn't a signal, so it gets no color.
 */
function DraftResultCard({
  at,
  locale,
  dict,
  nested,
  onNavigate,
}: {
  at: number | undefined;
  locale: Locale;
  dict: Dictionary;
  nested: boolean;
  onNavigate?: () => void;
}) {
  const time = useMemo(
    () =>
      at
        ? new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(at))
        : "",
    [at, locale]
  );

  return (
    <Card nested={nested} className="mt-3 max-w-[420px] rounded-[16px]">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span
          aria-hidden="true"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--fonda-surface-2)] text-[var(--fonda-text-2)]"
        >
          <Mail className="size-3.5" strokeWidth={1.5} />
        </span>
        <span className="text-[14px] font-medium text-[var(--fonda-text)]">
          {dict.askYourHotel.draftTitle}
        </span>
        {time ? (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--fonda-text-3)]">
            {time}
          </span>
        ) : null}
      </div>
      <div className="h-px bg-[var(--fonda-border)]" />
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-[var(--fonda-text-2)]">
          {dict.askYourHotel.draftBody}
        </p>
        <LocaleLink
          href="/dashboard/communications"
          onClick={onNavigate}
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--fonda-text)] transition-colors hover:text-[var(--fonda-text-2)]"
        >
          {dict.askYourHotel.draftOpen}
          <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        </LocaleLink>
      </div>
    </Card>
  );
}

/** Right-aligned light bubble + a small avatar disc (§8.1). */
function UserTurn({ content, initial, label }: { content: string; initial: string; label: string }) {
  return (
    <div className="flex items-start justify-end gap-2.5">
      <p className="max-w-[80%] whitespace-pre-line rounded-[16px] bg-[var(--fonda-surface-2)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--fonda-text)]">
        {/* The bubble/plain-prose distinction is purely visual, so each turn
            names its speaker for a screen reader. */}
        <span className="sr-only">{label}: </span>
        {content}
      </p>
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--fonda-inset)] font-mono text-[11px] font-medium leading-none text-[var(--fonda-text-2)]"
      >
        {initial}
      </span>
    </div>
  );
}

/** Plain prose, no bubble, no background — with the meta row above it. */
function AssistantTurn({
  message,
  working,
  locale,
  dict,
  nested,
  onNavigate,
}: {
  message: ChatMessage;
  working: boolean;
  locale: Locale;
  dict: Dictionary;
  nested: boolean;
  onNavigate?: () => void;
}) {
  const status = working
    ? message.intent === "draft"
      ? dict.askYourHotel.statusDrafting
      : dict.askYourHotel.statusWorking
    : dict.askYourHotel.statusDone;

  return (
    <div className="relative pl-6">
      <Sparkles
        aria-hidden="true"
        className="absolute left-0 top-[3px] size-[14px] text-[var(--fonda-text-3)]"
        strokeWidth={1.5}
      />
      {/* Every answer is built from the hotel's own cached data — the chip says
          so on every turn because it is true on every turn. */}
      <div className="flex flex-wrap items-center gap-2">
        <SourceChip icon={Hotel} label={dict.askYourHotel.sourceHotelData} />
        <StatusLine label={status} working={working} />
      </div>
      {message.content ? (
        <p className="mt-2.5 max-w-[68ch] whitespace-pre-line text-[15px] leading-[1.65] text-[var(--fonda-text)]">
          <span className="sr-only">{dict.askYourHotel.assistant}: </span>
          {message.content}
        </p>
      ) : null}
      {message.draftId ? (
        <DraftResultCard
          at={message.draftAt}
          locale={locale}
          dict={dict}
          nested={nested}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}

export function ChatThread({
  messages,
  streaming,
  userEmail,
  nested = false,
  onNavigate,
  className,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  /** Only the initial is shown — the address itself never renders. */
  userEmail: string;
  /** True when the thread sits inside a white panel: result cards take the
      hairline treatment instead of the floating shadow (§6). */
  nested?: boolean;
  /** Fired when a result-card link navigates away (lets the panel close). */
  onNavigate?: () => void;
  className?: string;
}) {
  const { dict, locale } = useDictionary();
  const endRef = useRef<HTMLDivElement>(null);
  const initial = userEmail.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    // `nearest` keeps a streaming answer from yanking the whole page around
    // when the end of the thread is already on screen.
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  return (
    <div className={cn("flex flex-col gap-7", className)}>
      {messages.map((m, i) =>
        m.role === "user" ? (
          <UserTurn
            key={i}
            content={m.content}
            initial={initial}
            label={dict.askYourHotel.you}
          />
        ) : (
          <AssistantTurn
            key={i}
            message={m}
            working={streaming && i === messages.length - 1}
            locale={locale}
            dict={dict}
            nested={nested}
            onNavigate={onNavigate}
          />
        )
      )}
      <div ref={endRef} />
    </div>
  );
}
