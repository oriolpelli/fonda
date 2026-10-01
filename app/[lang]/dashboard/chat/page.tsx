import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ChatSurface } from "@/components/dashboard/chat/chat-surface";
import { getSessionUser } from "@/lib/auth";
import {
  CHAT_HISTORY_LIMIT,
  loadChatThreads,
  loadThreadMessages,
} from "@/lib/chat-threads";

// The full "Ask your hotel" conversation (FONDA_SANA_REDESIGN.md §8.5). The
// docked bar on every other dashboard page is the shortcut into it; this is the
// surface itself, so the bar hides here.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.sidebar.chat };
}

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const { locale } = await loadDictionary(lang);

  // All three at once: who you are (shared with the layout's lookup — see
  // lib/auth.ts), your conversations, and the one you opened. Only the first
  // letter of the address is ever rendered — it's the avatar on your own
  // turns; the address itself never reaches the markup.
  const requested = typeof query.thread === "string" ? query.thread : null;
  const [user, threads, initialMessages] = await Promise.all([
    getSessionUser(),
    loadChatThreads(locale),
    requested ? loadThreadMessages(requested) : Promise.resolve([]),
  ]);

  // A thread id that resolved to nothing is treated as no thread at all rather
  // than reported: RLS returns empty for somebody else's conversation and for a
  // deleted one alike, and neither is worth an error page — the blank state is
  // a perfectly good place to land.
  const threadId = initialMessages.length > 0 ? requested : null;

  // `?q=` arrives from the palette's "Ask:" row. Handed to the surface as a
  // prefill, which sends it and clears the param — a query that stayed in the
  // URL would re-ask itself on every reload of that link.
  const prefill = typeof query.q === "string" ? query.q : null;

  // `key` is what makes clicking a conversation in the list actually open it.
  // Picking a thread is a soft navigation to `?thread=<id>` on the SAME route,
  // so React keeps ChatSurface mounted — and useHotelChat seeds its state from
  // props only once, on mount. Without a key the list highlighted the new
  // thread while the transcript stayed on the old one. Keyed by thread, each
  // conversation gets a fresh surface seeded from its own messages.
  return (
    <ChatSurface
      key={threadId ?? "new"}
      userEmail={user?.email ?? ""}
      threads={threads}
      threadId={threadId}
      initialMessages={initialMessages}
      historyLimit={CHAT_HISTORY_LIMIT}
      prefill={prefill}
    />
  );
}
