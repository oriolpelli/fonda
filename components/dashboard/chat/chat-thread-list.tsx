"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquarePlus, PanelLeft, Trash2 } from "lucide-react";

import {
  clearChatHistory,
  deleteChatThread,
} from "@/app/[lang]/dashboard/chat/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { ChatThreadSummary } from "@/lib/chat-threads";
import { plural, t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * The conversation list inside /dashboard/chat (APP_UX_PROPOSAL.md §4.1, and
 * §11 #11 for the 1 Oct changes).
 *
 * INSIDE the page, not in the sidebar — but from `lg` it sits flush against
 * the sidebar as its own full-height column, so the two read as one piece of
 * chrome and the conversation gets the rest of the width. Below `lg` it is a
 * disclosure, so the conversation owns the screen.
 *
 * Capped at the user's last `limit` conversations; older ones are deleted when
 * a new one starts (lib/chat-threads.ts). Each row can be deleted, and "Clear
 * history" deletes them all — both with an inline confirm, never a native
 * dialog, and both through RLS as the signed-in user (migration 0027).
 *
 * Selecting a thread is a navigation (`?thread=<id>`), not client state, so a
 * conversation is linkable, survives a reload and can be opened in a new tab.
 */
export function ChatThreadList({
  threads,
  limit,
  onNewConversation,
}: {
  threads: ChatThreadSummary[];
  /** How many conversations are kept — for the note under the list. */
  limit: number;
  /** Clears the conversation on screen — see chat-surface.tsx. */
  onNewConversation?: () => void;
}) {
  const { dict } = useDictionary();
  const copy = dict.askYourHotel;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("thread");
  const [open, setOpen] = useState(false);
  // Which inline confirm is showing: a thread id, "all", or none.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // The safe button takes focus when a confirm opens, so Enter cancels.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  function afterDelete(clearedActive: boolean) {
    setConfirming(null);
    if (clearedActive) {
      // The open conversation is gone: land on a fresh one.
      onNewConversation?.();
      router.replace(pathname);
    } else {
      router.refresh();
    }
  }

  function deleteOne(id: string) {
    setError(null);
    startTransition(async () => {
      const { ok } = await deleteChatThread(id);
      if (!ok) {
        setError(copy.deleteFailed);
        return;
      }
      afterDelete(id === active);
    });
  }

  function deleteAll() {
    setError(null);
    startTransition(async () => {
      const { ok } = await clearChatHistory();
      if (!ok) {
        setError(copy.deleteFailed);
        return;
      }
      afterDelete(true);
    });
  }

  /** Two quiet buttons; Escape or Cancel closes, the other one deletes. */
  const confirmButtons = (onConfirm: () => void, confirmLabel: string) => (
    <div
      className="flex items-center justify-end gap-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setConfirming(null);
        }
      }}
    >
      <button
        ref={cancelRef}
        type="button"
        onClick={() => setConfirming(null)}
        disabled={pending}
        className="rounded-[8px] px-2 py-1 text-[12px] text-[var(--fonda-text-2)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)] hover:text-[var(--fonda-text)]"
      >
        {copy.cancel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="rounded-[8px] px-2 py-1 text-[12px] font-medium text-[var(--destructive)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)] disabled:opacity-60"
      >
        {confirmLabel}
      </button>
    </div>
  );

  const rows = (
    <>
      <Link
        href={pathname}
        onClick={() => {
          onNewConversation?.();
          setOpen(false);
        }}
        className="mb-1 flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-[var(--fonda-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)]"
      >
        <MessageSquarePlus
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0"
        />
        {copy.newConversation}
      </Link>

      {threads.length === 0 ? (
        <p className="px-2.5 py-2 text-[13px] text-[var(--fonda-text-3)]">
          {copy.threadsEmpty}
        </p>
      ) : null}

      {threads.map((thread) => {
        const isActive = thread.id === active;
        const title = thread.title?.trim() || copy.untitled;
        return (
          <div key={thread.id}>
            <div
              className={cn(
                "group relative flex items-center rounded-[8px] transition-colors",
                isActive
                  ? "bg-[var(--fonda-inset)] text-[var(--fonda-text)]"
                  : "text-[var(--fonda-text-2)] hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)] hover:text-foreground"
              )}
            >
              <Link
                href={`${pathname}?thread=${thread.id}`}
                aria-current={isActive ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col gap-0.5 py-[7px] pl-2.5 pr-9"
              >
                <span className="truncate text-[13px] font-medium">{title}</span>
                {/* text-2 on the active row: text-3 fails AA on the inset
                    fill (FONDA_SANA_REDESIGN.md §0.1 rule 1). */}
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isActive
                      ? "text-[var(--fonda-text-2)]"
                      : "text-[var(--fonda-text-3)]"
                  )}
                >
                  {thread.lastMessageLabel}
                </span>
              </Link>
              {/* A sibling of the link, never inside it (a button in an <a>
                  is invalid). Shown on hover or focus; always on touch
                  screens, which have no hover. */}
              <button
                type="button"
                aria-label={`${copy.deleteConversation}: ${title}`}
                onClick={() => setConfirming(thread.id)}
                disabled={pending}
                className={cn(
                  "absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] opacity-0 transition-opacity hover:bg-[var(--fonda-inset)] hover:text-[var(--fonda-text)] focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                  isActive
                    ? "text-[var(--fonda-text-2)]"
                    : "text-[var(--fonda-text-3)]",
                  confirming === thread.id && "opacity-100"
                )}
              >
                <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
              </button>
            </div>
            {confirming === thread.id ? (
              <div className="px-1 pb-1.5 pt-1">
                {confirmButtons(() => deleteOne(thread.id), copy.deleteConfirm)}
              </div>
            ) : null}
          </div>
        );
      })}

      {error ? (
        <p role="alert" className="px-2.5 pt-2 text-[12px] text-[var(--destructive)]">
          {error}
        </p>
      ) : null}

      {threads.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--fonda-border)] px-2.5 pt-3">
          {confirming === "all" ? (
            <>
              <p className="text-[12px] text-[var(--fonda-text)]">
                {plural(
                  threads.length,
                  copy.clearHistoryConfirmOne,
                  copy.clearHistoryConfirmOther
                )}
              </p>
              {confirmButtons(deleteAll, copy.clearHistoryAction)}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming("all")}
              disabled={pending}
              className="self-start rounded-[8px] text-[12px] text-[var(--fonda-text-3)] transition-colors hover:text-[var(--fonda-text-2)]"
            >
              {copy.clearHistory}
            </button>
          )}
          <p className="font-mono text-[10.5px] leading-snug text-[var(--fonda-text-3)]">
            {t(copy.historyLimitNote, { count: limit })}
          </p>
        </div>
      ) : null}
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
          {open ? copy.closeThreads : copy.openThreads}
        </button>
        {open ? (
          <nav
            aria-label={copy.threads}
            className="mt-2 flex flex-col rounded-[16px] bg-card p-2"
          >
            {rows}
          </nav>
        ) : null}
      </div>

      {/* From `lg`: a full-height column flush against the sidebar — canvas
          white beside the sidebar's warm chrome, a hairline on its right
          edge to part it from the conversation. Sticky, so the list stays
          put while a long transcript scrolls. */}
      <nav
        aria-label={copy.threads}
        className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col overflow-y-auto border-r border-[var(--fonda-border)] bg-[var(--fonda-bg)] px-2 pb-6 pt-5 lg:flex"
      >
        {rows}
      </nav>
    </>
  );
}
