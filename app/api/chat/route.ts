import Anthropic from "@anthropic-ai/sdk";

import { buildHotelContext } from "@/lib/hotel-context";
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
    .select("briefing_language")
    .eq("hotel_id", hotelId)
    .maybeSingle();
  const language = LANGUAGES[settings?.briefing_language ?? "en"] ?? "English";

  const system =
    `You are Fonda, the operations assistant for ${context.hotel.name}. ` +
    "Answer questions about the hotel using ONLY the data provided below. " +
    "If the answer is not in the data, say so clearly and suggest where the GM " +
    "might find it. Never invent or estimate data. Be concise and answer directly. " +
    `Speak in ${language}.\n\nHOTEL DATA (JSON):\n${JSON.stringify(context)}`;

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const admin = createAdminClient();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
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
        // Log the turn (pseudonymised context → reduced PII).
        if (lastUser || assistantText) {
          await admin.from("chat_logs").insert(
            [
              lastUser
                ? { hotel_id: hotelId, role: "user", content: lastUser.content }
                : null,
              assistantText
                ? { hotel_id: hotelId, role: "assistant", content: assistantText }
                : null,
            ].filter((row) => row !== null)
          );
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
