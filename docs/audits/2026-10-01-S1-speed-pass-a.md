# S1 — Speed, pass A: build record

**Date:** 1 October 2026 · **Branch:** `perf/pass-a` (cut from `main` at `ffed0e3`)
**Scope:** `docs/audits/2026-10-01-performance.md` §6, prompts **M1, P1–P4** · **Status:** built and gated, **not merged**. Migration 0028 is applied and verified (1 Oct); what remains is to test the preview, then merge.
**Why now:** this was Oriol's call on 1 Oct: speed comes before anything else that is built (`ROADMAP.md` §1 Step 3).

This record covers what changed, what it measured, how each step was checked and what is still owed. There is one commit per step, so any one can be reverted on its own. Nothing a user sees changes, apart from speed.

---

## 1. Before you deploy this branch

1. ✅ **Apply `supabase/APPLY_0028.sql`** in the Supabase SQL editor. It only adds indexes and is safe to run twice. The check query is in its header; expect three rows. **Done 1 Oct by Oriol: all three indexes present.**
2. Push `perf/pass-a`. Vercel builds a **preview**, and production stays on `main`.
3. Optional, but it gives you the numbers: on the preview, set **`PERF_LOG=1`** (Vercel → Settings → Environment Variables → Preview only) and redeploy. The function logs then print one line per read, for example `[perf] home.snapshot 41ms`. For a before-and-after, push the branch at `30ad07e` first, note the numbers, then push the rest.
4. Run the clicks in §3, then merge to `main`.

If the branch reaches production **without 0028**, everything still works. Home's window read is ordered to use an index that isn't there yet, so it runs about as fast as before rather than faster.

## 2. Commits, in order

| # | Commit | What | Gate |
|---|---|---|---|
| — | `ffed0e3` (on `main`) | ROADMAP reordered: S1, S2, B17, W10. The audit; §5 #11 speed rules; CLAUDE.md pointer | — |
| M1 | `30ad07e` | `lib/timing.ts`: opt-in `[perf]` lines (`PERF_LOG=1`), with static labels and no PII. It wraps every loader on Home, Brief, Arrivals, Communications, Guests, the guest record, the layout, and Ask's context build and time to first token | lint, tsc, build |
| P1 | `579b1ea` | No full PMS payload, and no email bodies outside the inbox. `withSlimRaw` and the JSON-path select. `loadInboxSummary` serves badges, Home and the brief's "since"; `draftsReady` is unchanged | lint, tsc, build, 28-shape reader equivalence |
| P2 | `2ae07dc` | `getHotel()`: one hotels read per request. Layout, Home, Brief, Arrivals, Guests and the guest record load in parallel. The Communications parent no longer loads the inbox. Connections counts are "estimated" | lint, tsc, build |
| P1b | `412c7d3` | Payload keys are requested per reader, because each `raw->'Key'` decompresses `raw` again. Home's window is ordered by `(end_utc, mews_id)` so it can use the new index | lint, tsc, build, 252 reader × shape × selection checks, Postgres timings |
| P3 | `509b7b5` | **Migration 0028** and `APPLY_0028.sql`: `reservations(hotel_id, end_utc)`, `emails(hotel_id, created_at desc)` and `emails(hotel_id, customer_mews_id)` | Postgres 16: 0001–0028 applied and re-run, EXPLAIN as the `authenticated` role |
| P4 | `be26356` | `staleTimes.dynamic = 30`; Sentry loads when idle; Customize's drag loads on open; no double render after inbox actions or a layout save | lint, tsc, build, JS per route |
| fix | `136661c` | Review fixes: every `fetch()`-based mutation now refreshes (Ask, brief generation, onboarding), and the inbox sort and queue are read from the cookie in the browser. Home's rows are deduplicated and put back in `mews_id` order. Customize and Sentry fail soft | lint, tsc, build, `next start` smoke test |

## 3. What was measured

**JavaScript per first load**, gzipped, from the production build's client manifests:

| Route | Before | After |
|---|---|---|
| Home | 268 KB | **184 KB** |
| Communications windows | 256 KB | **186 KB** |
| Other dashboard pages | 250 KB | **180 KB** |
| Login / signup | 237 KB | **167 KB** |
| Landing | 241 KB | **171 KB** |

**Database**: Postgres 16 with migrations 0001–0027 applied over Supabase-style roles. The test data is one hotel with 45,500 reservations at about 2.3 KB of `raw` each (1,850 in Home's window, close to the test hotel's 1,677) and 3,000 emails. Each query was timed as the `authenticated` role through RLS, with the JSON aggregation PostgREST does:

| Read | Before | After |
|---|---|---|
| Home's 16-night window (one page) | 40 ms, 2.5 MB | **7.7 ms, 0.27 MB** |
| Today's departures | 47 ms | **< 10 ms** |
| Inbox, newest 200 (Home / Brief use the summary) | 4.4 ms, 981 KB | **0.9 ms, 61 KB** |
| Sidebar badges (every hard load) | 12.3 ms, 2.5 MB | **2.5 ms, 154 KB** |
| Ask's context window | 33 ms, 2.5 MB | **23 ms, 0.25 MB** |
| Guests list, 500 stays | 9.2 ms, 1.3 MB | **4.9 ms, 0.15 MB** |

**Round trips** on the critical path, counted from the code:

| Page | Before | After |
|---|---|---|
| Home | ~7 | ~4 |
| Brief | 7 | ~3 |
| Communications window | 6 | ~4 |
| Deep link into an email | 2 requests, inbox loaded twice | 2 requests, one message read and one inbox load |
| Arrivals | 4 | 3 |
| Guest record (before inference) | 5 | 3 |
| Layout, hard load | session, then 3 | all at once |

Two findings changed the plan as it ran:

- **Each `raw->'Key'` decompresses `raw` again.** Selecting all twelve keys cut the payload but not the database time (45 ms against 40 ms). Grouping the keys by reader fixed it.
- **The planner preferred the `mews_id` index.** Ordering Home's read by `mews_id` made the planner walk that index across the hotel's whole history, even with the new index in place. Ordering by `end_utc` lets it use the index; the rows are then re-sorted in JavaScript.

RLS needed no rewrite here. With an explicit `hotel_id` filter the planner turns `hotel_id = current_hotel_id()` into a **one-time filter**, and the new inbox index uses it directly as its index condition. The ROADMAP §3.6 item stays parked.

## 4. Clicks to run on the preview (en / es / ca, desktop and 375 px)

1. **Home.** Numbers, outlook, arrivals, departures, VIPs without a note, inbox pulse ("drafts ready" should match the inbox) and sync health all match production for the same hotel.
2. **Sidebar Home → Arrivals → Home within 30 s.** The second Home appears instantly, with no skeleton.
3. **Communications.** Send a reply. The list updates once, with one `?_rsc` request in the network tab, not two. Flag and dismiss behave as before. Change the sort in Upcoming, click In-house, then come back: the sort is kept.
4. **A deep link** from the brief or a Home "needs reply" row lands on the right window with the message selected. Test a message in each phase, including a past stay, which turns on the chip.
5. **Brief.** Hero, summary and "since the brief" appear as before. History opens.
6. **Guests.** The list loads, and a guest record shows stays, mail and tags.
7. **Customize on Home.** Open it, tick a widget and drag one, including with the keyboard (Space, arrows, Space). Escape while dragging cancels the drag and nothing else. Save, and Home re-renders in the new order once.
8. **Ask.** Ask in the docked bar, then click Ask in the sidebar: the new conversation is in the list.
9. **Sentry.** In the browser console, run `setTimeout(() => { throw new Error("sentry check") }, 5000)` and confirm it arrives.

## 5. Not done here, on purpose

- **S2, pass B** (P5–P8) is next: streaming per widget and section, optimistic Send, guest inference off the critical path, and caching Ask's context.
- **Generated `raw_slim` column.** Measured at 4.3 ms against 7.7 ms for Home's window, but it rewrites the `reservations` table. It isn't worth that at today's sizes; revisit if Home's window grows past a few thousand rows.
- **Ask's context order.** It stays in `mews_id` order. Its capped lists depend on that order, and changing what the model sees is not a speed change.
- **Owner checks** from the W9 addendum and the audit's §5 still stand: Supabase region, function region, which JWT key is Current, Vercel cold starts, and the Supabase compute size and advisor.
