import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ComingSoon } from "@/components/dashboard/coming-soon";

// Status, label and blurb all live in lib/roadmap.ts. One-off questions are
// already answered by the floating "Ask your hotel" widget; this page is the
// full-width conversation, and isn't built yet.

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
  const { dict } = await loadDictionary((await params).lang);
  return <ComingSoon featureKey="chat" dict={dict} />;
}
