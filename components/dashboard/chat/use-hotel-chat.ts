"use client";

import { useCallback, useState } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { isSourceKey, type SourceKey } from "@/lib/chat-sources";
import { t } from "@/lib/i18n/format";

/**
 * The one place the "Ask your hotel" conversation lives.
 *
 * Both chat surfaces — the docked bar in the dashboard content column
 * (`components/dashboard/ask-your-hotel.tsx`) and the full page
 * (`app/[lang]/dashboard/chat`) — run this hook, so the streaming contract with
 * `app/api/chat/route.ts` is written once. Presentation is entirely in the
 * components; this file knows nothing about how a turn looks.
 */

/** Appended to the stream when the answer also created a draft email. */
const DRAFT_SENTINEL = "__FONDA_DRAFT__";

/**
 * Mirrors the server's draft heuristic (`wantsDraft` in app/api/chat/route.ts).
 * It only picks the *wording* of the status line while the turn streams — if
 * the two ever drift the status reads slightly off, nothing breaks.
 */
const DRAFT_REQUEST = /draft an email|write an email/i;

export type ChatIntent = "answer" | "draft";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draftId?: string | null;
  /** When the draft landed — the result card's timestamp (§8.4). */
  draftAt?: number;
  /** Which status line this assistant turn shows while it works (§8.2). */
  intent?: ChatIntent;
  /**
   * What this answer was built from (§4.4). Keys, resolved to labels at render
   * time. Absent on a turn restored from the database: the sources described
   * the context of the moment the answer was made, and reconstructing them a
   * week later would be inventing provenance.
   */
  sources?: SourceKey[];
}

export interface HotelChat {
  messages: ChatMessage[];
  streaming: boolean;
  send: (text: string) => Promise<void>;
  /**
   * Starts a NEW conversation. Since migration 0023 this no longer throws the
   * previous one away — it is already in `chat_threads` and will be in the
   * thread list; this just stops writing into it.
   */
  reset: () => void;
  /**
   * The conversation being written to, once the server has named it. Null
   * before the first turn. The docked bar hands this to "Continue in chat" so
   * the full page picks up the same conversation rather than starting over.
   */
  threadId: string | null;
}

export function useHotelChat(
  /** Hydrated transcript and thread, when opening an existing conversation. */
  initial?: { threadId: string | null; messages: ChatMessage[] }
): HotelChat {
  const { dict } = useDictionary();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initial?.messages ?? []
  );
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(
    initial?.threadId ?? null
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const intent: ChatIntent = DRAFT_REQUEST.test(trimmed)
        ? "draft"
        : "answer";
      const history: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages([...history, { role: "assistant", content: "", intent }]);
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            threadId,
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status}).`);
        }

        // On a header rather than in the body: the body is a text stream that
        // is still arriving, and the next turn needs the id before it ends.
        const assigned = res.headers.get("X-Fondas-Thread-Id");
        if (assigned) setThreadId(assigned);

        const sources = (res.headers.get("X-Fondas-Sources") ?? "")
          .split(",")
          .filter(isSourceKey);

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
            const current = next[next.length - 1];
            next[next.length - 1] = {
              ...current,
              role: "assistant",
              content,
              sources,
              draftId,
              // Stamped once, on the read where the draft first appears, so the
              // card's timestamp doesn't tick with every later chunk.
              draftAt: draftId ? (current.draftAt ?? Date.now()) : undefined,
            };
            return next;
          });
        }
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            intent,
            content: t(dict.askYourHotel.errorPrefix, {
              message: (err as Error).message,
            }),
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [dict, messages, streaming, threadId]
  );

  const reset = useCallback(() => {
    setMessages([]);
    // The previous conversation is stored; dropping the id starts a new one on
    // the next send rather than appending to what you just left.
    setThreadId(null);
  }, []);

  return { messages, streaming, send, reset, threadId };
}
