"use server";

import { revalidatePath } from "next/cache";

import { loadHomeLayout, saveHomeLayout, type StoredLayout } from "@/lib/home-layout";
import type { HomeWidgetKey } from "@/lib/home-widgets";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["user_role"];

/**
 * Home's Customize panel writes through here (APP_UX_PROPOSAL.md §3.4–§3.5).
 *
 * On success the action echoes back what was persisted, the same contract
 * `brief/actions.ts` uses: the panel re-seeds its list from this rather than
 * from its server props, so what is on screen is what is in the database
 * without depending on when the re-rendered RSC payload lands.
 */
export type HomeLayoutState =
  | { ok: true; saved: StoredLayout }
  | { error: string }
  | undefined;

/** The caller's own row — both halves of the RLS predicate come from here. */
async function requireViewer(): Promise<{
  userId: string;
  hotelId: string;
  role: Role;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id, role")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("No hotel associated with this user.");
  return { userId: user.id, hotelId: profile.hotel_id, role: profile.role };
}

/**
 * Shape-checks the JSON the panel posts. Whether the *keys* are real is
 * `saveHomeLayout`'s call — it owns the registry check, so there is one place
 * that decides what may be stored.
 */
function parseLayout(raw: string): StoredLayout | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Couldn't read the layout." };
  }
  if (!Array.isArray(parsed)) {
    return { error: "Couldn't read the layout." };
  }

  const layout: StoredLayout = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "Couldn't read the layout." };
    }
    const { key, enabled } = entry as { key?: unknown; enabled?: unknown };
    if (typeof key !== "string") {
      return { error: "Couldn't read the layout." };
    }
    layout.push({ key: key as HomeWidgetKey, enabled: Boolean(enabled) });
  }
  return layout;
}

/** Saves the signed-in user's Home layout: which widgets, in which order. */
export async function updateHomeLayout(
  _prevState: HomeLayoutState,
  formData: FormData
): Promise<HomeLayoutState> {
  const layout = parseLayout(String(formData.get("layout") ?? "[]"));
  if (!Array.isArray(layout)) {
    return layout;
  }

  let viewer: Awaited<ReturnType<typeof requireViewer>>;
  try {
    viewer = await requireViewer();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // dashboard_layouts is client-writable for the row's own user (RLS, 0022),
  // so the session client writes it directly — no service-role shortcut.
  const supabase = await createClient();
  const result = await saveHomeLayout(
    supabase,
    viewer.userId,
    viewer.hotelId,
    layout
  );
  if ("error" in result) {
    return result;
  }

  // Read back rather than echoing the input: the panel should show the layout
  // the *registry* resolved, which may have appended a widget shipped since the
  // page loaded. The role argument is the defaults path and shouldn't be
  // reachable here — the row was just written — but it is the caller's real
  // role, not a guess, so a lost race degrades to their defaults.
  const saved = await loadHomeLayout(supabase, viewer.userId, viewer.role);

  // Route paths, not URL paths — the locale is a dynamic `[lang]` segment, so
  // "/dashboard" matches no route and silently revalidates nothing.
  revalidatePath("/[lang]/dashboard", "page");
  return { ok: true, saved };
}
