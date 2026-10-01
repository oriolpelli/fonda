# P10 spike: Cache Components on the dashboard

**Branch:** `spike/cache-components` (worktree `scratchpad/wt-spike`), one commit `7552b61` ("spike(p10): cacheComponents experiment — do not merge"). It was not pushed or merged.

**Result:** `next build` passes. All 41 dashboard routes went from `ƒ` (dynamic) to `◐` (partial prerender). Nothing was stubbed or excluded.

## 1. What the build demanded

I used `--debug-prerender` so each run listed every error.

1. **13 route handlers** failed with `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents. Please remove it.` I removed the `force-dynamic` exports. Each GET handler reads `headers()`, `cookies()` or `request` first, so all stay `ƒ`.
2. **52 routes failed prerendering.** All 41 dashboard routes had one cause:
   ```
   Error: Route "/[lang]/dashboard": Uncached data was accessed outside of <Suspense>.
       at createClient (lib/supabase/server.ts:11:36)
       at <anonymous> (lib/auth.ts:106:38)
       at DashboardLayout (app/[lang]/dashboard/layout.tsx:47:35)
   ```
   `dashboard/loading.tsx` wraps the layout's children, not the layout, so it doesn't help. The other 11 routes were outside the dashboard:
   - `used new Date() before accessing … Request data`: footer, auth layout, sample-brief.
   - `searchParams` read outside `<Suspense>`: newsletter pages, and login.
   - Onboarding layout reads cookies outside `<Suspense>`.
3. **`guests/[guestId]` and `brief/history/[id]` still failed** at `<Sidebar`. The sidebar calls `usePathname()`, and that route's dynamic param has no `generateStaticParams`, so the pathname isn't known when the page is prerendered. The fix was a `<Suspense>` around the Sidebar.

No dashboard page needed a change.

**What the cookie-reading layout means for the shell.** `getSessionProfile()` and `getHotel()` both call `cookies()`. React `cache()` only works within one request, so it does nothing at build time. Everything built from those two calls must stream in after the shell:
- the hotel name
- the connection dot
- the account email and menu
- `SetupBanner`
- the docked Ask bar
- the auth redirects

The sidebar now gets these as promises and reads them with `use()`, like the badges already did.

**Redirects change behaviour.** The redirects now live in a `<SessionGate>` inside Suspense. The page is sent as HTTP 200 before the session is known, so a redirect from the layout arrives in the stream instead of as a 307.
- The proxy still sends a 307 to signed-out users, except on prefetches.
- A user with no hotel now sees the shell, then gets redirected to `/onboarding` on the client.
- Pages now render alongside the gate rather than after it. RLS still applies.

**Files touched: 24 (+301/−110).**
- **Dashboard:** `app/[lang]/dashboard/layout.tsx`, `components/dashboard/sidebar.tsx`, `next.config.ts`.
- **Route handlers:** the 13 under `app/api/**` and `app/connect/**` (one line each).
- **Elsewhere:** new `lib/current-year.ts` (`"use cache"` + `cacheLife("days")`), `components/marketing/site-footer.tsx`, `(auth)/layout.tsx`, `(auth)/login/page.tsx`, `sample-brief/page.tsx`, `newsletter/{confirm,unsubscribe}/page.tsx`, `onboarding/layout.tsx`.

## 2. Static shell per route

Every `/[lang]/dashboard/**` route now shows `◐ (Partial Prerender) prerendered as static HTML with dynamic server-streamed content`.

`.next/server/app/en/dashboard.html` (60 KB) contains the whole nav with labels, ⌘K, Settings, the language switcher and Home's skeleton. It contains no email, hotel name or count. On `[guestId]` and `history/[id]` the shell has an empty sidebar.

Other routes changed status:
- `/[lang]`, `contact`, `signup`, `sample-brief`: `●` → `◐ 1d/1w` (the cached year).
- `login`, `onboarding/*`, `newsletter/*`: `ƒ` → `◐`.
- `/sitemap.xml` (`○` → `ƒ`) and `/-/opengraph-image` (`●` → `ƒ`) regressed. Their `new Date()` and `readFile` now count as uncached and need `"use cache"`.

**Not measured:** there's no Supabase in the sandbox. The expected gain is that the sidebar and frame paint before the session read. Data is no faster.

## 3. `"use cache: private"`

Per the docs:
- `cookies()`, `headers()` and `searchParams` are allowed; `connection()` is not.
- Results live only in browser memory, never on the server, and are lost on reload.
- The function still runs on every server render and is left out of the shell.
- It needs `cacheLife` with `stale` of at least 30 s.
- No custom cache handler, and not usable in route handlers.
- It's experimental: its payoff depends on runtime prefetching (`unstable_instant = { prefetch: 'runtime' }`, a draft).

For us it could cover the Home snapshot, `loadInboxBadges` and the latest brief. That buys per-function stale times and, later, prefetching per-user content on hover.

**It saves no server work**: every Supabase read still runs. It doesn't beat today's `cache()` plus `staleTimes.dynamic = 30`. A real server-side cache would mean `"use cache"` keyed by `hotel_id`, which clashes with reading through the user's session under RLS.

**`staleTimes`:** no conflict. The build lists it with no warning, and Next 16.2.9's client router still uses `staleTimes.dynamic`. It now also decides whether a route Activity has kept alive refetches its streamed data when you return. Revalidating Server Actions still clear the client cache, so the rule in `next.config.ts` holds. A per-page `unstable_dynamicStaleTime` override exists but is undocumented.

## 4. Activity: behaviour changes

Per `layout-router.js` and `bfcache-state-manager.js`, up to **3** routes stay alive per route-tree level. The key ignores search params. State and DOM are kept (`display:none`), and effects clean up and re-run. Everything below is from reading the code; I didn't run it.

**Chat**
- *Better:* if you leave mid-answer, the hidden surface keeps streaming and shows the full answer when you return.
- *Bug:* a palette "Ask: …" sent into a kept-alive chat is silently dropped. `ChatSurface` is keyed `threadId ?? "new"`, the prefill effect exits on `asked.current || messages.length > 0`, and `?q=` doesn't change the Activity key.
- *Change:* the sidebar's "Ask" reopens the last conversation instead of a blank one.
- The docked bar is in the layout, so it's unchanged.

**Inbox**
- In-house and Upcoming can both stay alive.
- *Better:* a Send that fails after you navigate away keeps its error and your unsent text. Today both are lost.
- *Drafts:* text typed in the reply box survives a round trip, but only in the DOM. It's lost when the inbox drops out of the 3 kept routes or the page reloads.
- *Stale:* `emails` props refresh, and `useOptimistic` follows them. But `fullText` and `fetchedPanes` now outlive a visit. A draft changed on the server would show its old text, and Send sends what's on screen. No code rewrites an existing draft today, so this can't happen yet.
- The `actionError` banner and the phone's `mobileView: "detail"` also persist.

## 5. Recommendation: later

- **Size:** about 24 files to build, plus 5–8 client components to fix for Activity. Roughly 1–2 days plus QA.
- **Risk: medium.** Activity has no opt-out, there's one chat bug, the redirects change from 307, there's no e2e suite, `"use cache: private"` is experimental, and only the sidebar and frame get faster.

**Measure first** (Preview, `PERF_LOG=1`):
1. `layout.session` and `layout.hotel` times. Under ~50 ms means little gain.
2. TTFB/FCP for `/dashboard` and `/communications/in-house`, on this branch and on `perf/pass-c`.
3. Click-to-skeleton time from the sidebar.
4. Memory on a low-end phone with 3 hidden routes.
