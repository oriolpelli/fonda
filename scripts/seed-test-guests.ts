/**
 * Seed two clearly-labelled test guests for exercising the email inbox.
 *
 *   npx tsx scripts/seed-test-guests.ts            # create / refresh
 *   npx tsx scripts/seed-test-guests.ts --remove   # delete them again
 *
 * Why this exists: to see the inbox do its job you need mail from an address
 * that matches a real booking. The synced MEWS data belongs to real guests
 * whose mailboxes you don't control, so this adds two fake bookings tied to
 * addresses you do.
 *
 * Safety:
 *  - Every row is prefixed `FONDA-TEST-` and carries `raw.fonda_test_seed`,
 *    so it is trivial to find and delete. `--remove` deletes exactly those.
 *  - It only ever inserts/updates its own rows. Real synced data is untouched.
 *  - lib/mews-sync.ts is upsert-only (it never deletes rows missing from
 *    MEWS), so a sync will not clear these — and will not overwrite them
 *    either, because no real MEWS record shares these ids.
 *
 * Re-running is safe and refreshes the dates, which matters: the in-house stay
 * is anchored to "today", so run it again on the day you test.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fall back to the ambient environment.
}

const PREFIX = "FONDA-TEST-";
/** Nights between check-in and check-out for both stays. */
const STAY_NIGHTS = 4;
/** How far out the "future" booking sits. */
const FUTURE_ARRIVAL_DAYS = 28;

// --- timezone helpers (hotel-local dates, same approach as lib/stay-phase) ---

function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(date).map((x) => [x.type, x.value])
  );
  return (
    Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second)
    ) - date.getTime()
  );
}

function localDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The UTC instant of `HH:MM` on a given hotel-local calendar date. */
function zonedTimeUtc(tz: string, date: string, hhmm: string): string {
  const naive = new Date(`${date}T${hhmm}:00Z`);
  return new Date(naive.getTime() - tzOffsetMs(tz, naive)).toISOString();
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// --- the two test guests -----------------------------------------------------

interface TestGuest {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  bookingNumber: string;
  /** Days from today until check-in. 0 = arriving today. */
  arrivalOffsetDays: number;
  /** MEWS reservation state; 'Started' is in-house, 'Confirmed' is upcoming. */
  state: string;
  expect: string;
}

const GUESTS: TestGuest[] = [
  {
    key: "INHOUSE",
    email: "oriolpelli@icloud.com",
    firstName: "TEST",
    lastName: "In-house Guest",
    bookingNumber: "TEST-INHOUSE",
    arrivalOffsetDays: 0,
    state: "Started",
    expect: 'in-house · urgency note "Arrives today"',
  },
  {
    key: "FUTURE",
    email: "oriolstorage@gmail.com",
    firstName: "TEST",
    lastName: "Future Arrival",
    bookingNumber: "TEST-FUTURE",
    arrivalOffsetDays: FUTURE_ARRIVAL_DAYS,
    state: "Confirmed",
    expect: "pre-arrival · no urgency note (too far out)",
  },
];

const customerId = (g: TestGuest) => `${PREFIX}CUST-${g.key}`;
const reservationId = (g: TestGuest) => `${PREFIX}RES-${g.key}`;

// --- run ---------------------------------------------------------------------

async function main(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Check .env.local."
    );
    return 1;
  }

  const db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: hotels, error: hotelError } = await db
    .from("hotels")
    .select("id, name, timezone");
  if (hotelError || !hotels?.length) {
    console.error(
      `Could not read hotels: ${hotelError?.message ?? "none found"}`
    );
    return 1;
  }
  if (hotels.length > 1) {
    console.error(
      `Expected one hotel, found ${hotels.length}. Narrow this script before running it.`
    );
    return 1;
  }

  const hotel = hotels[0];
  const tz = hotel.timezone || "UTC";
  const remove = process.argv.includes("--remove");

  console.log(`Hotel: "${hotel.name}" (${hotel.id}) · timezone ${tz}\n`);

  if (remove) {
    const { count: resCount } = await db
      .from("reservations")
      .delete({ count: "exact" })
      .eq("hotel_id", hotel.id)
      .like("mews_id", `${PREFIX}%`);
    const { count: custCount } = await db
      .from("customers")
      .delete({ count: "exact" })
      .eq("hotel_id", hotel.id)
      .like("mews_id", `${PREFIX}%`);

    console.log(
      `Removed ${resCount ?? 0} test reservation(s) and ${custCount ?? 0} test guest(s).`
    );
    console.log(
      "\nNote: any emails you already received stay in the inbox — they are real\n" +
        "Gmail messages. They will simply stop showing a guest name and stay dates."
    );
    return 0;
  }

  const today = localDate(tz, new Date());
  const marker = { fonda_test_seed: true, seeded_at: new Date().toISOString() };

  for (const g of GUESTS) {
    const arrival = addDays(today, g.arrivalOffsetDays);
    const departure = addDays(arrival, STAY_NIGHTS);

    const { error: custError } = await db.from("customers").upsert(
      {
        hotel_id: hotel.id,
        mews_id: customerId(g),
        first_name: g.firstName,
        last_name: g.lastName,
        email: g.email,
        language_code: "en",
        raw: marker,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "hotel_id,mews_id" }
    );
    if (custError) {
      console.error(`Failed to seed guest ${g.email}: ${custError.message}`);
      return 1;
    }

    const { error: resError } = await db.from("reservations").upsert(
      {
        hotel_id: hotel.id,
        mews_id: reservationId(g),
        number: g.bookingNumber,
        state: g.state,
        customer_mews_id: customerId(g),
        // Check-in 14:00, check-out 11:00, both hotel-local.
        start_utc: zonedTimeUtc(tz, arrival, "14:00"),
        end_utc: zonedTimeUtc(tz, departure, "11:00"),
        adult_count: 2,
        child_count: 0,
        raw: marker,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "hotel_id,mews_id" }
    );
    if (resError) {
      console.error(
        `Failed to seed booking ${g.bookingNumber}: ${resError.message}`
      );
      return 1;
    }

    console.log(
      `  ${g.email}\n` +
        `    guest      ${g.firstName} ${g.lastName}\n` +
        `    booking    ${g.bookingNumber} (${g.state})\n` +
        `    stay       ${arrival} → ${departure} (hotel-local)\n` +
        `    expect     ${g.expect}\n`
    );
  }

  // --- verify the matcher will actually link these --------------------------

  console.log("Verifying the email matcher can find them…");
  let ok = true;
  for (const g of GUESTS) {
    const { data: guest } = await db
      .from("customers")
      .select("mews_id, first_name, last_name")
      .eq("hotel_id", hotel.id)
      .eq("email", g.email)
      .maybeSingle();

    const { data: reservation } = guest
      ? await db
          .from("reservations")
          .select("number, start_utc, end_utc")
          .eq("hotel_id", hotel.id)
          .eq("customer_mews_id", guest.mews_id)
          .maybeSingle()
      : { data: null };

    if (!guest || !reservation) {
      ok = false;
      console.log(`  FAIL  ${g.email} → no match`);
      continue;
    }

    const arrival = localDate(tz, new Date(reservation.start_utc!));
    const departure = localDate(tz, new Date(reservation.end_utc!));
    const inHouse = arrival <= today && today <= departure;
    console.log(
      `  PASS  ${g.email} → ${guest.first_name} ${guest.last_name} · ` +
        `booking ${reservation.number} · ${arrival}→${departure} · ` +
        `${inHouse ? "IN-HOUSE" : "PRE-ARRIVAL"}`
    );
  }

  console.log(
    ok
      ? "\nDone. Send mail from those two addresses to the connected mailbox."
      : "\nSomething did not match — see the FAIL lines above."
  );
  return ok ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
