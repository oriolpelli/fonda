import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { runCheckinChaser } from "@/lib/checkin-chaser";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

interface ChaserOutcome {
  hotelId: string;
  created?: number;
  error?: string;
}

/**
 * Daily check-in chaser batch. Generates pending arrival-time request drafts
 * for every connected hotel; the GM reviews and sends them from /dashboard/checkin.
 */
export async function GET() {
  const secret = process.env.CRON_SECRET;
  const authHeader = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: hotels, error } = await admin
    .from("hotels")
    .select("id")
    .eq("pms_connected", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const outcomes: ChaserOutcome[] = [];
  for (const hotel of hotels ?? []) {
    try {
      const created = await runCheckinChaser(hotel.id);
      outcomes.push({ hotelId: hotel.id, created });
    } catch (err) {
      outcomes.push({ hotelId: hotel.id, error: (err as Error).message });
    }
  }

  return NextResponse.json({ hotels: outcomes.length, outcomes });
}
