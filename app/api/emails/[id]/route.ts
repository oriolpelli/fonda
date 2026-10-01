import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The full body and draft of one message, for the inbox
 * (components/dashboard/email-inbox.tsx). The list carries only the first
 * lines of most messages (communications/window.tsx); this fills one in when
 * it is hovered or opened.
 *
 * A GET route rather than a Server Action on purpose. Next runs a page's
 * Server Actions one at a time, so a body fetched that way waited behind every
 * Send still in flight. GETs run side by side, and can start on hover.
 *
 * Read through the user's own RLS client: a message outside their hotel is
 * simply not found. `no-store`: a draft is a live thing, and the inbox keeps
 * its own copy for the page's life.
 */
const NO_STORE = { "Cache-Control": "private, no-store" };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({}, { status: 404, headers: NO_STORE });
  }
  // The proxy doesn't run on /api, so the session is checked here; RLS below
  // is what scopes the row to the user's hotel.
  if (!(await getSessionProfile())) {
    return NextResponse.json({}, { status: 401, headers: NO_STORE });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("body, draft_reply")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({}, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(
    { body: data.body, draft_reply: data.draft_reply },
    { headers: NO_STORE }
  );
}
