import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { syncAllConnectedHotels, syncHotel } from "@/lib/mews-sync";
import { createClient } from "@/lib/supabase/server";

// Always run at request time; never cache the sync result.
export const dynamic = "force-dynamic";
// Cron syncs can span many hotels — allow a generous ceiling (Vercel Pro: 300s).
export const maxDuration = 300;

// Roadmap: sync reservations for today ± 14 days.
const DEFAULT_WINDOW_DAYS = 14;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Resolves the sync window from query params, defaulting to today ± 14 days.
 * `?from=ISO` / `?to=ISO` override either bound.
 */
function resolveWindow(searchParams: URLSearchParams): {
  start: string;
  end: string;
} {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const today = startOfTodayUtc();

  const start = fromParam ? new Date(fromParam) : addDays(today, -DEFAULT_WINDOW_DAYS);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid 'from' date: ${fromParam}`);
  }

  const end = toParam ? new Date(toParam) : addDays(today, DEFAULT_WINDOW_DAYS);
  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid 'to' date: ${toParam}`);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Scheduled entry point (Vercel Cron sends a GET with the
 * `Authorization: Bearer ${CRON_SECRET}` header). Syncs every connected hotel.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return unauthorized();
  }

  let window: { start: string; end: string };
  try {
    window = resolveWindow(new URL(request.url).searchParams);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const outcomes = await syncAllConnectedHotels(window.start, window.end);
  const totals = outcomes.reduce(
    (acc, o) => {
      if (o.result) {
        acc.reservations += o.result.reservations;
        acc.customers += o.result.customers;
      }
      if (o.error) acc.failed += 1;
      return acc;
    },
    { reservations: 0, customers: 0, failed: 0 }
  );

  return NextResponse.json({
    window,
    hotels: outcomes.length,
    ...totals,
    outcomes,
  });
}

/**
 * User-triggered sync ("Sync now"). Requires an authenticated session and only
 * ever syncs the caller's own hotel.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    return NextResponse.json(
      { error: "No hotel associated with this user." },
      { status: 400 }
    );
  }

  let window: { start: string; end: string };
  try {
    window = resolveWindow(new URL(request.url).searchParams);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    const result = await syncHotel(profile.hotel_id, window.start, window.end);
    return NextResponse.json({ window, hotelId: profile.hotel_id, ...result });
  } catch (err) {
    // e.g. hotel not connected to MEWS, or a MewsApiError.
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
