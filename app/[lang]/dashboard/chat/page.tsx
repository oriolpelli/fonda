import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { EmptyState } from "@/components/dashboard/empty-state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.chat.title };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.chat.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.chat.title}
        </h1>
      </div>
      <EmptyState icon="chat" message={dict.chat.emptyState} />
    </div>
  );
}
