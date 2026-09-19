import Anthropic from "@anthropic-ai/sdk";

import { flushAnalytics, track } from "@/lib/analytics";
import { sourcesFor } from "@/lib/chat-sources";
import { buildHotelContext } from "@/lib/hotel-context";
import { buildHotelProfileSummary, HOTEL_PROFILE_COLUMNS } from "@/lib/hotel-profile";
import { reduceSurnames, type NameToReduce } from "@/lib/pseudonymise";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Interactive Q&A over the hotel's own data. Sonnet gives strong reasoning at a
// fraction of Opus's cost — important because chat resends context each turn and
// is the highest-token surface. Bump to claude-opus-4-8 if you later offer a
// premium tier.
const CHAT_MODEL = "claude-sonnet-4-6";
const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ca: "Catalan",
};

// Sentinel appended to the stream when a draft email was created from the chat.
// The UI splits on this to render the "View in inbox" card.
const DRAFT_SENTINEL = "__FONDA_DRAFT__";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** How wide a window of guests a typed name is likely to come from. */
const NAME_WINDOW_DAYS = 30;

/**
 * The guests whose full names might appear in a chat message.
 *
 * Deliberately NOT every customer the hotel has ever had. A GM types the name
 * of somebody arriving, staying, or just gone, so the list is scoped to
 * reservations within a month either side of today — tens of rows rather than
 * the thousands 24 months of retention holds. This runs AFTER the answer has
 * streamed, so its cost is not in anybody's latency.
 *
 * Fails soft to an empty list: pseudonymisation that cannot find the names is a
 * weaker guarantee, but a chat turn that 500s because a lookup failed is worse,
 * and the turn is already sent by the time this runs.
 */
async function guestNamesNearToday(
  admin: ReturnType<typeof createAdminClient>,
  hotelId: string
): Promise<NameToReduce[]> {
  try {
    const now = Date.now();
    const from = new Date(now - NAME_WINDOW_DAYS * 86_400_000).toISOString();
    const to = new Date(now + NAME_WINDOW_DAYS * 86_400_000).toISOString();

    const { data: reservations } = await admin
      .from("reservations")
      .select("customer_mews_id")
      .eq("hotel_id", hotelId)
      .gte("start_utc", from)
      .lte("start_utc", to)
      .limit(500);

    const ids = [
      ...new Set(
        (reservations ?? []).map((r) => r.customer_mews_id).filter(Boolean)
      ),
    ] as string[];
    if (ids.length === 0) return [];

    const { data: customers } = await admin
      .from("customers")
      .select("first_name, last_name")
      .eq("hotel_id", hotelId)
      .in("mews_id", ids);

    return (customers ?? []).map((c) => ({
      first: c.first_name,
      last: c.last_name,
    }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  // Resolve the hotel from the session — never trust a client-supplied id.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return new Response("No hotel for user", { status: 400 });
  }
  const hotelId = profile.hotel_id;

  const body = (await request.json().catch(() => null)) as {
    messages?: ChatMessage[];
    threadId?: string;
  } | null;
  const messages = (body?.messages ?? []).filter(
    (m): m is ChatMessage =>
      (m?.role === "user" || m?.role === "assistant") &&
      typeof m.content === "string"
  );
  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const wantsDraft =
    !!lastUser && /draft an email|write an email/i.test(lastUser.content);

  const context = await buildHotelContext(hotelId);
  const { data: settings } = await supabase
    .from("hotel_settings")
    .select(`briefing_language, ${HOTEL_PROFILE_COLUMNS}`)
    .eq("hotel_id", hotelId)
    .maybeSingle();
  const language = LANGUAGES[settings?.briefing_language ?? "en"] ?? "English";
  const profileBlock = buildHotelProfileSummary(settings);

  const system =
    `You are Fondas, the operations assistant for ${context.hotel.name}. ` +
    "Answer questions about the hotel using ONLY the data provided below. " +
    "If the answer is not in the data, say so clearly and suggest where the GM " +
    "might find it. Never invent or estimate data. Be concise and answer directly. " +
    `Speak in ${language}.` +
    (profileBlock ? `\n\n${profileBlock}` : "") +
    `\n\nHOTEL DATA (JSON):\n${JSON.stringify(context)}`;

  /**
   * Which blocks of the hotel's data were put in front of the model
   * (APP_UX_PROPOSAL.md §4.4). Derived from the assembled context, not asked
   * of the model: "what did you use?" is introspection it cannot do reliably,
   * and a guess dressed as provenance is worse than none.
   *
   * Keys, not prose — the chat thread looks the label up in the dictionary, so
   * the chips translate and a source name can never carry guest data.
   */
  const sources = sourcesFor(context, Boolean(profileBlock));

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const admin = createAdminClient();

  /**
   * The conversation this turn belongs to, created on the first message.
   *
   * A client-supplied id is re-checked against this user before it is trusted —
   * it crosses the network, and the admin client bypasses RLS, so the policy in
   * migration 0023 cannot be what stops someone writing into a colleague's
   * thread. An id that does not check out is discarded and a new thread starts,
   * rather than erroring: the answer has to go out either way.
   */
  let threadId: string | null = null;
  if (body?.threadId) {
    const { data: owned } = await admin
      .from("chat_threads")
      .select("id")
      .eq("id", body.threadId)
      .eq("user_id", user.id)
      .eq("hotel_id", hotelId)
      .maybeSingle();
    threadId = owned?.id ?? null;
  }
  if (!threadId && lastUser) {
    const { data: created } = await admin
      .from("chat_threads")
      .insert({
        hotel_id: hotelId,
        user_id: user.id,
        // The first thing you asked, which is what you will recognise it by.
        // Stored pseudonymised like everything else that lands in a table.
        title: lastUser.content.trim().slice(0, 80) || null,
      })
      .select("id")
      .single();
    threadId = created?.id ?? null;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      let producedDraft = false;
      try {
        const claude = client.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 2048,
          output_config: { effort: "low" },
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of claude) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Action routing: turn the answer into a draft email when asked.
        if (wantsDraft && assistantText.trim()) {
          const { data: draft } = await admin
            .from("emails")
            .insert({
              hotel_id: hotelId,
              draft_reply: assistantText.trim(),
              classification: "general_inquiry",
              status: "pending",
              subject: "Draft from Ask Your Hotel",
            })
            .select("id")
            .single();
          if (draft) {
            producedDraft = true;
            controller.enqueue(
              encoder.encode(`${DRAFT_SENTINEL}${draft.id}`)
            );
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[Error: ${(err as Error).message}]`)
        );
      } finally {
        // Length, turn count and whether it produced a draft — never the
        // question or the answer. Both can quote guest data verbatim.
        track(hotelId, "chat_query", {
          chars: lastUser?.content.length ?? 0,
          turns: messages.length,
          produced_draft: producedDraft,
        });
        await flushAnalytics();

        // Log the turn — PSEUDONYMISED AT REST (§11 decision 6, point 2).
        //
        // This used to insert `lastUser.content` verbatim, on the reasoning
        // that the CONTEXT fed to the model was already pseudonymised. That
        // covered the assistant's answer and missed the obvious half: the
        // question. "What room is María Villanueva in?" put a guest's full name
        // into the table in plaintext, typed by the GM rather than supplied by
        // us. Both halves go through the reducer now.
        //
        // The live request above still carried real names, and the GM still saw
        // real names on screen. Only the durable copy is reduced.
        if (lastUser || assistantText) {
          const names = await guestNamesNearToday(admin, hotelId);
          const rows = [
            lastUser
              ? {
                  hotel_id: hotelId,
                  thread_id: threadId,
                  user_id: user.id,
                  role: "user",
                  content: reduceSurnames(lastUser.content, names),
                }
              : null,
            assistantText
              ? {
                  hotel_id: hotelId,
                  thread_id: threadId,
                  user_id: user.id,
                  role: "assistant",
                  content: reduceSurnames(assistantText, names),
                }
              : null,
          ].filter((row) => row !== null);
          await admin.from("chat_logs").insert(rows);

          // Sorts the thread list, so it has to move on every turn and not
          // only on the first.
          if (threadId) {
            await admin
              .from("chat_threads")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", threadId);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // The body is a text stream, so both of these ride on headers: the
      // client needs the thread id before the stream finishes in order to send
      // the next turn into the same conversation, and the sources are known
      // before the first token so the chips can render with the answer rather
      // than appearing after it.
      ...(threadId ? { "X-Fondas-Thread-Id": threadId } : {}),
      "X-Fondas-Sources": sources.join(","),
    },
  });
}
