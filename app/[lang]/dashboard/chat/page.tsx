import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ChatSurface } from "@/components/dashboard/chat/chat-surface";
import { loadChatThreads, loadThreadMessages } from "@/lib/chat-threads";
import { createClient } from "@/lib/supabase/server";

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

  // Only the first letter is ever rendered — it's the avatar on the user's own
  // turns. The address itself never reaches the markup.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requested = typeof query.thread === "string" ? query.thread : null;
  const [threads, initialMessages] = await Promise.all([
    loadChatThreads(locale),
    requested ? loadThreadMessages(requested) : Promise.resolve([]),
  ]);

  // A thread id that resolved to nothing is treated as no thread at all rather
  // than reported: RLS returns empty for somebody else's conversation and for a
  // deleted one alike, and neither is worth an error page — the blank state is
  // a perfectly good place to land.
  const threadId = initialMessages.length > 0 ? requested : null;

  return (
    <ChatSurface
      userEmail={user?.email ?? ""}
      threads={threads}
      threadId={threadId}
      initialMessages={initialMessages}
    />
  );
}
