"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquarePlus, PanelLeft } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { ChatThreadSummary } from "@/lib/chat-threads";
import { cn } from "@/lib/utils";

/**
 * The conversation list inside /dashboard/chat (APP_UX_PROPOSAL.md §4.1).
 *
 * INSIDE the page, not in the sidebar. The nav stays five sections — a growing
 * list of conversations is content, and content that grows without bound does
 * not belong in chrome.
 *
 * 240px from `lg`, a disclosure below it. Selecting a thread is a navigation
 * (`?thread=<id>`), not client state, so a conversation is linkable, survives a
 * reload and can be opened in a new tab — the same reason the inbox's sort and
 * queue live in a cookie and its deep links in the URL.
 */
export function ChatThreadList({ threads }: { threads: ChatThreadSummary[] }) {
  const { dict } = useDictionary();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("thread");
  const [open, setOpen] = useState(false);

  const rows = (
    <>
      <Link
        href={pathname}
        className="mb-1 flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-[var(--fonda-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)]"
      >
        <MessageSquarePlus
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0"
        />
        {dict.askYourHotel.newConversation}
      </Link>

      {threads.length === 0 ? (
        <p className="px-2.5 py-2 text-[13px] text-[var(--fonda-text-3)]">
          {dict.askYourHotel.threadsEmpty}
        </p>
      ) : null}

      {threads.map((thread) => {
        const isActive = thread.id === active;
        return (
          <Link
            key={thread.id}
            href={`${pathname}?thread=${thread.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col gap-0.5 rounded-[8px] px-2.5 py-[7px] transition-colors",
              isActive
                ? "bg-[var(--fonda-inset)] text-[var(--fonda-text)]"
                : "text-[var(--fonda-text-2)] hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)] hover:text-foreground"
            )}
          >
            <span className="truncate text-[13px] font-medium">
              {thread.title?.trim() || dict.askYourHotel.untitled}
            </span>
            <span className="font-mono text-[10px] text-[var(--fonda-text-3)]">
              {thread.lastMessageLabel}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Below `lg`: a disclosure, so the conversation itself owns the width. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-[var(--fonda-text-2)] transition-colors hover:text-foreground"
        >
          <PanelLeft aria-hidden="true" strokeWidth={1.5} className="size-4" />
          {open
            ? dict.askYourHotel.closeThreads
            : dict.askYourHotel.openThreads}
        </button>
        {open ? (
          <nav
            aria-label={dict.askYourHotel.threads}
            className="mt-2 flex flex-col rounded-[16px] bg-card p-2"
          >
            {rows}
          </nav>
        ) : null}
      </div>

      {/* From `lg`: a permanent column. */}
      <nav
        aria-label={dict.askYourHotel.threads}
        className="hidden w-[240px] shrink-0 flex-col self-start rounded-[16px] bg-card p-2 lg:flex"
      >
        {rows}
      </nav>
    </>
  );
}
