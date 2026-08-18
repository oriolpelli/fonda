import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { ComingSoon } from "@/components/dashboard/coming-soon";

// Status, label and blurb all live in lib/roadmap.ts — flip this feature to
// "live" there and replace the body below when the real page ships.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.sidebar.analytics };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);
  return <ComingSoon featureKey="analytics" dict={dict} />;
}
