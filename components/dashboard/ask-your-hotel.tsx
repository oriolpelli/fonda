"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquareText, Send, X } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { LocaleLink } from "@/components/i18n/locale-link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

const DRAFT_SENTINEL = "__FONDA_DRAFT__";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draftId?: string | null;
}

export function AskYourHotel() {
  const { dict } = useDictionary();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    dict.askYourHotel.suggestion1,
    dict.askYourHotel.suggestion2,
    dict.askYourHotel.suggestion3,
    dict.askYourHotel.suggestion4,
    dict.askYourHotel.suggestion5,
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function close() {
    setOpen(false);
    // History is kept only for the open session.
    setMessages([]);
    setInput("");
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        let content = acc;
        let draftId: string | null = null;
        const idx = acc.indexOf(DRAFT_SENTINEL);
        if (idx !== -1) {
          content = acc.slice(0, idx);
          draftId = acc.slice(idx + DRAFT_SENTINEL.length) || null;
        }
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content, draftId };
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: t(dict.askYourHotel.errorPrefix, {
            message: (err as Error).message,
          }),
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating trigger — bottom-right, hidden while the widget is open. */}
      <button
        onClick={() => setOpen(true)}
        aria-label={dict.askYourHotel.label}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open ? "pointer-events-none scale-90 opacity-0" : "opacity-100"
        )}
      >
        <MessageSquareText className="size-6" />
      </button>

      {/* Chat widget card — slides up from the bottom-right. */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-[550px] max-h-[calc(100dvh-3rem)] w-[420px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 ease-out",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--fonda-accent-light)] text-[var(--fonda-accent)]">
              <MessageSquareText className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">
                {dict.askYourHotel.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {dict.askYourHotel.subtitle}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={close}>
            <X />
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {dict.askYourHotel.empty}
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-2",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground"
                  )}
                >
                  {m.content ||
                    (m.role === "assistant" && streaming ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      ""
                    ))}
                </div>
                {m.draftId ? (
                  <LocaleLink
                    href="/dashboard/emails"
                    onClick={close}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-[var(--fonda-accent-light)] px-3 py-2 text-xs font-medium text-[var(--fonda-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-accent-light)_70%,var(--fonda-accent))]"
                  >
                    {dict.askYourHotel.draftCreated}
                  </LocaleLink>
                ) : null}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col gap-2.5 px-5 pb-3">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
              {dict.askYourHotel.tryAsking}
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-[var(--fonda-text-3)] hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-end gap-2 border-t border-border bg-background p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={dict.askYourHotel.placeholder}
            className="max-h-32 flex-1 resize-none rounded-[10px] border border-input bg-popover px-3.5 py-2.5 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent"
          />
          <Button
            size="icon"
            className="rounded-[10px]"
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
          >
            {streaming ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </>
  );
}
