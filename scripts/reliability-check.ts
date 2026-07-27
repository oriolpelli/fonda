/**
 * Morning reliability check — did Fondas run overnight without us?
 *
 *   npm run reliability-check
 *
 * Prints one PASS/FAIL line per hotel in plain language, then a summary.
 * Exits 0 when every hotel passes, 1 when any hotel fails — so it can be
 * wired into an alert later without changing the output.
 *
 * Run against whatever database .env.local points at. Reads via the
 * service-role key, so it sees every hotel regardless of RLS.
 *
 * Use the npm script rather than calling tsx directly: the lib/ modules this
 * reuses are marked `server-only`, which throws unless Node resolves with
 * --conditions=react-server.
 */

import { createClient } from "@supabase/supabase-js";

import { createGmailClient } from "../lib/gmail";
import { decryptSecret } from "../lib/encryption";
import type { Database } from "../types/database";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. running in CI) — fall back to the ambient environment.
}

const SYNC_MAX_AGE_HOURS = 2;
const LOOKBACK_HOURS = 24;

type CheckState = "pass" | "fail" | "na";

interface Check {
  state: CheckState;
  /** Written for a non-developer: what happened, and what it means. */
  detail: string;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Calendar date in the hotel's own timezone, e.g. "2026-07-27". */
function localDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** A timezone we can actually format with — bad values fall back to UTC. */
function safeTimezone(tz: string | null): string {
  try {
    localDate(tz || "UTC", new Date());
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * A check that couldn't be answered is a FAIL, never a silent pass — an
 * unreadable table (e.g. a migration not applied yet) must not look healthy.
 */
function unreadable(what: string, message: string): Check {
  return {
    state: "fail",
    detail: `could not read the ${what}: ${message}`,
  };
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "never";
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Check .env.local exists and has both."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const admin = createAdminClient();

// ---------------------------------------------------------------------------
// The five checks
// ---------------------------------------------------------------------------

async function checkSync(hotelId: string, pmsConnected: boolean): Promise<Check> {
  if (!pmsConnected) {
    return { state: "na", detail: "no PMS connected yet, so nothing to sync" };
  }
  const { data, error } = await admin
    .from("sync_logs")
    .select("created_at, reservations_count, customers_count")
    .eq("hotel_id", hotelId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return unreadable("sync history", error.message);
  if (!data) {
    return { state: "fail", detail: "the booking sync has never succeeded" };
  }
  if (data.created_at < hoursAgo(SYNC_MAX_AGE_HOURS)) {
    return {
      state: "fail",
      detail: `last successful booking sync was ${formatWhen(
        data.created_at
      )} — over ${SYNC_MAX_AGE_HOURS} hours ago`,
    };
  }
  const guests =
    data.customers_count === 0 && data.reservations_count > 0
      ? " — but 0 guest profiles, so briefs will read generically"
      : "";
  return {
    state: guests ? "fail" : "pass",
    detail: `booking sync ran ${formatWhen(data.created_at)} (${
      data.reservations_count
    } bookings, ${data.customers_count} guests)${guests}`,
  };
}

async function checkBriefing(hotelId: string, tz: string, pmsConnected: boolean): Promise<Check> {
  if (!pmsConnected) {
    return { state: "na", detail: "no PMS connected yet, so no brief is due" };
  }
  const today = localDate(tz, new Date());

  const { data: delivered, error } = await admin
    .from("briefings")
    .select("generated_at, delivered_at")
    .eq("hotel_id", hotelId)
    .not("delivered_at", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return unreadable("brief history", error.message);
  if (delivered && localDate(tz, new Date(delivered.generated_at)) === today) {
    return {
      state: "pass",
      detail: `today's brief was emailed at ${formatWhen(delivered.delivered_at)}`,
    };
  }

  // Nothing delivered today — was one at least generated? The two failures
  // point at different problems (writing vs sending), so say which it is.
  const { data: anyToday } = await admin
    .from("briefings")
    .select("generated_at, content_json")
    .eq("hotel_id", hotelId)
    .gte("generated_at", hoursAgo(LOOKBACK_HOURS))
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (anyToday && localDate(tz, new Date(anyToday.generated_at)) === today) {
    const failed =
      anyToday.content_json &&
      typeof anyToday.content_json === "object" &&
      "error" in anyToday.content_json;
    return {
      state: "fail",
      detail: failed
        ? `today's brief failed while being written: ${String(
            (anyToday.content_json as { error: unknown }).error
          )}`
        : "today's brief was written but never emailed",
    };
  }
  return {
    state: "fail",
    detail: `no brief for today (${today}) was written at all`,
  };
}

async function checkEmails(hotelId: string, gmailConnected: boolean): Promise<Check> {
  if (!gmailConnected) {
    return { state: "na", detail: "no mailbox connected yet" };
  }
  const { count, error } = await admin
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId)
    .not("classification", "is", null)
    .gte("created_at", hoursAgo(LOOKBACK_HOURS));

  if (error) return unreadable("email history", error.message);
  // A quiet mailbox is normal, so 0 is not a failure on its own — the token
  // check below is what proves the pipeline can actually reach Gmail.
  return {
    state: "pass",
    detail: `${count ?? 0} guest emails sorted and drafted in the last ${LOOKBACK_HOURS}h`,
  };
}

async function checkJobFailures(hotelId: string): Promise<Check> {
  const since = hoursAgo(LOOKBACK_HOURS);

  const [
    { data: cronRows, error: cronError },
    { data: syncRows, error: syncError },
  ] = await Promise.all([
    admin
      .from("cron_logs")
      .select("job, message, created_at")
      .eq("hotel_id", hotelId)
      .eq("status", "error")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    admin
      .from("sync_logs")
      .select("error, created_at")
      .eq("hotel_id", hotelId)
      .eq("status", "error")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  if (cronError) {
    return unreadable(
      "job error log",
      `${cronError.message} — if the cron_logs table is missing, apply supabase/APPLY_0014.sql`
    );
  }
  if (syncError) return unreadable("sync error log", syncError.message);

  const failures = [
    ...(cronRows ?? []).map((r) => `${r.job}: ${r.message ?? "unknown error"}`),
    ...(syncRows ?? []).map((r) => `sync: ${r.error ?? "unknown error"}`),
  ];

  if (failures.length === 0) {
    return { state: "pass", detail: `no job errors in the last ${LOOKBACK_HOURS}h` };
  }
  const shown = failures.slice(0, 3).join("; ");
  const more = failures.length > 3 ? ` (+${failures.length - 3} more)` : "";
  return {
    state: "fail",
    detail: `${failures.length} job error(s) in the last ${LOOKBACK_HOURS}h — ${shown}${more}`,
  };
}

async function checkGmailToken(
  gmailConnected: boolean,
  encryptedToken: string | null
): Promise<Check> {
  if (!gmailConnected) {
    return { state: "na", detail: "no mailbox connected yet" };
  }
  if (!encryptedToken) {
    return {
      state: "fail",
      detail: "a mailbox is linked but its access token is missing — reconnect Gmail",
    };
  }
  try {
    const client = createGmailClient(decryptSecret(encryptedToken));
    // Forces a real token refresh against Google — the only way to catch a
    // revoked mailbox, which nothing in the database records.
    const address = await client.getProfileEmail();
    return { state: "pass", detail: `mailbox ${address} is reachable` };
  } catch (err) {
    return {
      state: "fail",
      detail: `cannot reach the mailbox: ${
        (err as Error).message
      } — reconnect Gmail in Settings → Integrations`,
    };
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const { data: hotels, error } = await admin
    .from("hotels")
    .select(
      "id, name, timezone, pms_connected, gmail_email, gmail_refresh_token_encrypted"
    )
    .order("name");

  if (error) {
    console.error(`Could not reach the database: ${error.message}`);
    return 1;
  }
  if (!hotels || hotels.length === 0) {
    console.log("No hotels found in this database.");
    return 0;
  }

  console.log(
    `Fondas reliability check — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\n`
  );

  let failed = 0;

  for (const hotel of hotels) {
    const tz = safeTimezone(hotel.timezone);
    const gmailConnected = Boolean(hotel.gmail_email);
    const pmsConnected = Boolean(hotel.pms_connected);

    let checks: [string, Check][];
    try {
      checks = [
        ["Bookings synced", await checkSync(hotel.id, pmsConnected)],
        ["Morning brief", await checkBriefing(hotel.id, tz, pmsConnected)],
        ["Guest emails", await checkEmails(hotel.id, gmailConnected)],
        ["Overnight errors", await checkJobFailures(hotel.id)],
        [
          "Mailbox connection",
          await checkGmailToken(gmailConnected, hotel.gmail_refresh_token_encrypted),
        ],
      ];
    } catch (err) {
      // A bug in this script must not hide the other hotels' results.
      failed++;
      console.log(`${hotel.name}: FAIL`);
      console.log(`  - the check itself broke: ${(err as Error).message}\n`);
      continue;
    }

    const hotelFailed = checks.some(([, c]) => c.state === "fail");
    if (hotelFailed) failed++;

    if (hotel.timezone && tz !== hotel.timezone) {
      console.log(
        `${hotel.name}: ${hotelFailed ? "FAIL" : "PASS"}  ⚠ its timezone "${hotel.timezone}" is invalid — treated as UTC. Fix it in Settings.`
      );
    } else {
      console.log(`${hotel.name}: ${hotelFailed ? "FAIL" : "PASS"}`);
    }

    for (const [label, check] of checks) {
      const mark = check.state === "pass" ? "ok" : check.state === "fail" ? "PROBLEM" : "n/a";
      console.log(`  - ${label} [${mark}]: ${check.detail}`);
    }
    console.log("");
  }

  const passed = hotels.length - failed;
  console.log(
    failed === 0
      ? `All good — ${passed}/${hotels.length} hotels passed.`
      : `${passed}/${hotels.length} hotels passed. ${failed} need attention (see PROBLEM lines above).`
  );
  return failed === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`The reliability check could not run: ${(err as Error).message}`);
    process.exit(1);
  });
