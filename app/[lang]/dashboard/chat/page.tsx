import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ChatSurface } from "@/components/dashboard/chat/chat-surface";
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
}: {
  params: Promise<{ lang: string }>;
}) {
  await loadDictionary((await params).lang);

  // Only the first letter is ever rendered — it's the avatar on the user's own
  // turns. The address itself never reaches the markup.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ChatSurface userEmail={user?.email ?? ""} />;
}
