import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefHero } from "@/components/dashboard/brief-hero";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { getHotel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.briefing.title };
}

function formatLongDate(intl: string, tz: string, d: Date): string {
  return new Intl.DateTimeFormat(intl, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default async function BriefingHistoryDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const { locale, dict } = await loadDictionary(lang);
  const supabase = await createClient();

  // Both at once; the hotel row is the request's shared read (lib/auth.ts).
  // RLS ("briefings: read own hotel") already scopes the brief to the caller's
  // hotel, so selecting by id alone is safe.
  const [hotel, { data: row }] = await Promise.all([
    getHotel(),
    supabase
      .from("briefings")
      .select("content_json, generated_at")
      .eq("id", id)
      .not("content_json->>summary", "is", null)
      .maybeSingle(),
  ]);
  const tz = hotel?.timezone || "UTC";

  if (!row) notFound();

  const briefing = row.content_json as unknown as BriefingContent;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3 self-start text-muted-foreground"
        >
          <Link href={localizedHref(locale, "/dashboard/brief")}>
            <ChevronLeft className="size-4" />
            {dict.briefing.backToToday}
          </Link>
        </Button>
        {/* Same sunrise as today's brief — a past brief is the same document,
            read on a different morning. The page's one gradient. */}
        <BriefHero
          eyebrow={formatLongDate(intlLocale[locale], tz, new Date(row.generated_at))}
          title={dict.briefing.title}
          subtitle={hotel?.name ?? dict.briefing.fallbackHotel}
        />
      </div>

      <BriefingArticle content={briefing} dict={dict} locale={locale} aiNote />
    </div>
  );
}
