import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { BriefingArticle } from "@/components/dashboard/briefing-article";
import { Button } from "@/components/ui/button";
import type { BriefingContent } from "@/lib/briefing";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
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

  const { data: hotel } = await supabase
    .from("hotels")
    .select("name, timezone")
    .single();
  const tz = hotel?.timezone || "UTC";

  // RLS ("briefings: read own hotel") already scopes this to the caller's
  // hotel, so selecting by id alone is safe.
  const { data: row } = await supabase
    .from("briefings")
    .select("content_json, generated_at")
    .eq("id", id)
    .not("content_json->>summary", "is", null)
    .maybeSingle();

  if (!row) notFound();

  const briefing = row.content_json as unknown as BriefingContent;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
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
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {hotel?.name ?? dict.briefing.fallbackHotel}
        </h1>
        <p className="text-muted-foreground">
          {formatLongDate(intlLocale[locale], tz, new Date(row.generated_at))}
        </p>
      </div>

      <BriefingArticle content={briefing} dict={dict} />
    </div>
  );
}
