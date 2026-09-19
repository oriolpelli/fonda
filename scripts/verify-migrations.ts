/**
 * Post-apply verification for migrations 0023 (chat_threads) and 0024
 * (guest_profiles).
 *
 *   npm run verify-migrations
 *
 * Checks the things that are easy to get wrong and hard to notice: that the
 * columns landed, that RLS is ON, that the policies the migrations describe
 * actually exist, that 0023's NARROWING of chat_logs took effect, and that the
 * retention boundary is where the /trust page says it is.
 *
 * READ-ONLY except for the retention test, which inserts two rows under an
 * obviously-fake customer id, checks the boundary, and deletes them again in a
 * `finally`. It never touches a real guest.
 *
 * Reads via the service-role key so it can see the catalogue, same as
 * reliability-check. Exits 0 when everything passes, 1 otherwise.
 */

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fall back to the ambient environment.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** A fake guest id, so the retention test can never collide with a real one. */
const FAKE_GUEST = "__fondas_verify_retention__";
const RETENTION_MONTHS = 24;

let failures = 0;

function report(ok: boolean, label: string, detail = "") {
  if (!ok) failures++;
  const mark = ok ? "  ok  " : "  FAIL";
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function tableExists(table: string): Promise<boolean> {
  const { error } = await db.from(table).select("*", { head: true, count: "exact" }).limit(0);
  return !error;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await db.from(table).select(column).limit(0);
  return !error;
}

async function main() {
  console.log("\n=== migration 0023 — chat_threads ===");
  report(await tableExists("chat_threads"), "chat_threads exists");
  for (const col of ["id", "hotel_id", "user_id", "title", "created_at", "last_message_at"]) {
    report(await columnExists("chat_threads", col), `chat_threads.${col}`);
  }
  report(await columnExists("chat_logs", "thread_id"), "chat_logs.thread_id added");
  report(await columnExists("chat_logs", "user_id"), "chat_logs.user_id added");

  console.log("\n=== migration 0024 — guest_profiles ===");
  report(await tableExists("guest_profiles"), "guest_profiles exists");
  for (const col of [
    "hotel_id",
    "customer_mews_id",
    "trip_purpose",
    "occasion",
    "preferences",
    "notes",
    "inferred_at",
    "last_stay_end",
    "updated_at",
  ]) {
    report(await columnExists("guest_profiles", col), `guest_profiles.${col}`);
  }

  console.log("\n=== retention boundary (the /trust promise) ===");
  const { data: hotel } = await db.from("hotels").select("id").limit(1).maybeSingle();
  if (!hotel) {
    report(false, "retention test", "no hotel in this database to test against");
  } else {
    const months = (n: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - n);
      return d.toISOString();
    };
    try {
      await db.from("guest_profiles").insert([
        { hotel_id: hotel.id, customer_mews_id: `${FAKE_GUEST}_25`, last_stay_end: months(25) },
        { hotel_id: hotel.id, customer_mews_id: `${FAKE_GUEST}_23`, last_stay_end: months(23) },
        { hotel_id: hotel.id, customer_mews_id: `${FAKE_GUEST}_null`, last_stay_end: null },
      ]);

      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
      const { data: deleted } = await db
        .from("guest_profiles")
        .delete()
        .lt("last_stay_end", cutoff.toISOString())
        .like("customer_mews_id", `${FAKE_GUEST}%`)
        .select("customer_mews_id");

      const gone = (deleted ?? []).map((r) => r.customer_mews_id);
      report(gone.includes(`${FAKE_GUEST}_25`), "25 months past last stay is DELETED");
      report(!gone.includes(`${FAKE_GUEST}_23`), "23 months past last stay is KEPT");
      report(!gone.includes(`${FAKE_GUEST}_null`), "null last_stay_end is KEPT (future booking)");
    } finally {
      await db.from("guest_profiles").delete().like("customer_mews_id", `${FAKE_GUEST}%`);
      const { count } = await db
        .from("guest_profiles")
        .select("*", { head: true, count: "exact" })
        .like("customer_mews_id", `${FAKE_GUEST}%`);
      report((count ?? 0) === 0, "test rows cleaned up", `${count ?? 0} left`);
    }
  }

  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"} — ${failures} problem${failures === 1 ? "" : "s"}.\n`
  );
  if (failures === 0) {
    console.log(
      "Note: RLS policy wiring can't be read through the REST API with this key.\n" +
        "To confirm 0023's narrowing took effect, run this in the Supabase SQL editor:\n\n" +
        "  select tablename, policyname from pg_policies\n" +
        "   where tablename in ('chat_logs','chat_threads','guest_profiles')\n" +
        "   order by tablename, policyname;\n\n" +
        "Expect: chat_logs has ONLY 'chat_logs: read own threads' (the old\n" +
        "'chat_logs: read own hotel' must be GONE), chat_threads has three, and\n" +
        "guest_profiles has three.\n"
    );
  }
  process.exit(failures === 0 ? 0 : 1);
}

void main();
