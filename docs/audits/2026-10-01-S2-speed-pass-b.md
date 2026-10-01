# S2 — Speed, pass B: build record

**Date:** 1 October 2026 · **Branch:** `perf/pass-b`, cut from `main` at `94e9c77`, where S1 was merged on 1 Oct
**Scope:** `docs/audits/2026-10-01-performance.md` §6, prompts **P5–P8** · **Status:** built and gated, **not merged**. **No migration.**
**Why now:** Oriol decided on 1 Oct that speed comes before anything else (`ROADMAP.md` §1 Step 3). S1 made every read cheaper. S2 makes the product *feel* instant: pages paint before their slowest read, and clicks answer before the server does.

There is one commit per prompt, plus one commit fixing what the independent review found. Unlike S1, part of this pass is visible: skeletons fill in place, clicked rows move at once, and a guest's AI tags arrive a moment after the record.

---

## 1. Before you deploy this branch

1. **S1 is already on `main`** (merged 1 Oct), so this branch holds only S2's commits. If S1's preview clicks (S1 record §4) weren't run before that merge, run them on production first: then anything odd can be told apart from S2.
2. **Nothing to apply in Supabase.** S2 adds no migration.
3. Push `perf/pass-b`. Vercel builds a **preview**.
4. Optional, but it gives you the numbers: keep `PERF_LOG=1` on Preview. S2 adds three lines to Ask: `ask.settings`, `ask.thread`, and `ask.cache_read_tokens` / `ask.cache_write_tokens` (counts only).
5. Run the clicks in §4, then merge.

## 2. Commits, in order

| # | Commit | What | Gate |
|---|---|---|---|
| P5 | `af26238` | **Streaming.** Each Home widget is its own `<Suspense>` with a skeleton in its own shape. The sidebar badges arrive as a promise and no longer hold the page. The Brief renders before "since the brief". Communications' guest panes stream in. Sent mail travels as a 280-character preview, and the full text is fetched when a message is opened (`loadEmailBody`, RLS client) | lint, tsc, build, e2e (all routes × en/es/ca) |
| P6 | `a43cea3` | **Optimistic inbox.** Send, Needs attention and Ignore move their row on click (`useOptimistic`). A failed action brings the row back, and a failed send keeps the GM's edited text. Gmail access tokens are cached per mailbox, and concurrent refreshes share one request. The acceptance metric and analytics run in `after()`; status, then provenance, are still written before the response (95a1e7f). Bulk sends three at a time | lint, tsc, build, e2e (flag, ignore, failed send) |
| P7 | `3179f2a` | **Guest record first.** The record renders from stored data, and inference streams into the tags with a quiet "Fondas AI is updating…" line while the pickers are held. A failure pauses inference for 10 minutes: for every guest if the provider failed, for that guest otherwise. Failures are now logged and reported | lint, tsc, build, e2e (failing and working fake provider) |
| P8 | `9350bc7` | **Ask caches the hotel.** The system prompt is three blocks: instructions, hotel data with `cache_control`, then the live inbox counts after the breakpoint. Settings, the thread check and the context build run together. Chunked reads run 4 at a time, and the inbox counts read alongside the reservations. `PROMPT_VERSIONS.chat` → `chat@2026-10-01b` | lint, tsc, build, e2e (cache prefix stable across turns) |
| fix | `b38b652` | **Review fixes.** No double send after a lost response (`sendReply` refuses a sent row). Failures are kept per message, not in a banner the next click clears. Flag and Ignore report a failed write. The inference write is checked and the model call bounded (20 s, 1 retry). The Gmail 401 eviction can't drop a fresh token. Previews never cut an emoji in half | lint, tsc, build, e2e |

## 3. What was measured

**Harness.** These are production builds of S1 (`94e9c77`) and S2 (`b38b652`) under `next start`, side by side, in headless Chromium.
- Supabase is stood in for by a small PostgREST-and-Auth subset over Postgres 16, running every real migration and RLS policy.
- Every database call is given **30 ms**, roughly a Vercel → Supabase round trip.
- The test hotel has 45,500 reservations and 4,500 emails.
- The AI provider is a fake that answers after 1.5 s.

Times are medians and are relative, not production numbers. The preview's `[perf]` lines are the real ones.

| What | S1 | S2 |
|---|---|---|
| **Home**: first paint | 836 ms | **352 ms** |
| Home: every widget filled | 1,582 ms | **1,091 ms** |
| **Brief**: first paint | 800 ms | **508 ms** |
| **Upcoming**: first paint | 856 ms | **380 ms** |
| Upcoming: list visible / a row opens | 1,274 / 1,341 ms | **1,162 / 1,244 ms** |
| Upcoming: server first byte | 0.36 s | **0.12 s** |
| **Guest record** with inference due: first paint | 456 ms | **316 ms** |
| Guest record: record readable | 2,283 ms (waits on the model) | **653 ms** (the model's tags follow) |
| Guest record with the AI **failing**, later views | every view waits on a failing call | **one call per 10 min**; later views don't wait |
| **Needs attention** click → pane updates | 1,396 ms | **91 ms** |
| Ignore / Send click → row leaves the queue | not timed (same server round trip as Flag) | **~100–130 ms** |
| **Ask**: context build (`ask.context`) | ~660 ms | **~455 ms** |
| Ask: second question in a conversation | whole hotel re-processed | hotel data **read from cache** (5,362 tokens in the test) |

Notes:

- **The Ask cache was checked for stability, not speed.** The fake provider hashes everything up to the breakpoint. Turn 1 wrote it, and turn 2 read it back, even with an email's status changed between the two turns. That is the case that matters, because the mail poll moves the counts every 5 minutes. How much sooner the first word arrives on a cache hit can only be measured on the preview (`ask.ttft`, turn 1 against turn 2).
- **The minimum for caching** is 1,024 tokens for Sonnet 4.6 (Anthropic's prompt-caching docs). A small enough hotel isn't cached at all, with no other effect.
- **What still costs time on Upcoming is the page's size.** The 200 rows carry about 1.5 MB of data: open work keeps its full text and draft by design (P5), and the test hotel's emails average 4,240 characters. See §6.

## 4. Clicks to run on the preview (en / es / ca, desktop and 375 px)

1. **Home, hard load.** The greeting and the card outlines appear at once, then each card fills its own outline without the page jumping. The sidebar counts appear a moment after the sidebar.
2. **Communications.**
   - **Send a reply.** The row leaves "Needs you" at once and, in "All", reads "Sending…" then "Reply sent · time". The guest receives it **once**.
   - **Needs attention and Ignore** react at once.
   - **Bulk-approve** a few: they leave together, and "Sent N of M" appears if any are skipped.
3. **A failed send.** Turn Wi-Fi off and click Send. The row comes back marked "Didn't go through", the error shows in the pane, and **your edited text is still in the editor**. Turn Wi-Fi on and Send again: it goes once.
4. **Open a sent message** in "All". The first lines appear at once and the full text fills in.
5. **Guest record.** The page opens at once. If a run is due, the tags show "Fondas AI is updating these from recent mail" with the two pickers held, then the inferred values arrive with their "Inferred by Fondas AI" lines. Notes can be typed throughout.
6. **Ask.** Ask two questions in the same conversation, within 5 minutes. In the function logs, the second turn shows `ask.cache_read_tokens` above 0 and a lower `ask.ttft`. Both answers are logged with their model, as before.
7. **The Brief.** The brief appears first and "since the brief" follows.

## 5. The independent review

A separate agent reviewed the four commits against the installed Next 16 and React sources. It found two real defects that P6 had introduced, both fixed in `b38b652`:

1. **A send whose answer was lost could go out twice.** The row came back looking unsent while the guest already had the reply. `sendReply` now refuses a row that is already sent, and a thrown action refreshes the page to its real state.
2. **A failed send could slip back into the queue unexplained**, because the next click cleared the shared error line. Failures are now kept per message and shown on the row and in the pane.

Things it confirmed:

- Send writes status before provenance.
- `loadEmailBody` can't read another hotel's mail, through RLS.
- The Gmail token cache can't cross mailboxes.
- The Ask cache prefix is stable.
- The chunked reads keep their order.

Things left as they are:

- **A staff tag set in another tab during an inference run can still be overwritten.** This predates the branch: the run writes the profile it read before the model call. The page that started the run holds its pickers, but a second tab doesn't. The fix is a conditional write (fill only blanks) through an RPC, which means a migration, so it goes on the list.
- **Opening a sent message while sends are in flight** waits for them, because Next runs server actions one at a time. A GET route for the body would avoid that. Low priority.
- **Ask caches the hotel, not the conversation.** A second breakpoint on the last message would cache a long conversation's history too. It is cheap to add once the first breakpoint has proved itself on the preview.

## 6. Decisions for Oriol

- **Inference back-off is in memory, per server instance.** With a few warm instances, that is a handful of attempts per 10 minutes rather than one per view. Exact back-off needs a `guest_profiles.inference_failed_at` column (a migration). I'd leave it unless the logs say otherwise.
- **The Gmail thread id is not stored.** Each send still looks up the thread (one Gmail call). Storing it needs a migration, and the optimistic row already hides the wait. Skipped.
- **After Send, the pane goes empty** ("Select an email") rather than opening the next message. Auto-advance is a UX call, not a speed one, so it is unchanged.
- **The next lever on Communications is the page's size.** Open work keeps its full text so it is never a fetch away. Moving it to previews too would roughly halve the page, but put every message you open one request away. **P9** (send the browser only the dictionary namespaces it uses, about 60 KB off every page) is the cleaner first step.

## 7. Not done here, on purpose

- **P9** (dictionary split) and **P10** (Cache Components spike) stay parked, per `ROADMAP.md` §3.6.
- **Hover-prefetch for guest links.** The Guests list and Arrivals prefetch every guest link on screen: 80 requests for one scroll of the list in the harness. These are only the loading-state prefetches, which are cheap, and **none of them runs inference** (0 model calls during that visit). Revisit if the logs show it.
