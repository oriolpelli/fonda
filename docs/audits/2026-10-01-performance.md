# Performance audit — the signed-in app

**Date:** 1 October 2026 · **Code audited:** `main` at `580a9ad` plus the `chat/history` work, which has since landed on `main` as `017541d` and `e91ac90`
**Scope:** everything behind the login: proxy, dashboard layout, the five live surfaces, Ask, the client bundle and the database
**Status:** accepted 1 Oct. Oriol put speed first, and `ROADMAP.md` now runs it as **S1** (M1, P1–P4) and **S2** (P5–P8) at the head of the train (§8). This file ranks the work and holds the prompts. `ROADMAP.md` owns the timing.
**Follows:** the 1 Oct speed pass (`a8ef856` Dublin region, `ac220ef` one session check per request, `0d249ce` proxy skips prefetches, `8eca917` inbox reads in parallel), recorded in `docs/audits/2026-10-01-W9-ai-transparency.md` §8. Those four commits were correct. They removed fixed costs from every request. What is left is the cost of each page's own data, and the way the app waits for it.

---

## 0. The short version

The app feels slow for five reasons, in this order:

1. **Every click waits for 6–9 database round trips made one after another.** Home makes about 7 in a row and Brief makes 7. A deep link into Communications makes about 9, spread across two requests. Every page could finish in 3 or 4, and with streaming show its first content after 2.
2. **Those trips carry data the page never uses.** Home pulls the full MEWS JSON payload (`raw`) for every reservation in a 16-day window, and the full body and draft of the latest 200 emails, to show four numbers and three subject lines. The sidebar badge, which renders on every hard load, pulls the full body and draft of every unhandled email just to count them.
3. **Nothing streams, and nothing is reused.** Each page waits for its slowest query before it shows anything. Next 16 also keeps no client-side copy of a dynamic page for link navigation (`staleTimes.dynamic` defaults to 0). Clicking Home in the sidebar five seconds after leaving it shows the skeleton again and redoes the whole render. The browser's Back button is already cached.
4. **Actions render the page twice and wait for Gmail.** "Send" waits for a Google token refresh, a thread lookup, the send and three database writes. Then the action's `revalidatePath` re-renders the layout and the page, and the client calls `router.refresh()`, which renders both again. Nothing changes on screen until all of that is done.
5. **A quarter of the JavaScript is Sentry.** It is about 67 KB gzipped on every page, loaded before the app becomes interactive. It was measured in a production build (§2).

None of these was introduced by the AI Act work. On the send path, W9 added a provenance write after the status write. They are deliberately kept as two separate writes (`95a1e7f`). The reads are as they were.

**The five fixes that matter most** (details in §4, prompts in §6):

| # | Fix | Effect | Effort | Risk |
|---|---|---|---|---|
| 1 | Select only the fields each page reads: 5–6 keys out of `raw`, no email bodies outside the inbox | Payloads drop sharply. How much depends on row sizes; §7 has the query that measures them | ½ day | Low |
| 2 | Read the hotel row once per request, and collapse the waterfalls | Critical path drops from 6–9 sequential round trips to about 3–4 on every live page | ½ day | Low |
| 3 | `experimental.staleTimes.dynamic = 30` | Clicking back into a page seen in the last 30 s is instant | 5 min | Low (30 s of possible staleness; actions still invalidate) |
| 4 | Stream Home, Brief and Communications with `<Suspense>` per widget or section | First content appears when the *fastest* reader finishes, not the slowest | 1 day | Low |
| 5 | Optimistic Send/Dismiss, and one render per action instead of two | The inbox reacts in under 100 ms; Gmail runs behind the scenes | ½ day | Medium (error rollback must be right) |

Add two cheap ones: lazy-load Sentry (−50 KB gzipped on every page, measured) and two indexes (§4.13).

---

## 1. Method, and what could not be measured

**Done:**

- Read the whole request path: `proxy.ts` → `lib/supabase/proxy.ts` → `app/[lang]/layout.tsx` → `dashboard/layout.tsx` → every live page and its loaders in `lib/`. Every sequential `await` that touches the network was counted.
- Built the app for production (Next 16.2.9, Turbopack) from today's working tree, in a sandbox, and computed first-load JavaScript per route from the client reference manifests (§2). Built it two more times to isolate Sentry's cost. The sandbox cannot reach Google Fonts, so the copy was built with `next/font/local`. That changes no JavaScript.
- On production: the login page's HTML is 86 KB, and 58 KB of it is the translation dictionary (§4.11). The static pages are served from `cdg1`. The Supabase project publishes an **ES256** signing key, so `getClaims()` can verify sessions locally (§5, check 3).
- Read the migrations for indexes and RLS.

**Not possible from here**, so measure these before and after (§7):

- Real query timings, row sizes and the Supabase region. There is no database access from this session, by design.
- Signed-in page timings. The browser here isn't signed in to Fondas, and signing in is something only you do.

Wherever this document gives a number, it was **counted** (round trips), **measured** (JavaScript, HTML) or **cited** (Supabase's RLS benchmarks). Where the size of a win depends on data, it says so and points at §7.

---

## 2. JavaScript per route (measured, production build)

First-load JavaScript, gzipped, which is what a hard load or refresh downloads and parses:

| Route | Today | Sentry not loaded up front (measured) | Also lazy dnd-kit (expected) |
|---|---|---|---|
| `/dashboard` (Home) | **268 KB** (891 KB raw) | 218 KB | ~200 KB |
| `/dashboard/communications/*` | 256 KB | 206 KB | 206 KB |
| other dashboard pages | 250–253 KB | ~200 KB | ~200 KB |
| `/login`, `/signup` | 237 KB | 187 KB | 187 KB |
| landing `/` | 241 KB | 191 KB | 191 KB |
| framework floor (`_not-found`) | 218 KB | 165 KB | 165 KB |

- **Sentry: ~67 KB gzipped on every route.** When `instrumentation-client.ts` was stubbed out, Home dropped from 268 to 201 KB. Initialising Sentry from a dynamic import when the browser is idle measured 218 KB. The remaining ~17 KB comes from the three error boundaries (`app/global-error.tsx`, `app/[lang]/error.tsx`, `app/[lang]/dashboard/error.tsx`), which import `@sentry/nextjs` statically. They can import it lazily inside their effect.
- **dnd-kit: 18 KB gzipped, Home only.** It is needed only once someone opens Customize (`components/dashboard/home-customize-panel.tsx`).
- The dashboard layout's own client code (sidebar, ⌘K palette, the docked Ask bar) costs about 19 KB. That is reasonable, and it isn't the problem.

JavaScript is not the main reason clicks feel slow. A soft navigation downloads only the RSC payload. JavaScript matters for the first load of the day, for refreshes and on phones, and the Sentry fix is nearly free.

---

## 3. Anatomy of a click, today

"RT" means one sequential round trip to Supabase on the critical path. Parallel requests count once. The proxy's session check costs no round trip as long as the ES256 key is the one signing tokens (§5, check 3).

### Clicking "Home" in the sidebar (soft navigation)

The layout is shared, so it doesn't re-render. The page does:

```
wave 1 (parallel, page waits for the slowest)
  loadDashboardSnapshot   hotels → reservations p.1 (→ p.2 past 1,000 rows) → customers     3–4 RT   ← full `raw` JSON, 16 nights
  loadInbox               [hotels ‖ 200 emails] → [res ‖ cust] → [cust ‖ res]               3 RT     ← full body + draft ×200
  loadViewerLayout        users → dashboard_layouts                                          2 RT
  loadGmName              hotel_settings                                                      1 RT
wave 2 (starts only when ALL of wave 1 is done)
  loadTodayMovements      hotels → [arrivals ‖ departures] → [customers ‖ returning]        3 RT     ← `raw` again
  loadSyncHealth          hotels → [sync_logs ‖ cron_logs]                                   2 RT
  loadTodaysBriefing      briefings                                                           1 RT
  loadReservationThreads  emails                                                              1 RT
──────────────────────────────────────────────────────────────────────────────────────────────────
critical path ≈ 6–7 RT, then the whole page appears at once
```

Wave 2 only *needs* wave 1 for the VIP thread lookup. Movements, sync health and the briefing read use nothing from it; the briefing only checks the timezone after its query. So three of the four wait for no reason.

The `hotels` row is read **4 times** on this click and **6 times** on a hard load (the layout and the badge loader add one each).

### A hard load of any dashboard page (login, refresh, a link from the brief email)

Everything above, plus the layout running in parallel: `users → [hotels ‖ loadInboxBadges]`. The badge loader is three more sequential trips, and it selects `EMAIL_COLUMNS` (body and draft included) for up to **500** unhandled emails just to count them (`lib/inbox.ts:441–486`). The HTML shell can't flush until the layout is done, because `loading.tsx` sits inside it. Then about 250 KB of JavaScript, plus the full dictionary, hydrates.

### Opening a message from Home or the brief (`/dashboard/communications?email=…`)

1. The parent route runs **the whole `loadInbox()`**, 3 RT and 200 bodies, only to decide which window to redirect to (`communications/page.tsx:31`).
2. The redirect is a second HTTP request, with the proxy again.
3. The window runs `loadInbox()` **again**, then reads `hotels` again (sequentially, `window.tsx:77`), then `loadGuestContexts` reads `hotels` a third time and fetches every reservation of every listed guest with `raw` (`lib/guest-context.ts:119–176`). That is 6 RT.
4. Every message in the window's share of those 200 (`window.tsx:90`) is serialised with its full body and draft into the RSC payload for the client inbox. With the past chip on, that is most of them.

That adds up to about 9 sequential round trips across two requests, carrying the inbox twice.

### Pressing "Send" on a reply

`requireHotelId` → read email → read Gmail token → **Google token refresh** (every time: the access token is cached on a client object that lives for one request, `lib/gmail.ts:211`) → **Gmail getMessage** (for the thread id) → **Gmail send** → status write → provenance write → `draft_edit_events` insert. Then `revalidateInbox()` re-renders the layout (badges: 3 RT, ≤500 bodies) and the window (6 RT, 200 bodies) in the action's response. Then `email-inbox.tsx:371` calls `router.refresh()`, which **renders both again**. The button reads "Sending…" until the last of it lands. "Approve all" refreshes the token and re-renders once per batch, but runs getMessage, the send and the three writes for each email **one after another** (`actions.ts:328`).

---

## 4. Findings

Ranked by how much each one costs a GM per day, not by how hard it is to fix.

### 4.1 PMS `raw` JSON is fetched where five keys are needed ⬤ High

`raw` is the full provider payload (`0003_pms_cache.sql`: "holds the full MEWS payload so nothing is lost"). The only things read out of it are the keys in `lib/pms-fields.ts`: `Notes/notes`, `IsVip/Classifications`, `RoomType/roomType/roomtype`, `Room/room/SpaceName`, `Eta/eta/ArrivalTime/arrivalTime`. It is selected in full in:

| Where | Rows | User-facing on |
|---|---|---|
| `lib/dashboard-snapshot.ts:186`, `:229` | every reservation overlapping 16 nights, plus today's customers | Home, Brief |
| `lib/arrivals.ts:97` | today's arrivals and departures | Home, Arrivals |
| `lib/guests.ts:93` | up to **500** reservations | Guests, guest record |
| `lib/guest-context.ts:169` | *every* stay of every guest in the window | Communications |
| `lib/hotel-context.ts:163`, `:191` | every reservation in 14 days, plus all their customers | **Ask (every message)** |
| `lib/briefing.ts:216`, `:249` | the same window, for the model | brief generation: cron, and the Brief page's "generating" state |

PostgREST can select JSON paths directly (`notes:raw->>Notes`), so the fix needs no migration. Select the keys as aliased columns, rebuild a minimal `raw`-shaped object, and keep `lib/pms-fields.ts` as the single reader. `lib/supabase/paged.ts:10` records **1,677** matching reservations on the test hotel, so there this is likely the largest single cost on Home and in Ask. §7's first query measures it.

### 4.2 Email bodies and drafts are fetched where nobody reads them ⬤ High

`EMAIL_COLUMNS` (`lib/inbox.ts:37`) includes `body` and `draft_reply`. Gmail bodies are stored untruncated, quoted reply chains included (`lib/gmail.ts:154`).

- **Sidebar badges**, on every hard load, every `router.refresh()` and every inbox action: up to 500 bodies and drafts, to produce two counts and an alert flag.
- **Home**: 200 bodies and drafts. Home reads subjects, statuses, classifications and dates, and never a body. The draft text matters only as a yes/no: Inbox pulse's "drafts ready" counts pending rows that have one (`lib/inbox.ts:383`). A head `count` gives that without the text.
- **Brief** ("since the brief"): the same 200.
- **Communications**: every message in the window's share crosses into the client payload with its full body and draft, though only the selected message's are shown at a time.

Fix: a lean column set for badges, Home and Brief, which is a one-line change per caller. For Communications, send full body and draft only for messages still waiting on a human (the Needs-you queue, which is what a GM works through), and a preview for handled ones. Load the full text when a handled message is opened. That is the one part of this audit that touches the inbox component.

### 4.3 The same rows are read repeatedly, in series ⬤ High

- `hotels` is read 4–6× per render (§3). A `getHotel()` in `lib/auth.ts` style (React `cache()`, RLS-scoped) makes it one read, issued alongside `getSessionProfile()`.
- **Home**: move movements, sync health and the briefing read into the first wave (§3), so only the VIP thread lookup waits on the snapshot. Together with `getHotel()`, that takes it from ~7 RT to ~4.
- **Brief** (`brief/page.tsx:49–103`) is fully serial: hotels → settings → briefing → [snapshot ‖ inbox] → first-brief check, 7 RT. Four of those reads don't depend on each other. It can be ~4 RT.
- **Communications window** reads `hotels` after `loadInbox` resolves (`window.tsx:68–80`), then `loadGuestContexts` reads it again. It can be ~4 RT.
- **Arrivals**: hotels → (movements re-reads hotels) ‖ (chasers → reservations → customers), 4 RT. It can be 3, because the chaser join is itself a chain of 3.
- **Guests list**: profile → hotels → reservations → [customers ‖ profiles], 4 RT. It can be 3. The **guest record** reads hotels → customer → [stays ‖ profile ‖ emails] → chasers, 5 RT before inference starts, and the first two don't depend on each other.
- **Communications parent**: a full inbox load to choose a redirect (§3). With `?email=` it needs that one row and its guest's dates. That is 1–3 RT, because an unlinked sender is matched by address, as `withGuestContext` does. Without an id it needs the badge question, so it reuses the lean badge loader. The deliberate design (a link resolves its window at click time, `lib/i18n/navigation.ts:56–79`) is kept. Only the cost changes.
- **Settings → Connections** runs `count: "exact"` over `reservations` and `customers` (`connections/page.tsx:54–55`). That is a full count of tables that are never pruned. `"planned"` is enough for a status line.

### 4.4 Nothing streams ⬤ High

Every page awaits all of its loaders before returning JSX, so the `loading.tsx` skeleton holds until the slowest one finishes. Home is described as "ten independent readings" (`page.tsx:338`), and they are already isolated by `soft()`. They are an exact fit for one `<Suspense>` per widget, with the loaders wrapped in React `cache()` so the shared ones (snapshot, inbox) still run once. "Needs you" and the numbers arrive first. Sync health, outlook and VIP threads follow. The same applies to Brief (hero and summary first, "since the brief" streams) and Communications (the list first, guest-context panes stream into their slots).

**The layout too.** On a hard load, the sidebar badges chain (users → hotels and emails → two more lookups, `layout.tsx:27–51`) holds the whole HTML shell, because the page's `loading.tsx` sits inside the layout. After Pass A this becomes the floor for every hard load. React 19 lets the layout start `loadInboxBadges()` without awaiting it and hand the *promise* to the client sidebar, which reads it with `use()` inside a small `<Suspense>` around the two counts. The shell flushes at once, and the badges fill in a moment later.

### 4.5 The client cache is off ⬤ High (5-minute fix)

Next 15 changed the default `staleTimes.dynamic` from 30 s to **0** (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md`). Every dashboard page is dynamic, so every revisit by link (Home → Arrivals → Home in the sidebar) is a full server render behind a skeleton. The browser's Back and Forward are already served from cache, which is why this is easy to miss. With `dynamic: 30`, a sidebar click back into a page seen within 30 s is instant. Server actions that call `revalidatePath`, and every `router.refresh()`, still invalidate the cache, so a GM never sees a stale list after doing something. The only staleness is a background sync landing inside that 30 s window. Syncs run every 15 minutes and say what time they ran.

### 4.6 Every action renders twice, and nothing is optimistic ◐ Medium-high

Next's docs: a Server Function calling `revalidatePath` "updates the UI immediately (if viewing the affected path)", in the same response (`revalidatePath.md`). Two components then also call `router.refresh()`:

- `components/dashboard/email-inbox.tsx:371`, after every send, dismiss, flag and bulk send. `revalidateInbox()` already covers both windows and the layout.
- `components/dashboard/home-customize-panel.tsx:174`. The `updateHomeLayout` action already revalidates `/[lang]/dashboard` (`dashboard/actions.ts:112`).

Drop those two. **Keep** the `router.refresh()` calls whose action revalidates a literal path such as `"/dashboard/arrivals"`: a literal path without the locale matches nothing (`dashboard/actions.ts:111` says so), so for those the refresh is the only update. A follow-up can switch those actions to route patterns and then drop their refreshes too.

Then make Send, Dismiss and Flag optimistic with `useOptimistic`: the row moves out of the queue and the next message opens immediately, the action runs behind, and an error puts the row back with the existing `actionError` text.

The send path itself:

- Cache the Gmail access token per hotel at module level (≈55 min).
- Store the Gmail `threadId` at ingest so send skips `getMessage`.
- Move the `draft_edit_events` insert and analytics into `after()`.
- Run bulk sends with a concurrency of 3 instead of serially.

The two-write status → provenance order from `95a1e7f` is kept as it is.

### 4.7 The guest page blocks on a model call ◐ Medium-high

`guests/[guestId]/page.tsx:78` awaits `inferGuestProfile()` (Haiku) **inside the page render** on first view, again daily, and again whenever new mail arrives. That is 1–3 s of skeleton. When the model call fails (as it did all week with the credit issue), `inferredAt` isn't stamped, so **every** view retries and waits again. Move inference into a `<Suspense>`-wrapped server component, so the page renders with what's stored and the inferred facts stream in. Stamp a failure time so a failing API is retried at most every 10 minutes.

### 4.8 Ask rebuilds and re-reads the whole hotel on every message ◐ Medium

Before the first token: session → hotels → reservations (paged, with `raw`) → customers (in 200-id chunks, **sequential**, `fetchInChunks`) → emails (`hotel-context.ts:279`) → settings → thread check or insert. Then the whole hotel JSON goes in the system prompt as a plain string (`app/api/chat/route.ts:145`) **with no `cache_control`**, so every follow-up re-processes the full context. Three fixes:

- Put the hotel data in a system block marked `cache_control: { type: "ephemeral" }`. Follow-ups within 5 minutes read it from cache, which is faster to first token and cheaper. Keep the volatile part (the live pending and urgent email counts) *after* the cached block. Otherwise every 5-minute email poll that changes a count invalidates the cache.
- Reuse §4.1's lean select.
- Run the emails read, the settings read and the thread check alongside the reservation chain, since all three need only the hotel id. Run the customer chunks in parallel.

The chat-history work that touched this route has landed (`e91ac90`), so P8 builds on it.

### 4.9 Sentry loads before the app is interactive ◐ Medium (measured)

See §2. Initialise from a dynamic import on `requestIdleCallback`, and have the three error boundaries `import("@sentry/nextjs")` inside their effect. Server errors are unaffected, because `onRequestError` captures them on the server. The only gap is a browser-side error thrown before the idle callback fires, roughly the first second.

### 4.10 dnd-kit ships on Home for a panel most visits never open ○ Low

Load the panel body with `next/dynamic` and keep the "Customize" button static. Saves 18 KB gzipped on Home.

### 4.11 The whole dictionary ships on every page ○ Low-medium (measured)

`app/[lang]/layout.tsx:79` hands all of `en.json` (63 KB; `es` and `ca` are 68 KB) to a client provider. That means it is serialised into every page's HTML, the landing page and login included. Measured on production: 58 KB of the 86 KB login page. Client components use a handful of namespaces (`common`, `chat`, `bulkSend`, `emails`, `palette`…). Pass only those and keep the rest server-side. This mostly helps first loads and phones.

### 4.12 Clicks give no immediate feedback ○ Low (it is the "sharpness" item)

Prefetched skeletons cover most clicks. Where a prefetch hasn't landed (fast clicks, the ⌘K palette, links outside the viewport), nothing changes until the server answers. Next 16's `useLinkStatus` gives each sidebar row a pending state for free. A 2 px progress hairline on the active row is enough, with no spinner. Check the treatment against `FONDA_SANA_REDESIGN.md` before shipping.

### 4.13 Two indexes are missing, and a comment claims one exists ◐ Medium (grows with time)

- `reservations (hotel_id, end_utc)`. `lib/arrivals.ts:164` says the departures query "hits its own index"; it doesn't, and only `(hotel_id, start_utc)` exists. The overlap queries in Home, Brief and Ask filter `start_utc < windowEnd AND end_utc > windowStart`. With only the start index, Postgres walks **every reservation the hotel has ever had** (the start bound excludes nothing in the past). Sync keeps upserting ±14 days and never prunes (`app/api/sync/route.ts:17`), so this gets slower every week. The end index bounds the scan to stays that haven't finished.
- `emails (hotel_id, created_at desc)`. `loadInbox` orders the whole mailbox by `created_at` to take 200, and only `(hotel_id, status)` and `(hotel_id, reservation_mews_id)` exist. Add an explicit `.eq("hotel_id", …)` too, which Supabase's own guidance recommends alongside RLS.
- Optional: `emails (hotel_id, customer_mews_id)` for the guest record timeline.

The migration only adds indexes (`create index concurrently if not exists`), so it is safe to run live.

### 4.14 RLS calls `current_hotel_id()` per row ○ Low today, logged

Already a triggered item in `ROADMAP.md` §3.6. Supabase's benchmarks show wrapping the call as `(select …)` turning 179 ms into 9 ms on large tables. Whether it bites here depends on the plan. After §4.13 and the explicit `hotel_id` filters, the planner usually has an index condition anyway. Leave the trigger as written, but run Supabase's **Performance Advisor** once. If it lists `auth_rls_initplan` against `reservations` or `emails` with real counts, that is the trigger firing.

### 4.15 Not problems, checked and fine

- **Proxy.** The prefetch skip and `getClaims()` are right. Email selection in the inbox is client-side, so it is instant. The ⌘K palette's guest search is debounced. `loading.tsx` exists for every live section. Fonts are one variable file per family (52 KB in total). PostHog `track()` is fire-and-forget. Ask streams.
- **W9's additions.** The provenance trigger, the AI headers and the labels have no measurable read cost.

---

## 5. Owner checks (a minute each)

The first four carry over from the W9 addendum. Tick them here when done.

**Done 1 Oct, read-only, in the dashboards** (details: `2026-10-01-S3-speed-pass-c.md` §2).
1. ✅ Ireland.
2. ✅ Dublin.
3. ✅ ES256 is Current.
4. Not checked (needs Sentry sign-in).
5. ✅ Cold starts 4.7%, Fluid on. But `/[lang]/dashboard` p75 was 7 s, because of the database, not the host.
6. ✗ The instance was **Nano and swapping**, with the PMS sync's upserts at 97% of database time. Oriol upgraded it to Micro the same day; S3 makes the sync write only changed rows.

1. **Supabase region.** Project Settings → General. It must be **West EU (Ireland)** to match `dub1`. If it's Frankfurt, every RT in §3 costs ~20 ms more. Change `vercel.json` to `fra1` rather than moving the database.
2. **Vercel function region.** Settings → Functions shows Dublin after the W9 merge deploys.
3. **JWT signing key.** Production publishes an ES256 key (checked today at `/auth/v1/.well-known/jwks.json`). In Project Settings → JWT Keys, confirm the ES256 key is **Current** and not just Standby. If the legacy secret still signs tokens, `getClaims()` falls back to a network call on every request and in the proxy.
4. **Sentry alert** on `ai_failure:billing OR ai_failure:auth` (W9 addendum).
5. **Cold starts.** Vercel → Observability → Functions → `/[lang]/dashboard*`: compare p50 and p95 duration and the cold-start share. With one pilot's traffic, the first click after a quiet half hour is often a cold function. Fluid compute should be on (Settings → Functions). If cold starts dominate p95, that is a hosting setting, not code.
6. **Supabase compute size and slow queries.** Reports → Query Performance, sorted by total time. If the instance is Nano or Micro, the JSON serialisation in §4.1 is CPU-bound there.

---

## 6. The prompts

The house style follows `APP_UX_PROMPTS.md` and `AI_ACT_PROMPTS.md`: **one prompt per fresh Claude Code session, review the diff, commit with the suggested message.** All of these are on a `perf/…` branch, previewed before merge. Run **M1 first**, so every later prompt has a before and an after.

Order inside the pack: M1 → P1 → P2 → P3 → P4 (Pass A, no visible change) → P5 → P6 → P7 → P8 (Pass B, feels instant) → P9 → P10 (spike only).

### Prompt M1 — Measure the loaders (no behaviour change)

```
Read CLAUDE.md, lib/auth.ts and docs/audits/2026-10-01-performance.md §3 and §7.

Add lib/timing.ts (server-only): `timed<T>(label: string, p: Promise<T>): Promise<T>`
that, when process.env.PERF_LOG === "1", logs one line `[perf] <label> <ms>ms`
to the server console, and otherwise returns p untouched. Labels are static
strings like "home.snapshot" — never an id, a name, an address or a hotel id
(CLAUDE.md: no PII in logs).

Wrap, without changing anything else: every loader awaited in
app/[lang]/dashboard/page.tsx, brief/page.tsx, arrivals/page.tsx,
communications/window.tsx, communications/page.tsx, guests/page.tsx,
guests/[guestId]/page.tsx (including inferGuestProfile), the dashboard layout's
hotel + loadInboxBadges, and in app/api/chat/route.ts the span from request to
the first streamed token ("ask.ttft").

Do not add a dependency. Run `npm run lint`. Show me the diff.
```

**Look for:** Zero output with `PERF_LOG` unset. With it set on a preview (Vercel → Environment Variables → Preview only), one line per loader in the function logs.
**Commit:** `chore(perf): opt-in loader timings (PERF_LOG=1), no PII`

### Prompt P1 — Lean reads: no `raw`, no bodies where nobody reads them

```
Read CLAUDE.md, docs/audits/2026-10-01-performance.md §4.1–4.2, lib/pms-fields.ts,
lib/dashboard-snapshot.ts, lib/arrivals.ts, lib/guests.ts, lib/guest-context.ts,
lib/hotel-context.ts, lib/briefing.ts (its own readNotes/readVip copies),
lib/inbox.ts and app/[lang]/dashboard/page.tsx and brief/page.tsx.

1. lib/pms-fields.ts: export RESERVATION_RAW_SELECT and CUSTOMER_RAW_SELECT —
   PostgREST JSON-path selections, aliased, for exactly the keys the readers in
   this file use (reservation: Notes, notes, RoomType, roomType, roomtype, Room,
   room, SpaceName, Eta, eta, ArrivalTime, arrivalTime; customer: IsVip,
   Classifications). Use `->` (not `->>`) where the reader needs a non-string
   (IsVip boolean, Classifications array). Export `slimRaw(row)` that rebuilds a
   `raw`-shaped object from those aliases so readNotes/readVip/readRoomType/
   readRoom/readEta work unchanged — they stay the single source of truth.
2. Replace `raw` in every select listed in the audit's §4.1 table with those
   selections + slimRaw. Make lib/briefing.ts use the shared readers instead of
   its private copies (same behaviour — diff them first and tell me if they
   differ).
3. lib/inbox.ts: add INBOX_SUMMARY_COLUMNS (EMAIL_COLUMNS minus body and
   draft_reply). Use it in loadInboxBadges, and add `loadInboxSummary()` (same
   shape as loadInbox, body/draft_reply null) for Home and the brief page's
   "since the brief". CAREFUL: Home's Inbox pulse shows `draftsReady`, which
   loadInbox derives from draft_reply being non-empty (lib/inbox.ts:383) —
   compute it in loadInboxSummary with a parallel head count (status pending,
   draft_reply not null) so the number is unchanged. Check every other field
   Home and Brief read off the email objects the same way before nulling it.
   Communications keeps loadInbox — P5 handles it.
4. Add an explicit `.eq("hotel_id", hotel.id)` to the emails query in loadInbox
   (it relies on RLS alone today).

No UI change. Prove equivalence: for the test hotel, log (behind PERF_LOG) the
snapshot numbers, VIP list, ETAs and room labels before and after and show me
they match. Run `npm run lint` and `npx tsc --noEmit`.
```

**Look for:**

- `grep -rn '\braw\b' lib | grep select` returns nothing.
- Home, Arrivals, Guests and the inbox show identical data on the preview in en/es/ca.
- M1's timings for `home.snapshot` and `ask.ttft` dropped.

**Commit:** `perf(data): read five keys of the PMS payload, not all of it; no email bodies outside the inbox`

### Prompt P2 — One hotel read per request; collapse the waterfalls

```
Read CLAUDE.md, lib/auth.ts, the audit's §3 and §4.3, and every file it cites.

1. lib/auth.ts: add `getHotel = cache(async () => …)` — the RLS-scoped hotels
   row with the union of columns the app reads (id, name, timezone, rooms_count,
   pms_connected, pms_type, last_synced_at, gmail_email). Same pattern and
   comment style as getSessionProfile. Replace every per-loader `from("hotels")`
   read in the dashboard (layout, inbox currentHotel, dashboard-snapshot,
   arrivals, sync-health, guest-context, guests, brief, communications window,
   settings pages where it's the same row). Admin-client reads in cron/route
   code stay as they are.
2. Home (app/[lang]/dashboard/page.tsx): move loadTodayMovements,
   loadSyncHealth and loadTodaysBriefing into the first Promise.all (the
   briefing needs the timezone only for its after-query date check — take it
   from getHotel()). Only loadReservationThreads stays after the snapshot.
3. brief/page.tsx: hotel, settings, latest briefing and the first-brief check
   in one Promise.all; the date check runs after. Then the two "since" loaders.
4. communications/window.tsx: start loadGuestContexts as soon as the emails are
   known, not after a second hotels read.
5. communications/page.tsx: stop calling loadInbox(). For `?email=` read that
   one row and resolve its phase through withGuestContext on that single row
   (it handles the unlinked-sender address match); for no id, reuse the lean
   loadInboxBadges. Keep every behaviour in the file's header comment and
   lib/i18n/navigation.ts:56–79 — only the cost changes.
6. arrivals, guests list and guest record (lib/guests.ts loadGuestRecord):
   run independent reads in parallel.
7. settings/connections/page.tsx: count "planned" instead of "exact" for the
   reservations/customers totals; say in a comment it's an estimate.

No UI change. Run lint and tsc. With PERF_LOG on the preview, show me before /
after for Home, Brief, a Communications deep link, Arrivals and Guests.
```

**Look for:**

- `grep -rn 'from("hotels")' app/\[lang\]/dashboard lib` shows only `getHotel` and admin or cron code.
- A deep link from a brief opens the right window with the message selected, in Upcoming, In-house and the past chip.

**Commit:** `perf(dashboard): one hotel read per request; Brief, Communications and Arrivals load in parallel`

### Prompt P3 — Indexes (migration, additive only)

```
Read CLAUDE.md (never run destructive DB commands without confirmation),
supabase/migrations/0003_pms_cache.sql, 0001_init.sql, 0015, and the audit's
§4.13–4.14.

Write supabase/migrations/00NN_perf_indexes.sql (next free number) and a
re-runnable supabase/APPLY_00NN.sql in the style of APPLY_0025.sql:
  create index concurrently if not exists reservations_hotel_end_idx
    on public.reservations (hotel_id, end_utc);
  create index concurrently if not exists emails_hotel_created_idx
    on public.emails (hotel_id, created_at desc);
  create index concurrently if not exists emails_hotel_customer_idx
    on public.emails (hotel_id, customer_mews_id);
Header comment: which queries each one serves (file:line), that the migration
only adds indexes, and that CONCURRENTLY means it cannot run inside a
transaction (so the APPLY script is statements, not a DO block).
Fix the comment in lib/arrivals.ts that claims the departures query already
has its own index. Add the new indexes to scripts/verify-migrations.ts.
Do not apply anything. Tell me what to paste and where.
```

**Look for:** Oriol applies it in the SQL editor, and `npm run verify-migrations` passes. Supabase's Performance Advisor no longer flags sequential scans on `reservations`.
**Commit:** `perf(db): indexes for the overlap and inbox queries (migration 00NN)`

### Prompt P4 — Client: cache revisits, lazy Sentry and dnd-kit, one render per action

```
Read CLAUDE.md, AGENTS.md, node_modules/next/dist/docs/01-app/03-api-reference/
05-config/01-next-config-js/staleTimes.md, .../04-functions/revalidatePath.md,
instrumentation-client.ts, the three error.tsx files, home-customize-panel.tsx,
email-inbox.tsx, and the audit's §2, §4.5, §4.6, §4.9, §4.10.

1. next.config.ts: experimental.staleTimes = { dynamic: 30 }. Comment why
   (Next 15 made it 0; actions and router.refresh still invalidate).
2. instrumentation-client.ts: init Sentry from a dynamic import on
   requestIdleCallback (setTimeout fallback), same options. The three error
   boundaries import("@sentry/nextjs") inside their effect. Server config and
   onRequestError unchanged.
3. Home: render HomeCustomizePanel's panel body via next/dynamic (ssr: false
   is fine — it only exists once opened); the trigger button stays static.
4. Remove router.refresh() in email-inbox.tsx's `run` and in
   home-customize-panel.tsx's save — their actions already revalidate the
   route pattern. Leave every refresh whose action revalidates a literal
   locale-less path, and list those for me.

Then `npm run build` and report first-load JS for /[lang]/dashboard,
communications/upcoming and /login before and after (from the client
reference manifests if the build output doesn't print sizes).
```

**Look for:**

- Home is about 200 KB gzipped, down from 268.
- Sentry still receives a test error thrown five seconds after load (e.g. from the browser console).
- Sidebar clicks Home → Arrivals → Home within 30 s: the second Home is instant, with no skeleton.
- After Send, the list updates exactly once (one RSC request in the network tab, not two).

**Commit:** `perf(client): keep visited pages 30s, load Sentry when idle, lazy Customize, one render per action`

### Prompt P5 — Stream Home, Brief and Communications

```
Read CLAUDE.md, FONDA_SANA_REDESIGN.md (skeleton styling — wells, radius, no
shadows), node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
loading.md, app/[lang]/dashboard/page.tsx, brief/page.tsx,
communications/window.tsx, components/dashboard/email-inbox.tsx, the existing
loading.tsx files, and the audit's §4.2 and §4.4. P1 and P2 must be merged.

1. Home: each widget becomes an async server component that awaits its own
   loader, wrapped in <Suspense> with a skeleton of the widget's registry width.
   Wrap the shared loaders (snapshot, inbox summary, movements) in React cache()
   so two widgets never run one loader twice. Keep soft() semantics and the
   exhaustive switch. The greeting + Customize render immediately.
2. Brief: hero + summary first; "since the brief" in its own Suspense.
3. Dashboard layout: don't await loadInboxBadges(). Pass the promise to
   <Sidebar> and read it with React's use() inside a small <Suspense> around
   the two Communications badges only (fallback: no badge, not a skeleton
   row). The hotel row and session stay awaited — the sidebar needs the name.
4. Communications: the list renders first; the guest-context panes stream into
   their slots. Payload: send full body + draft_reply only for UNHANDLED
   messages; for handled ones send a 280-char preview and load the full text on
   open through a server action that re-checks the session (RLS client, never
   admin). Selection stays client-side and instant for unhandled mail.

Visual parity with today's loaded state is required — screenshot each page at
1280 and 375 in en/es/ca, loaded and mid-stream. Run lint and tsc.
```

**Look for:**

- On Home the greeting and "Needs you" paint before Sync health and Outlook.
- The Communications RSC payload in the network tab is a fraction of its old size.
- Opening a handled message shows its full text within a beat.

**Commit:** `perf(ui): stream Home, Brief and Communications; inbox sends full text only for open work`

### Prompt P6 — Send feels instant

```
Read CLAUDE.md, AI_ACT_PROMPTS.md §R (provenance rules), the audit's §3 "Pressing
Send" and §4.6, app/[lang]/dashboard/communications/actions.ts, lib/gmail.ts,
lib/email-processor.ts, components/dashboard/email-inbox.tsx,
components/dashboard/bulk-send-dialog.tsx.

1. email-inbox.tsx: useOptimistic for send / dismiss / flag — the row leaves the
   current queue and the next message is selected immediately; on error the row
   comes back and actionError shows (existing copy). Bulk send: rows show as
   sending, then settle from the action's result (sent / skipped) — the
   "never say N and send fewer" guarantee from dffb2cd must hold.
2. lib/gmail.ts: module-level access-token cache keyed by hotel id with the
   token's own expiry minus 60s. Never log or return the token.
3. Store Gmail's threadId at ingest (new nullable column emails.gmail_thread_id,
   additive migration + APPLY script + types); sendOne uses it and falls back
   to getMessage only when null.
4. after() for the draft_edit_events insert and analytics. Keep the status →
   provenance write order from 95a1e7f exactly as it is, synchronous.
5. approveAllStandard: concurrency 3, same per-email semantics and counting.

Test with the mocked-Gmail harness from W9 (npm run verify-ai-mark) that
headers, provenance and double-send protection are unchanged. Lint, tsc.
```

**Look for:**

- Send moves to the next message in under 100 ms on the preview.
- A forced failure (Gmail disconnected) puts the row back with the error text.
- `verify-ai-mark` passes.

**Commit:** `perf(inbox): optimistic send/dismiss; cached Gmail token; stored thread id; bulk at concurrency 3`

### Prompt P7 — Guest inference off the critical path

```
Read CLAUDE.md, AI_ACT_PROMPTS.md §R, app/[lang]/dashboard/guests/[guestId]/page.tsx,
lib/guest-inference.ts, components/dashboard/guest-tags.tsx, and the audit's §4.7.

Render the guest record from stored data immediately. Move shouldInfer +
inferGuestProfile into an async server component inside <Suspense>, whose
fallback is the existing tags in a quiet "updating" state (Sana spec, no
spinner). On failure, stamp a failure time in guest_profiles (additive column
or reuse an existing field — propose, don't invent) so the next attempt is
≥10 minutes later. Inferred items keep their AI marking (A3). Lint, tsc.
```

**Look for:** A guest page opens with the AI unavailable (a bad key on a preview) as fast as one without inference, and makes one attempt per 10 minutes, not one per view.
**Commit:** `perf(guests): page renders first, inference streams in; back off when the AI is down`

### Prompt P8 — Ask: cache the context

```
Read CLAUDE.md, AI_ACT_PROMPTS.md §R, app/api/chat/route.ts, lib/hotel-context.ts,
lib/supabase/paged.ts, the Anthropic prompt-caching docs, and the audit's §4.8.

1. Put the HOTEL DATA JSON in its own system block with
   cache_control: { type: "ephemeral" } (instructions block first, data block
   second, so the cacheable prefix is stable). Move the volatile part — the
   live email counts (context.emails) — into a third, uncached block after the
   breakpoint, or the 5-minute email poll invalidates the cache. Keep effort
   "low" and the model from AI_MODELS.
2. hotel-context: P1's lean select; fetchInChunks runs its chunks in parallel
   (cap 4); the emails read (hotel-context.ts:279) runs alongside the
   reservation chain; in route.ts the hotel_settings read and the thread
   check run alongside buildHotelContext — all three need only hotelId.
3. Log usage.cache_read_input_tokens behind PERF_LOG (a number only).
Lint, tsc. Ask two questions in a row on the preview and show me ask.ttft and
the cache-read count for both.
```

**Look for:** The second question in a conversation reports cache reads and a lower time to first token. Provenance is still written for every answer.
**Commit:** `perf(ask): cache the hotel context across turns; leaner, parallel context build`

### Prompt P9 — Ship only the dictionary the client uses

```
Read CLAUDE.md, app/[lang]/layout.tsx, app/[lang]/dictionaries.ts,
components/i18n/dictionary-provider.tsx and every useDictionary() call.

List the top-level namespaces client components actually read. Make the
provider take Pick<Dictionary, those keys> (typed, so a new client usage of a
missing namespace fails tsc). Server components keep the full dictionary via
loadDictionary. Measure /en/login and /en HTML size before/after. Lint, tsc.
```

**Look for:** The login page drops from 86 KB of HTML to roughly 35–40 KB. No missing strings in en/es/ca.
**Commit:** `perf(i18n): send client components only the namespaces they use`

### Prompt P10 — Spike: Cache Components *(explore, don't ship)*

```
Read node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/
cacheComponents.md, 02-guides/migrating-to-cache-components.md and
01-directives/use-cache-private.md. On a throwaway branch, turn on
cacheComponents and get `npm run build` green for the dashboard only. Report:
which pages needed Suspense boundaries, whether the sidebar/layout becomes a
prerendered shell, what `"use cache: private"` would let us cache per user, and
any behaviour change from <Activity> keeping routes mounted (the chat surface
and email inbox hold state). A written report, no merge.
```

This is Next 16's native answer to "instant navigation" (a prerendered shell plus streamed data). It is the right long-term move, but it is a rewrite of how every page declares its data. Do it after Passes A and B, once M1 shows where the remaining time goes.

---

## 7. Measure before and after

**In Supabase's SQL editor** (read-only, takes seconds):

```sql
-- What Home and Ask drag across the wire today (text size, as PostgREST sends it)
select hotel_id,
       count(*)                                              as rows_in_home_window,
       pg_size_pretty(sum(octet_length(raw::text))::bigint)  as raw_text_total,
       pg_size_pretty(avg(octet_length(raw::text))::bigint)  as raw_text_avg
from public.reservations
where start_utc < now() + interval '15 days'
  and end_utc   > now() - interval '1 day'
group by hotel_id;

-- How much reservation history each hotel has accumulated (§4.13)
select hotel_id, count(*) as all_rows, min(start_utc) as oldest
from public.reservations group by hotel_id;

-- Email payloads (§4.2)
select count(*)                                                        as emails,
       count(*) filter (where status in ('pending','needs_attention')) as unhandled,
       pg_size_pretty(avg(octet_length(coalesce(body,'')))::bigint)        as body_avg,
       pg_size_pretty(max(octet_length(coalesce(body,'')))::bigint)        as body_max,
       pg_size_pretty(avg(octet_length(coalesce(draft_reply,'')))::bigint) as draft_avg
from public.emails;
```

Then Reports → Query Performance (top by total time) and Advisors → Performance.

**On a preview with `PERF_LOG=1`** (after M1): note `home.*`, `brief.*`, `comms.*` and `ask.ttft` from three cold and three warm loads, before Pass A and after each prompt.

**In the browser:** DevTools → Network, filter `?_rsc`. Note the size and time of the RSC response for Home and an inbox window, and Lighthouse (desktop) on `/en/dashboard` for the JavaScript figures.

**Targets for the end of Pass B**, on the test hotel, warm function:

| | Today | Target |
|---|---|---|
| Home, sidebar click → first widget painted | full page after ~7 sequential RT | ~4 RT for the whole page after Pass A; ~2–3 to the first widget after P5 |
| Hard load → sidebar and page shell visible | after the 4-RT badge chain | after session and hotel (≤ 2 RT) |
| Revisit within 30 s | full render | instant |
| Send → next message on screen | Gmail + 3 writes + 2 renders | < 100 ms (optimistic) |
| Deep link to a message | 2 requests, inbox loaded twice | 2 requests, 1 inbox load |
| Guest page with AI down | waits for the failed call, every view | renders at once |
| First-load JS, Home | 268 KB gz | ~200 KB gz |

---

## 8. Where it sits in the roadmap (decided 1 Oct)

Oriol's call: speed and responsiveness come before anything else that is built. `ROADMAP.md` records it in §1 Step 3 and §2:

- **S1, Speed pass A** (M1, P1–P4) is being built now, during the pilot sprint, on `perf/pass-a`. It is invisible to users, and its one migration only adds indexes.
- **S2, Speed pass B** (P5–P8) comes next, before B17 (the rate cache) and W10. W10's 1 Dec date still binds.
- **Parked in `ROADMAP.md` §3.6, with triggers:** P9 (dictionary split), P10 (Cache Components spike), the RLS rewrite (§4.14) and reservation retention.
- **Kept for good:** the rules in §4 became `ROADMAP.md` §5 #11, so every future surface is built to them.
