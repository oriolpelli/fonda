import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { processNewEmails } from "@/lib/email-processor";
import { ingestRecentEmails } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// Ingest + classify + draft across hotels — allow generous headroom.
export const maxDuration = 300;

// Short look-back window per poll; ingest is idempotent so overlap is harmless.
const POLL_WINDOW_DAYS = 2;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

interface EmailPollOutcome {
  hotelId: string;
  ingested?: number;
  processed?: number;
  error?: string;
}

/**
 * Email poller (every 5 minutes). For each hotel with Gmail connected: pull new
 * inbox messages, then classify + draft the not-yet-processed ones.
 */
export async function GET() {
  const secret = process.env.CRON_SECRET;
  const authHeader = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // gmail_email is set on connect and readable; use it as the "connected" flag
  // so we don't have to touch the revoked refresh-token column here.
  const { data: hotels, error } = await admin
    .from("hotels")
    .select("id")
    .not("gmail_email", "is", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const outcomes: EmailPollOutcome[] = [];
  for (const hotel of hotels ?? []) {
    try {
      const ingested = await ingestRecentEmails(hotel.id, POLL_WINDOW_DAYS);
      const processed = await processNewEmails(hotel.id);
      outcomes.push({ hotelId: hotel.id, ingested, processed });
    } catch (err) {
      outcomes.push({ hotelId: hotel.id, error: (err as Error).message });
    }
  }

  return NextResponse.json({ hotels: outcomes.length, outcomes });
}
