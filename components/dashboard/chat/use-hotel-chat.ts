"use client";

import { useCallback, useState } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { aiFailureText } from "@/lib/ai-failure";
import { isSourceKey, type SourceKey } from "@/lib/chat-sources";

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

/** Appended, with a code from lib/ai-failure.ts, when the answer failed. */
const ERROR_SENTINEL = "__FONDA_ERROR__";

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
  /**
   * True when this turn failed. Its content is then our own calm sentence
   * (plus whatever had streamed before the failure), so the thread doesn't
   * put the "AI can make mistakes" line under it.
   */
  failed?: boolean;
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
      // What goes to the model: never a failed turn. Those carry OUR words
      // ("isn't available right now", "no answer was saved"), and fed back as
      // if the assistant had said them they would only confuse the next answer.
      const context = history.filter((m) => !m.failed);
      setMessages([...history, { role: "assistant", content: "", intent }]);
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: context.map((m) => ({ role: m.role, content: m.content })),
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
          let failed = false;
          const errorIdx = acc.indexOf(ERROR_SENTINEL);
          if (errorIdx !== -1) {
            // Keep anything that streamed before the failure, then say plainly
            // that the rest didn't come — in the user's language, never the
            // provider's words.
            const partial = acc.slice(0, errorIdx).trim();
            const notice =
              aiFailureText(dict, acc.slice(errorIdx + ERROR_SENTINEL.length)) ??
              dict.common.aiUnavailable;
            content = partial ? `${partial}\n\n${notice}` : notice;
            failed = true;
          } else {
            const idx = acc.indexOf(DRAFT_SENTINEL);
            if (idx !== -1) {
              content = acc.slice(0, idx);
              draftId = acc.slice(idx + DRAFT_SENTINEL.length) || null;
            }
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
              failed,
              // Stamped once, on the read where the draft first appears, so the
              // card's timestamp doesn't tick with every later chunk.
              draftAt: draftId ? (current.draftAt ?? Date.now()) : undefined,
            };
            return next;
          });
        }
      } catch (err) {
        // A non-OK response or a dropped connection. Never show the raw
        // error: a network failure says so, anything else gets the calm
        // "not available right now" line.
        const offline = err instanceof TypeError;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            intent,
            failed: true,
            content: offline
              ? dict.common.serverUnreachable
              : dict.common.aiUnavailable,
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
