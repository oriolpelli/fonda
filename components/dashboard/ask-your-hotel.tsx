"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";

import { ChatComposer } from "@/components/dashboard/chat/chat-composer";
import { ChatThread } from "@/components/dashboard/chat/chat-thread";
import { useHotelChat } from "@/components/dashboard/chat/use-hotel-chat";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { stripLocale } from "@/lib/i18n/navigation";

/** The full surface this bar is a shortcut to. */
const CHAT_ROUTE = "/dashboard/chat";

/**
 * "Ask your hotel", docked at the foot of the dashboard content column
 * (FONDA_SANA_REDESIGN.md §8.5, option 1).
 *
 * This replaces the circular floating FAB — the single most "AI chatbot"
 * element in the old design. What's here instead reads as what it is: a
 * composer, the width of the content, sticky at the bottom of the column
 * rather than pinned to the corner of the viewport. Clicking it opens the
 * conversation in place; the full page at `/dashboard/chat` is the same
 * conversation with room to breathe.
 *
 * A disclosure, not a modal: the panel doesn't cover the page, so there is no
 * scrim and no focus trap. Escape closes it and hands focus back to the bar,
 * and closing drops the transcript — history is kept for the open session only.
 */
export function AskYourHotel({ userEmail }: { userEmail: string }) {
  const { dict } = useDictionary();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { messages, streaming, send, reset } = useHotelChat();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Focus goes back to the bar when the panel closes — it is the control that
  // was replaced, and after Escape there is nowhere else for focus to be.
  useEffect(() => {
    if (!open && wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // On the chat page this bar would be a second entry point to the surface the
  // reader is already looking at.
  if (stripLocale(pathname) === CHAT_ROUTE) return null;

  return (
    // `mt-auto` puts it at the foot of the column on short pages; sticky keeps
    // it reachable on long ones, riding on a band of the page ground so the
    // content scrolls cleanly underneath.
    <div className="sticky bottom-0 z-10 mt-auto bg-[var(--fonda-bg)] pb-3 pt-6">
      {open ? (
        <section
          aria-label={dict.askYourHotel.title}
          className="rounded-[18px] bg-card shadow-card"
        >
          <header className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[14px] font-medium leading-tight text-[var(--fonda-text)]">
                {dict.askYourHotel.title}
              </span>
              <span className="truncate text-[12px] text-[var(--fonda-text-3)]">
                {dict.askYourHotel.subtitle}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dict.askYourHotel.close}
              onClick={close}
              className="size-9 shrink-0 rounded-[10px]"
            >
              <X strokeWidth={1.5} />
            </Button>
          </header>

          <div className="h-px bg-[var(--fonda-border)]" />

          {messages.length > 0 ? (
            <div className="max-h-[42vh] overflow-y-auto px-5 py-5">
              <ChatThread
                messages={messages}
                streaming={streaming}
                userEmail={userEmail}
                nested
                onNavigate={close}
              />
            </div>
          ) : (
            <p className="max-w-[60ch] px-5 py-5 text-[14px] leading-relaxed text-[var(--fonda-text-2)]">
              {dict.askYourHotel.empty}
            </p>
          )}

          <div className="px-4 pb-4">
            <ChatComposer
              onSend={send}
              streaming={streaming}
              blank={messages.length === 0}
              autoFocus
            />
          </div>
        </section>
      ) : (
        // Input-looking, not button-looking: the affordance is "type here",
        // which is also exactly what the panel opens into.
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--fonda-border-2)] bg-card px-4 py-2.5 text-left shadow-card transition-colors duration-[180ms] hover:border-[var(--fonda-text-3)]"
        >
          <Sparkles
            aria-hidden="true"
            className="size-4 shrink-0 text-[var(--fonda-text-3)]"
            strokeWidth={1.5}
          />
          <span className="min-w-0 truncate text-[15px] text-[var(--fonda-text-3)]">
            {dict.askYourHotel.dockedCta}
          </span>
          <span
            aria-hidden="true"
            className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
          >
            <ArrowUp className="size-4" strokeWidth={2} />
          </span>
        </button>
      )}
    </div>
  );
}
