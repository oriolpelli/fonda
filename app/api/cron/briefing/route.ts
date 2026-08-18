import { timingSafeEqual } from "node:crypto";

import * as Sentry from "@sentry/nextjs";
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

// --- Signal, in literal hex -------------------------------------------------
//
// CLAUDE.md forbids hard-coded hex in components, and this is the one place it
// can't be honoured: email clients don't evaluate CSS custom properties, so
// `var(--fonda-*)` would resolve to nothing and the mail would render unstyled.
// Every value below is copied from FONDA_DESIGN_IDENTITY.md §2 — if a token
// changes there, change it here too. Do not introduce a shade that isn't in
// that table.
const GROUND = "#F6F6F4"; // --fonda-surface, the ground behind the card
const CARD = "#FFFFFF"; // --fonda-bg
const HAIRLINE = "#E8E7E3"; // --fonda-border
const TEXT = "#0A0A0A"; // --fonda-text
const TEXT_MUTED = "#6F6F6A"; // --fonda-text-3 (AA on both grounds above)
const ACCENT = "#1B3BB3"; // --fonda-accent — the single signal, used once

// Geist first, then a clean neutral fallback: custom web fonts don't load in
// Gmail or Outlook, so the fallback is what most GMs will actually see. The
// mono stack mirrors it for the one place the system uses mono — eyebrows.
const SANS =
  "Geist,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO =
  "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";

/**
 * Brief prose: blank-line-separated paragraphs, near-black on white.
 *
 * `mso-line-height-rule:exactly` makes Outlook's Word engine honour the
 * line-height instead of tightening it — the leading is what makes this
 * readable at 6:45am on a phone.
 */
function paragraphs(text: string, fontSize = 16): string {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:${fontSize}px;line-height:1.65;mso-line-height-rule:exactly;color:${TEXT};">${escapeHtml(
          p.trim()
        )}</p>`
    )
    .join("");
}

/**
 * One section: a hairline rule, a Geist Mono uppercase eyebrow, then prose —
 * the same construction as the in-app brief (components/dashboard/
 * briefing-article.tsx), so the email and the dashboard read as one product.
 */
function section(title: string, text: string): string {
  return `
        <tr><td style="padding-top:24px;border-top:1px solid ${HAIRLINE};">
          <h2 style="margin:0 0 10px;font-family:${MONO};font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${TEXT_MUTED};">${escapeHtml(
            title
          )}</h2>
          ${paragraphs(text)}
        </td></tr>`;
}

/**
 * The morning brief, in the Signal design identity.
 *
 * Email constraints that shape the markup: tables rather than flex/grid
 * (Outlook ignores both), every style inline (no stylesheet survives Gmail),
 * and a fluid card capped at 600px with an MSO-only fixed-width wrapper, since
 * Outlook ignores `max-width`. Light only — the `color-scheme` metas tell
 * Apple Mail and Outlook.com not to auto-invert it.
 */
function briefingEmailHtml(
  hotelName: string,
  dateLabel: string,
  content: BriefingContent
): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;width:100%;background-color:${GROUND};font-family:${SANS};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${GROUND};">
    <tr><td align="center" style="padding:24px 12px 32px;">
      <!--[if mso]><table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${CARD};border:1px solid ${HAIRLINE};border-radius:16px;">
        <!-- 12px bottom, not 28: the last paragraph already carries a 16px
             bottom margin, and 12 + 16 balances the 28px above. -->
        <tr><td style="padding:28px 24px 12px;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr><td>
              <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(
                dateLabel
              )}</p>
              <h1 style="margin:0 0 20px;font-family:${SANS};font-size:26px;font-weight:600;line-height:1.12;letter-spacing:-0.02em;color:${TEXT};">${escapeHtml(
                hotelName
              )}</h1>
              ${paragraphs(content.summary, 17)}
            </td></tr>
            ${section("Arrivals & departures", content.arrivals)}
            ${section("Overnight email", content.emails)}
            ${section("Rate alert", content.rate_alert)}
          </table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td align="center" style="padding:20px 8px 0;">
          <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.5;color:${TEXT_MUTED};">Sent by Fondas — hotel operations, on autopilot.</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
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
    Sentry.captureException(new Error(error.message), {
      tags: { stage: "briefing" },
    });
    await admin
      .from("cron_logs")
      .insert({ job: "briefing", status: "error", message: error.message });
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
    // Everything per-hotel lives inside this try — including the timezone
    // gate below. Intl.DateTimeFormat throws on an invalid hotels.timezone,
    // and outside the try that one bad row would abort the tick for every
    // remaining hotel.
    try {
      const tz = hotel.timezone || "UTC";
      const settings = settingsByHotel.get(hotel.id);
      const sendHour = settings?.brief_send_hour ?? 7;

      // Only fire for hotels whose local hour matches their configured send
      // hour. The cron runs every 15 minutes, so this window is up to an hour
      // wide — the idempotency check below is what prevents duplicate sends.
      if (localHour(tz, now) !== sendHour) continue;
      considered++;

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
        await admin
          .from("cron_logs")
          .insert({ job: "briefing", hotel_id: hotel.id, status: "success" });
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
      await admin
        .from("cron_logs")
        .insert({ job: "briefing", hotel_id: hotel.id, status: "success" });
    } catch (err) {
      const message = (err as Error).message;
      Sentry.captureException(err, {
        tags: { hotelId: hotel.id, stage: "briefing" },
      });
      // Log the failed attempt to the briefings table (roadmap requirement).
      await admin
        .from("briefings")
        .insert({ hotel_id: hotel.id, content_json: { error: message } });
      await admin
        .from("cron_logs")
        .insert({ job: "briefing", hotel_id: hotel.id, status: "error", message });
      outcomes.push({ hotelId: hotel.id, status: "error", error: message });
    }
  }

  return NextResponse.json({
    checkedAt: now.toISOString(),
    considered,
    outcomes,
  });
}
