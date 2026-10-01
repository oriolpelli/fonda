# S3 — Speed, pass C: build record

**Date:** 1 October 2026 · **Branch:** `perf/pass-c`, on top of `perf/pass-b` (S2), which sits on `main` after S1
**Scope:** everything left in the speed pack (`docs/audits/2026-10-01-performance.md`), plus what the owner checks found in production.
- **Done:** P9; §4.12; the S2 follow-ups; P10 as a spike only.
- **The production fix:** the sync writes only what changed.

**Status:** built and gated, **not merged**. **One migration: 0029** (additive, apply by hand).
**Why:** Oriol asked on 1 Oct for everything speed-related to be finished today, starting from the owner checks.

---

## 1. Ship it — in this order

1. **Apply `supabase/APPLY_0029.sql`** in the Supabase SQL editor. It's safe to run twice, and the check query is in its header (expect four rows). The code works with or without it (`lib/schema-features.ts`), so you can apply it before or after the deploy. Until it's applied, the sync still rewrites everything.
2. **Push `perf/pass-c`.** It contains S2 (`perf/pass-b`), so one preview covers both.
3. **Run the clicks:** S2 record §4, then §4 below.
4. **Merge** `perf/pass-c` to `main`. That merges S2 as well.
5. **The next morning:**
   - Supabase → Observability → Query Performance → **Reset report** on the day you merge. A day later the two sync upserts should be far down the list.
   - Vercel → Observability → Functions: `/[lang]/dashboard` p75 (it was 7 s) and `/api/sync` duration (it was ~1.5–2 min).

## 2. What the owner checks found in production (1 Oct, read-only)

Both dashboards were opened in Claude's browser with Oriol signed in. Nothing was changed.

| Check | Finding |
|---|---|
| Billing | **Unpaid invoices on Vercel ("account shut down") and Supabase ("service disruption").** Paid by Oriol the same day. |
| Supabase region | `eu-west-1` (Ireland), which matches the functions ✅ |
| Vercel region / Fluid | Requests are "Routed to Dublin (dub1)"; Fluid compute on; cold starts 4.7% ✅ |
| JWT signing key | Current key is ECC P-256 (ES256); legacy HS256 is "previous" ✅ (`getClaims` stays local) |
| Compute | **Nano, 0.5 GB, swapping ~0.7 GB.** CPU spikes are I/O wait, up to ~90%, every 15 minutes. **Upgraded to Micro by Oriol** (shown as "Free Upgrade", same price as Nano). |
| Query Performance | **The sync's two upserts used 97% of all database time:** reservations 16 h, customers 10.5 h (~14,000 runs × ~14 calls × ~0.5 s). Reads peaked at 7–8 s. |
| Home in production | `/[lang]/dashboard` **p75 7 s** (Vercel, last 12 h). One sync run took 97 s, **68 s of it in 34 upsert batches of ~2 s each**. |
| Performance Advisor | 10 × `auth_rls_initplan` on `users`, `dashboard_layouts`, `chat_threads`, `chat_logs`, **not** on `reservations` or `emails`. Fixed in 0029; the big rewrite stays parked. 0028's indexes aren't flagged as unused, so they're in use. |
| Sentry `ai_failure` alert | Not checked (no Sentry sign-in). |

**Conclusion:** most of the logged-in slowness was the database. A memory-starved instance was rewriting a month of reservations every 15 minutes while the dashboard tried to read. Micro and §3.2 address the two halves.

## 3. Commits

| Commit | What | Checked |
|---|---|---|
| `eba0875` | **P9.** The browser gets only the dictionary namespaces its area reads: public (`[lang]` layout), onboarding and dashboard each send their own, through nested providers. `useDictionary()` is typed to the client lists. `npm run check:client-dict` (in the gate) follows imports into `"use client"` code and fails on a namespace an area doesn't send. A development-only guard throws on the same mistake. | All routes × en/es/ca; browser runs; dev-mode crawl; negative test |
| `1797fa6` | **The sync writes only changed rows.** A SHA-256 of each row's content (`synced_at` excluded) is stored in `content_hash`. A run reads the stored hashes (window read, then by id for what it missed) and upserts only new or changed rows. **Migration 0029:** the content hashes, `emails.gmail_thread_id`, `guest_profiles.inference_failed_at`, and the 10 flagged policies rewritten with `(select auth.uid())`. | Fake Mews: first run 6,550 rows written, then **0**, one change → **1**. Without 0029: everything written, no failures. RLS isolation unchanged (tested). 0029 runs twice cleanly. |
| `1fb315e` | **Gmail:** the thread id is stored at ingest; a send looks it up only once, with `format=minimal` instead of the full message. **Inference:** a failure is stamped on the profile, so the 10-minute pause holds on every server, not just one. | After a server restart, a paused guest makes **no** model call |
| `6f7d342` | **The lighter messages page (the hybrid Oriol chose).** Full text travels only for the top 15 open messages by urgency and the top 15 by date; the rest are 280/240-character previews. Full text is fetched on hover, focus or open (GET `app/api/emails/[id]`, RLS). **The editor and Send wait for the full draft.** Guest panes travel only for those top messages; others render on demand (`loadContextPane`, still server-rendered). | **1,701 KB → 555 KB** (Upcoming, test hotel). A preview message's editor is ready **51–67 ms** after the click (prefetched on hover). Failed fetch → error, Send held, Try again works. |
| `1d59162` | **Every click acknowledged (§4.12).** A 2 px pending hairline on desktop sidebar rows (`useLinkStatus`; only after 100 ms; no layout shift). The ⌘K palette prefetches the highlighted result. | Slowed navigation: hairline ~0.57 opacity mid-flight, gone after. Palette Enter → URL in 39 ms. |
| `8c6ada9` | **Ask caches the conversation too.** A second breakpoint on the last message; all messages go as text blocks. `PROMPT_VERSIONS.chat` → `chat@2026-10-01c`. | Turns 1–3 read 0 / 5,449 / 5,488 cached tokens and write 5,458 / 48 / 48 |
| `640a7b6` | **Independent review fixes.** **(High)** A stale cached "no draft" could let a 240-character preview into the editor with Send enabled. Cache entries are now tied to the list version they were fetched against, or must extend the row's preview. **(Medium)** An open, edited message pushed out of the top 15 lost its edits; complete messages now seed the cache. **(Medium)** 0029 ends with `notify pgrst, 'reload schema'`. The dictionary checker now fails on reads it can't follow. The mobile hairline was removed (the drawer closes first). | Both review scenarios rebuilt in the browser and passing; full regression; gate |

Plus a doc commit: this record, the P10 report and ROADMAP.

## 4. Clicks to run on the preview (on top of S2 §4)

1. **Login and landing:** view source is much smaller. Every label is present in en, es and ca.
2. **Messages, Upcoming:**
   - Hover a message low in "Needs you", then open it: the draft is all there, never cut off at ~240 characters. Send works.
   - Open a message near the top, type, and wait for another action to finish: your text stays.
3. **Guest pane** (wide screen): open a message low in the list. The right-hand pane fills in after a beat with a placeholder in its place, and the message column doesn't jump.
4. **Sidebar:** on a slow connection (DevTools → Slow 3G), click a section you haven't visited. A thin line pulses under the row until the page arrives.
5. **⌘K:** type a section or guest, arrow to it, press Enter. The page skeleton is immediate.
6. **Ask:** three questions in one conversation. In the logs (`PERF_LOG=1`), `ask.cache_read_tokens` grows each turn.
7. **After 0029:** Settings → Connections still shows the sync. Next morning, Vercel's `/api/sync` duration has dropped and Supabase's top queries are no longer the two upserts.

## 5. P10 — Cache Components (spike, not merged)

Full report: `docs/audits/2026-10-01-P10-cache-components-spike.md` (branch `spike/cache-components`, commit `7552b61`, not pushed).

**Recommendation: later.** The build goes green with ~24 files touched; all dashboard routes become partial prerenders whose shell is the sidebar and skeleton.

The catches:
- **Only the frame gets faster.** The layout reads the session from cookies, so everything else streams after it, as today.
- **Auth redirects change.** Redirects from the layout arrive in the stream rather than as a 307.
- **Kept-alive routes have side effects.** React keeps up to three visited routes mounted, which introduces a chat bug (a palette "Ask: …" is dropped into a kept-alive chat) and changes inbox state lifetimes.
- **`"use cache: private"` saves no server work.**

**Measure first:** `layout.session` and `layout.hotel` on the merged S3. If both stay under ~50 ms, the gain is small.

## 6. Not done, on purpose

- **The pane uses a Server Action,** so it can queue behind a Send in flight. It's secondary UI, and a GET would mean sending guest data as client props (§5.3).
- **The pane column briefly shows a placeholder** for a guest with no pane at all, then disappears (rare).
- **A staff tag set in another tab during an inference run** can still be overwritten. This predates S2; the fix is a conditional-write RPC.
- **The large RLS rewrite** (`reservations`, `emails`) stays parked: the advisor doesn't flag those tables.
- **Reservation retention** stays parked. The sync no longer rewrites history, which removes its urgency.
- **Incremental PMS fetch** (ask Mews only for what changed since the last run). The writes were the cost; the fetch is ~10 s of network on a cron, invisible to users.
- **The Sentry alert check** needs a Sentry sign-in.
