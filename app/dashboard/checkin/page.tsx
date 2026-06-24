import type { Metadata } from "next";

import {
  CheckinChasers,
  type ChaserCard,
} from "@/components/dashboard/checkin-chasers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckinPage() {
  const supabase = await createClient();

  // RLS scopes chasers to the caller's hotel.
  const { data: chasers } = await supabase
    .from("checkin_chasers")
    .select("id, reservation_id, guest_email, draft_content")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const reservationIds = [
    ...new Set((chasers ?? []).map((c) => c.reservation_id).filter(Boolean)),
  ] as string[];

  // Join reservation (arrival date, room type) and guest name.
  const reservationById = new Map<
    string,
    { start_utc: string | null; requested_category_id: string | null; customer_mews_id: string | null }
  >();
  const guestById = new Map<string, { first_name: string | null; last_name: string | null }>();

  if (reservationIds.length > 0) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("mews_id, start_utc, requested_category_id, customer_mews_id")
      .in("mews_id", reservationIds);
    for (const r of reservations ?? []) reservationById.set(r.mews_id, r);

    const guestIds = [
      ...new Set(
        (reservations ?? []).map((r) => r.customer_mews_id).filter(Boolean)
      ),
    ] as string[];
    if (guestIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("mews_id, first_name, last_name")
        .in("mews_id", guestIds);
      for (const c of customers ?? []) guestById.set(c.mews_id, c);
    }
  }

  const cards: ChaserCard[] = (chasers ?? []).map((c) => {
    const reservation = c.reservation_id
      ? reservationById.get(c.reservation_id)
      : undefined;
    const guest = reservation?.customer_mews_id
      ? guestById.get(reservation.customer_mews_id)
      : undefined;
    const name = [guest?.first_name, guest?.last_name]
      .filter(Boolean)
      .join(" ");
    return {
      id: c.id,
      guestName: name || c.guest_email || "Guest",
      guestEmail: c.guest_email,
      arrivalDate: reservation?.start_utc ?? null,
      roomType: reservation?.requested_category_id ?? null,
      draftContent: c.draft_content,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          Check-in chasing
        </h1>
        <p className="text-muted-foreground">
          Arrival-time requests for confirmed guests arriving in the next 7 days.
        </p>
      </div>

      <CheckinChasers chasers={cards} />
    </div>
  );
}
