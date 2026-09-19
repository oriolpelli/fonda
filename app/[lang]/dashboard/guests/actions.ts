"use server";

import { revalidatePath } from "next/cache";

import type { GuestPreference, Occasion, TripPurpose } from "@/lib/guests";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Edits to a guest profile, all of them made by a person.
 *
 * Every write here goes through the ANON client so RLS scopes it to the
 * caller's hotel. The service role is not used for guest data from page code —
 * `CLAUDE.md`, "Safety & boundaries", and this is the table that rule most
 * exists for.
 */

async function currentHotelId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.hotel_id ?? null;
}

function revalidateGuest(customerMewsId: string): void {
  revalidatePath("/[lang]/dashboard/guests", "page");
  revalidatePath(`/[lang]/dashboard/guests/${customerMewsId}`, "page");
}

/**
 * Saves the staff note.
 *
 * Writes `notes` AND NOTHING ELSE. The symmetry with lib/guest-inference.ts is
 * deliberate: inference writes every column except this one, and this writes
 * only this one. Neither can clobber the other's work, and that property comes
 * from the shape of the two writes rather than from anybody remembering a rule.
 */
export async function saveGuestNote(
  customerMewsId: string,
  notes: string
): Promise<{ error?: string }> {
  const hotelId = await currentHotelId();
  if (!hotelId) return { error: "unauthenticated" };

  const supabase = await createClient();
  const { error } = await supabase.from("guest_profiles").upsert(
    {
      hotel_id: hotelId,
      customer_mews_id: customerMewsId,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "hotel_id,customer_mews_id" }
  );
  if (error) return { error: "save_failed" };

  revalidateGuest(customerMewsId);
  return {};
}

/**
 * Sets or clears a tag.
 *
 * A tag set here is a STAFF value, and the merge in lib/guest-inference.ts
 * leaves an existing scalar alone — so once a human has said "this is
 * business", inference stops guessing at it. Clearing it (null) hands it back:
 * the next run may fill the blank again, which is the honest behaviour for
 * "I don't know" as opposed to "you were wrong".
 */
export async function setGuestTag(
  customerMewsId: string,
  field: "trip_purpose" | "occasion",
  value: TripPurpose | Occasion | null
): Promise<{ error?: string }> {
  const hotelId = await currentHotelId();
  if (!hotelId) return { error: "unauthenticated" };

  // Two explicit branches rather than a computed key. The generated Insert
  // type rejects an index signature, and the tempting fix — casting it away —
  // would also throw away the check that `field` is one of these two columns,
  // which is the one thing worth keeping about a value that crossed the
  // network. Two upserts, each with a literal shape, keeps the type doing its
  // job.
  const supabase = await createClient();
  const base = {
    hotel_id: hotelId,
    customer_mews_id: customerMewsId,
    updated_at: new Date().toISOString(),
  };
  const onConflict = { onConflict: "hotel_id,customer_mews_id" } as const;

  const { error } =
    field === "trip_purpose"
      ? await supabase
          .from("guest_profiles")
          .upsert(
            { ...base, trip_purpose: value as TripPurpose | null },
            onConflict
          )
      : await supabase
          .from("guest_profiles")
          .upsert({ ...base, occasion: value as Occasion | null }, onConflict);
  if (error) return { error: "save_failed" };

  revalidateGuest(customerMewsId);
  return {};
}

/** Removes one preference. Staff-sourced ones are removable like any other. */
export async function removeGuestPreference(
  customerMewsId: string,
  text: string
): Promise<{ error?: string }> {
  const hotelId = await currentHotelId();
  if (!hotelId) return { error: "unauthenticated" };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("guest_profiles")
    .select("preferences")
    .eq("hotel_id", hotelId)
    .eq("customer_mews_id", customerMewsId)
    .maybeSingle();

  const current = Array.isArray(row?.preferences)
    ? (row.preferences as unknown as GuestPreference[])
    : [];
  const next = current.filter(
    (p) => p?.text?.trim().toLowerCase() !== text.trim().toLowerCase()
  );

  const { error } = await supabase
    .from("guest_profiles")
    .update({
      preferences: next as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("hotel_id", hotelId)
    .eq("customer_mews_id", customerMewsId);
  if (error) return { error: "save_failed" };

  revalidateGuest(customerMewsId);
  return {};
}
