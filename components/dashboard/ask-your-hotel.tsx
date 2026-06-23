"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquareText, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DRAFT_SENTINEL = "__FONDA_DRAFT__";

const SUGGESTIONS = [
  "Who are my arrivals today?",
  "Do I have any VIP guests this week?",
  "Which dates have low occupancy in the next 14 days?",
  "Any guests missing an arrival time?",
  "How many emails need my attention?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draftId?: string | null;
}

export function AskYourHotel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
          content: `Sorry — ${(err as Error).message}`,
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
        aria-label="Ask your hotel"
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
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareText className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">
                Ask your hotel
              </span>
              <span className="text-xs text-muted-foreground">
                Answers from your live data
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
              Ask me anything about today&apos;s operations — arrivals, VIPs,
              occupancy, or your inbox.
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
                      ? "rounded-br-md bg-primary text-primary-foreground shadow-sm"
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
                  <Link
                    href="/dashboard/emails"
                    onClick={close}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    Draft created → View in Email inbox
                  </Link>
                ) : null}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col gap-2.5 px-5 pb-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Try asking
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/80 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
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
            placeholder="Ask a question…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="icon"
            className="rounded-xl"
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
