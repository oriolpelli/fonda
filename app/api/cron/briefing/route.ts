import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { generateBriefing, type BriefingContent } from "@/lib/briefing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// May generate briefings (each a Claude call) for many hotels in one tick.
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

function localDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The current local hour (0-23) for a hotel's timezone. */
function localHour(tz: string, instant: Date): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).format(instant);
  // "24" shows up for midnight in some environments — normalize to 0.
  return Number.parseInt(hourStr, 10) % 24;
}

function formatLongDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#0f172a;">${escapeHtml(
          p.trim()
        )}</p>`
    )
    .join("");
}

function section(title: string, text: string): string {
  return `
    <tr><td style="padding-top:20px;border-top:1px solid #e2e8f0;">
      <h2 style="margin:0 0 8px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#64748b;">${escapeHtml(
        title
      )}</h2>
      ${paragraphs(text)}
    </td></tr>`;
}

function briefingEmailHtml(
  hotelName: string,
  dateLabel: string,
  content: BriefingContent
): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0;font-size:20px;color:#0f172a;">${escapeHtml(hotelName)}</h1>
          <p style="margin:4px 0 24px;font-size:14px;color:#64748b;">${escapeHtml(dateLabel)}</p>
          ${paragraphs(content.summary)}
        </td></tr>
        ${section("Arrivals & departures", content.arrivals)}
        ${section("Overnight email", content.emails)}
        ${section("Rate alert", content.rate_alert)}
        <tr><td style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by Fondas — hotel operations, on autopilot.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendBriefingEmail(
  to: string[],
  hotelName: string,
  dateLabel: string,
  content: BriefingContent
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? "Fondas <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your Fondas briefing — ${dateLabel}`,
    html: briefingEmailHtml(hotelName, dateLabel, content),
  });
  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Cron handler
// ---------------------------------------------------------------------------

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

interface BriefingOutcome {
  hotelId: string;
  status: "emailed" | "generated" | "skipped" | "error";
  error?: string;
}

/** `hotel_settings.brief_recipients` is jsonb — narrow it defensively. */
function asRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
}

export async function GET() {
  const secret = process.env.CRON_SECRET;
  const authHeader = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const admin = createAdminClient();
  const { data: hotels, error } = await admin
    .from("hotels")
    .select("id, name, timezone")
    .eq("pms_connected", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: settingsRows } = await admin
    .from("hotel_settings")
    .select("hotel_id, brief_send_hour, brief_recipients");
  const settingsByHotel = new Map(
    (settingsRows ?? []).map((s) => [s.hotel_id, s])
  );

  const outcomes: BriefingOutcome[] = [];
  let considered = 0;

  for (const hotel of hotels ?? []) {
    const tz = hotel.timezone || "UTC";
    const settings = settingsByHotel.get(hotel.id);
    const sendHour = settings?.brief_send_hour ?? 7;

    // Only fire for hotels whose local hour matches their configured send
    // hour. The cron runs every 15 minutes, so this window is up to an hour
    // wide — the idempotency check below is what prevents duplicate sends.
    if (localHour(tz, now) !== sendHour) continue;
    considered++;

    try {
      const today = localDate(tz, now);

      // Idempotency: if this hotel already has a delivered brief for today,
      // a later tick within the same local hour must not send again.
      const { data: lastDelivered } = await admin
        .from("briefings")
        .select("generated_at")
        .eq("hotel_id", hotel.id)
        .not("delivered_at", "is", null)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        lastDelivered &&
        localDate(tz, new Date(lastDelivered.generated_at)) === today
      ) {
        outcomes.push({ hotelId: hotel.id, status: "skipped" });
        continue;
      }

      const content = await generateBriefing(hotel.id);
      const dateLabel = formatLongDate(tz, now);

      const configuredRecipients = asRecipients(settings?.brief_recipients);
      let recipients = configuredRecipients;
      if (recipients.length === 0) {
        // No recipients configured yet: fall back to every hotel user so
        // existing setups don't silently stop receiving mail.
        const { data: members } = await admin
          .from("users")
          .select("email")
          .eq("hotel_id", hotel.id);
        recipients = [
          ...new Set((members ?? []).map((m) => m.email).filter(Boolean)),
        ];
      }

      let emailed = false;
      if (process.env.RESEND_API_KEY && recipients.length > 0) {
        await sendBriefingEmail(recipients, hotel.name, dateLabel, content);
        emailed = true;

        // Mark the briefing we just generated as delivered.
        const { data: row } = await admin
          .from("briefings")
          .select("id")
          .eq("hotel_id", hotel.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (row) {
          await admin
            .from("briefings")
            .update({ delivered_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }

      outcomes.push({
        hotelId: hotel.id,
        status: emailed ? "emailed" : "generated",
      });
    } catch (err) {
      const message = (err as Error).message;
      // Log the failed attempt to the briefings table (roadmap requirement).
      await admin
        .from("briefings")
        .insert({ hotel_id: hotel.id, content_json: { error: message } });
      outcomes.push({ hotelId: hotel.id, status: "error", error: message });
    }
  }

  return NextResponse.json({
    checkedAt: now.toISOString(),
    considered,
    outcomes,
  });
}
