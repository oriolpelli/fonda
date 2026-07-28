import { timingSafeEqual } from "node:crypto";

import * as Sentry from "@sentry/nextjs";
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
  failed?: number;
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
    Sentry.captureException(new Error(error.message), {
      tags: { stage: "emails" },
    });
    await admin
      .from("cron_logs")
      .insert({ job: "emails", status: "error", message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const outcomes: EmailPollOutcome[] = [];
  for (const hotel of hotels ?? []) {
    try {
      const ingested = await ingestRecentEmails(hotel.id, POLL_WINDOW_DAYS);
      const { processed, failed, lastError } = await processNewEmails(hotel.id);
      outcomes.push({ hotelId: hotel.id, ingested, processed, failed });

      // Emails that failed to classify are a real failure, even though ingest
      // worked — log them as such so the morning check and Sentry both see it.
      if (failed > 0) {
        const message = `${failed} of ${processed + failed} emails failed to process: ${lastError}`;
        Sentry.captureException(new Error(message), {
          tags: { hotelId: hotel.id, stage: "emails" },
        });
        await admin.from("cron_logs").insert({
          job: "emails",
          hotel_id: hotel.id,
          status: "error",
          message,
        });
      } else {
        await admin
          .from("cron_logs")
          .insert({ job: "emails", hotel_id: hotel.id, status: "success" });
      }
    } catch (err) {
      const message = (err as Error).message;
      Sentry.captureException(err, {
        tags: { hotelId: hotel.id, stage: "emails" },
      });
      await admin
        .from("cron_logs")
        .insert({ job: "emails", hotel_id: hotel.id, status: "error", message });
      outcomes.push({ hotelId: hotel.id, error: message });
    }
  }

  return NextResponse.json({ hotels: outcomes.length, outcomes });
}
