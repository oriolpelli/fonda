import { NextResponse } from "next/server";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { getSessionProfile } from "@/lib/auth";
import { literacyCsv, type LiteracyAck } from "@/lib/ai-literacy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The hotel's AI literacy record as CSV — its Art. 4 evidence (A6). Owner and
 * managers only, and read through RLS, which also only lets them see their
 * own hotel. Completion data only: person, version, completed or skipped,
 * when.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const profile = await getSessionProfile();
  if (!profile?.hotelId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "owner" && profile.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ dict }, supabase] = await Promise.all([
    loadDictionary((await params).lang),
    createClient(),
  ]);
  const [people, acks] = await Promise.all([
    supabase.from("users").select("id, email").order("email"),
    supabase
      .from("ai_literacy_acks")
      .select("user_id, version, status, completed_at, created_at")
      .order("created_at", { ascending: true })
      .limit(10000),
  ]);
  if (people.error || acks.error) {
    return NextResponse.json({ error: "Record unavailable" }, { status: 503 });
  }

  const copy = dict.settings.aiPage;
  const csv = literacyCsv(
    people.data ?? [],
    (acks.data ?? []) as LiteracyAck[],
    {
      person: copy.recordPerson,
      version: copy.recordVersion,
      status: copy.recordStatus,
      date: copy.recordDate,
    },
    {
      completed: copy.statusCompleted,
      skipped: copy.statusSkipped,
      "not-yet": copy.statusNotYet,
    }
  );
  const today = new Date().toISOString().slice(0, 10);
  // A BOM so Excel opens the accents (es/ca) as UTF-8.
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fondas-ai-literacy-record-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
