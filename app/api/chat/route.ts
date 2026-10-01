import Anthropic from "@anthropic-ai/sdk";

import { classifyAiError } from "@/lib/ai-errors";
import { getSessionProfile } from "@/lib/auth";
import { AI_MODELS, provenance, sha256 } from "@/lib/ai-provenance";
import { flushAnalytics, track } from "@/lib/analytics";
import { sourcesFor } from "@/lib/chat-sources";
import { CHAT_HISTORY_LIMIT, pruneOwnThreads } from "@/lib/chat-threads";
import { buildHotelContext } from "@/lib/hotel-context";
import { buildHotelProfileSummary, HOTEL_PROFILE_COLUMNS } from "@/lib/hotel-profile";
import { reduceSurnames, type NameToReduce } from "@/lib/pseudonymise";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logSince, logValue, timed } from "@/lib/timing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Interactive Q&A over the hotel's own data. Sonnet gives strong reasoning at a
// fraction of Opus's cost — important because chat resends context each turn and
// is the highest-token surface. The ID is AI_MODELS.chat in lib/ai-provenance.ts;
// bump it there if you later offer a premium tier.
const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ca: "Catalan",
};

// Sentinel appended to the stream when a draft email was created from the chat.
// The UI splits on this to render the "View in inbox" card.
const DRAFT_SENTINEL = "__FONDA_DRAFT__";

// Sentinel + code appended when the answer failed (lib/ai-failure.ts). The UI
// swaps it for a calm sentence in the user's language; the provider's own
// error text never goes down the stream.
const ERROR_SENTINEL = "__FONDA_ERROR__";

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
  const requestStart = performance.now();
  // Resolve the hotel from the session — never trust a client-supplied id.
  const supabase = await createClient();
  // Verified identity + hotel in one helper (lib/auth.ts): a local JWT check
  // when Supabase uses asymmetric signing keys, instead of an Auth round trip
  // before every question.
  const user = await getSessionProfile();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!user.hotelId) {
    return new Response("No hotel for user", { status: 400 });
  }
  const hotelId = user.hotelId;

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

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const admin = createAdminClient();

  // The hotel's data, its settings and the thread check need nothing but the
  // hotel id, so they run together. Before 1 Oct they ran one after another in
  // front of every answer (docs/audits/2026-10-01-performance.md §4.8).
  const settingsRead = (async () => {
    const { data } = await supabase
      .from("hotel_settings")
      .select(`briefing_language, ${HOTEL_PROFILE_COLUMNS}`)
      .eq("hotel_id", hotelId)
      .maybeSingle();
    return data;
  })();
  /**
   * A client-supplied thread id, re-checked against this user before it is
   * trusted — it crosses the network, and the admin client bypasses RLS, so the
   * policy in migration 0023 cannot be what stops someone writing into a
   * colleague's thread. An id that does not check out is discarded and a new
   * thread starts below, rather than erroring: the answer has to go out either
   * way.
   */
  const ownedThreadRead = (async () => {
    if (!body?.threadId) return null;
    const { data } = await admin
      .from("chat_threads")
      .select("id")
      .eq("id", body.threadId)
      .eq("user_id", user.id)
      .eq("hotel_id", hotelId)
      .maybeSingle();
    return data?.id ?? null;
  })();
  const [context, settings, ownedThreadId] = await Promise.all([
    timed("ask.context", buildHotelContext(hotelId)),
    timed("ask.settings", settingsRead),
    timed("ask.thread", ownedThreadRead),
  ]);
  const language = LANGUAGES[settings?.briefing_language ?? "en"] ?? "English";
  const profileBlock = buildHotelProfileSummary(settings);

  /**
   * Three blocks, in this order, and the order is the point.
   *
   * The instructions and the hotel's data change a few times a day (a sync, a
   * settings edit), so they end in a cache breakpoint: a follow-up question
   * within five minutes reads them from Anthropic's prompt cache instead of
   * having the whole hotel processed again — sooner to the first word, and
   * cheaper. The inbox counts change with every five-minute mail poll, so they
   * sit AFTER the breakpoint; inside it, each poll would throw the cache away.
   *
   * Caching only applies once the cached part passes the model's minimum
   * (1,024 tokens for Sonnet); a small enough hotel is simply not cached, with
   * no other effect. PROMPT_VERSIONS.chat moved with this change.
   */
  const { emails: liveEmailCounts, ...hotelData } = context;
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text:
        `You are Fondas, the operations assistant for ${context.hotel.name}. ` +
        "Answer questions about the hotel using ONLY the data provided below. " +
        "If the answer is not in the data, say so clearly and suggest where the GM " +
        "might find it. Never invent or estimate data. Be concise and answer directly. " +
        `Speak in ${language}.` +
        (profileBlock ? `\n\n${profileBlock}` : ""),
    },
    {
      type: "text",
      text: `HOTEL DATA (JSON):\n${JSON.stringify(hotelData)}`,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text:
        "HOTEL DATA, LIVE INBOX (JSON) — part of the hotel data above, current " +
        `as of this question:\n${JSON.stringify({ emails: liveEmailCounts })}`,
    },
  ];

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

  /**
   * The conversation this turn belongs to: the checked one from above, or a
   * new one created on the first message. Created only once the context has
   * been built, as before, so a turn that fails there leaves no empty thread.
   */
  let threadId: string | null = ownedThreadId;
  // True when this turn starts a new conversation — the moment to drop the
  // oldest beyond the 10 a user keeps (lib/chat-threads.ts).
  let startedThread = false;
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
    startedThread = threadId !== null;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      let producedDraft = false;
      let firstToken = true;
      try {
        const claude = client.messages.stream({
          model: AI_MODELS.chat,
          max_tokens: 2048,
          output_config: { effort: "low" },
          system,
          messages: withHistoryBreakpoint(messages),
        });

        for await (const event of claude) {
          // Whether the hotel's data came from the prompt cache: token counts
          // only, behind PERF_LOG (lib/timing.ts).
          if (event.type === "message_start") {
            const usage = event.message.usage;
            logValue("ask.cache_read_tokens", usage.cache_read_input_tokens ?? 0);
            logValue(
              "ask.cache_write_tokens",
              usage.cache_creation_input_tokens ?? 0
            );
          }
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            if (firstToken) {
              firstToken = false;
              logSince("ask.ttft", requestStart);
            }
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Action routing: turn the answer into a draft email when asked.
        if (wantsDraft && assistantText.trim()) {
          const draftText = assistantText.trim();
          // Written by Ask, so it carries Ask's provenance (migration 0025):
          // the same model and prompt that produced the answer.
          const made = provenance("chat");
          const { data: draft } = await admin
            .from("emails")
            .insert({
              hotel_id: hotelId,
              draft_reply: draftText,
              classification: "general_inquiry",
              status: "pending",
              subject: "Draft from Ask Your Hotel",
              draft_model: made.model,
              draft_prompt_version: made.promptVersion,
              draft_generated_at: made.generatedAt,
              draft_sha256: sha256(draftText),
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
        // The real reason goes to the log and Sentry; the person gets a code.
        const code = classifyAiError(err, "chat") ?? "ai_unavailable";
        controller.enqueue(encoder.encode(`${ERROR_SENTINEL}${code}`));
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
                  // Art. 50(2) evidence: which model wrote the answer.
                  model: AI_MODELS.chat,
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
        // Keep the latest 10 conversations; delete older ones. As the user,
        // through RLS (migration 0027) — after the answer has streamed, so it
        // never delays it, and best-effort, so it never breaks it.
        if (startedThread) {
          try {
            await pruneOwnThreads(CHAT_HISTORY_LIMIT, supabase);
          } catch (err) {
            console.error("[chat] pruning old conversations failed:", err);
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

/**
 * The conversation, with a second prompt-cache breakpoint on its last message.
 *
 * The first breakpoint (end of the hotel data, above) makes each question
 * re-read the hotel from cache. This one also covers the conversation so far,
 * so the tenth question of a long thread doesn't re-process the nine before
 * it. Each turn writes the prefix through its question, and the next turn
 * reads it back: Anthropic looks for a cached prefix at earlier block
 * boundaries on its own. When the live inbox counts change (they sit between
 * the two breakpoints), only this part misses; the hotel data still hits.
 * Two of the four breakpoints a request may carry.
 */
function withHistoryBreakpoint(
  messages: ChatMessage[]
): Anthropic.MessageParam[] {
  // Every message in block form, the same shape on every turn, so a turn's
  // prefix is byte-for-byte the prefix the previous turn cached. Only the
  // last carries the marker. (An empty text block is refused by the API, so
  // an empty message stays a plain string.)
  return messages.map((m, i) =>
    m.content.trim()
      ? {
          role: m.role,
          content: [
            {
              type: "text" as const,
              text: m.content,
              ...(i === messages.length - 1
                ? { cache_control: { type: "ephemeral" as const } }
                : {}),
            },
          ],
        }
      : { role: m.role, content: m.content }
  );
}
