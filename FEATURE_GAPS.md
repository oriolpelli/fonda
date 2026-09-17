# Fondas — Feature & Product Gaps, by Gate

_The single checklist of what still has to be built or fixed, in the three gates the GTM strategy defined: **before pilots · before charging · before scaling.** Owner: Oriol · Created 27 August 2026 · Source of truth for gaps only — strategy stays in `GTM_STRATEGY.md` §3.3, build tasks in `EXECUTION_PLAYBOOK.md`._

> **How to read this.** This audits `GTM_STRATEGY.md` §3.3 against the real state of the codebase (`WHATS_LEFT.md`, `EXECUTION_PLAYBOOK.md`). Each gap carries a **current status** so you know whether it's genuinely un-built, built-but-unverified, or merely un-propagated. Two things changed since the strategy was written: some P0 "gaps" are actually **code-complete and waiting only on your own hands-on verification**, and the audit surfaced a short list of gaps §3.3 never tracked. Those are marked **⊕ audit-surfaced** in each gate.
>
> Priority legend: **P0 = before pilots · P1 = before charging · P2 = before scaling/raise.** Effort: XS/S/M/L. Status: 🔴 not built · 🟠 built, unverified/un-propagated · 🟢 done.

---

## Using the Claude Code prompts

Every gap that requires code carries a **ready-to-paste Claude Code prompt** under its how-to. Gaps that are founder/ops or legal work carry a note instead (a DNS change, a Vercel setting, a phone test, a lawyer call — no agent can do those).

**Paste this kickoff first, once per session, before any task prompt below** — it carries the standing rules so each task prompt can stay lean:

```
Read CLAUDE.md and FONDA_SANA_REDESIGN.md in the repo root before starting.
Standing rules for this session: follow both strictly (v3 "Fonda × Sana" wins
for all UI); every new table/column inherits the per-hotel RLS pattern; all
provisioning stays server-side (no client INSERTs); all new UI strings go into
all three dictionaries (en/es/ca) at equal quality; never touch .env* or commit
secrets; run `npm run lint` before declaring anything done. Confirm the tree is
clean with `git status`, tell me in one line what this task will change, then
wait for the task prompt.
```

---

## Gate 1 — Before pilots (P0)

_Free pilots need only reliability and a clean, real demo. Nothing here should be skipped before the first GM sees the product live. Finish **all of Gate 1 before any outreach demo.**_

| # | Gap | Why it matters | Effort | Status |
|---|---|---|---|---|
| 1 | Mobile pass | The GM reads the brief on a phone at 6:45am — that moment *is* the pitch. | S | 🟢 verified on a real phone (27 Aug) |
| 2 | PMS connect inside onboarding | A new hotel must reach a real preview brief in one sitting, or they drop before value. | S | 🟢 verified with a fresh signup (27 Aug) |
| 3 | Website punch-list | 9 dead footer links + unset per-env `SITE_URL`. Provisional content on a live site kills credibility. | S | 🟢 code done & deployed 28 Aug; only the optional Vercel Preview `SITE_URL` env var left |
| 4 | `hello@fondas.app` can't receive mail | It's the contact on the site; a bounce to a prospect is an own-goal. | XS | 🟢 verified 28 Aug — forwards to fondasai1@gmail.com, test email landed |
| 5 | Apaleo end-to-end unverified | 468-line client exists; no real Apaleo hotel proven through sync → brief. Don't demo blind. | S | 🟢 proven 28 Aug — OAuth + sync + reservations visible in Fondas |
| 6 | Draft-acceptance measurement | THE PMF metric — live and verified (events flowing, PII-clean: person = hotel UUID). | M | 🟢 live & verified 28 Aug |
| 7 | Data-honesty language | Say "stored encrypted, EU-hosted, deleted on offboarding" everywhere. | XS | 🟢 done, deployed & verified 28 Aug (EU region confirmed: Ireland) |
| ⊕ 8 | Reliability log backfill + 5 green mornings | Four real logged mornings is the "you can depend on it" story — the single most important non-feature you sell (VC audit #5). | XS | 🔴 5 blank rows |
| ⊕ 9 | Spanish-brief deliverability check | An English brief in spam, or in Spanish only for you, kills a Spanish pilot. Verify end-to-end. | XS | 🟢 verified (27 Aug) |
| ⊕ 10 | Brief email still on the v2 palette | The one thing a GM sees *every morning*, and it's in your demo. Cosmetic but visible. | S | 🟠 partial — see note |
| ⊕ N1 | Language control — save bug + account-wide setting + onboarding capture | Spanish-first is the whole pitch; a stuck language toggle looks broken in a demo, and there's no discoverable place to set the account's language. | S | 🟢 done, deployed & verified 28 Aug |
| ⊕ N2 | Close the ETA-from-reply loop (finish B11) | Check-in chasing sends the nudge but nothing parses the reply, so guest-stated ETAs never populate. Droppable for pilots (PMS can supply ETAs). | S | 🔴 open — decide priority |
| ⊕ N3 | "Email me this brief now" button | The dashboard Refresh only updates the on-screen brief; there's no way to re-send the email on demand — useful for demos, onboarding, and your daily checks. | S | 🔴 open — optional |
| ⊕ N4 | Can't disconnect / switch a hotel's data source | Once a hotel is on one source (mews/apaleo/**sheet** test source), Settings locks to it — no disconnect for "sheet", no way to switch to a PMS. Matters for fixing a wrong/broken connection during a live pilot onboarding. | S | 🟠 built (in working tree — new `pms-disconnect-card`); pending push/deploy + a quick test |
| ⊕ N5 | "Sync now" — already built, just mislocated | A working `SyncNowButton` (→ `/api/sync/pms`) already exists on a separate **Admin** page; it just isn't in Settings where you'd look. So: reuse it, don't rebuild. | S | 🟢 exists (Admin page) — being folded into Settings via N7 |
| ⊕ N7 | Settings flat (~7 sections) + separate Admin menu | Opening Settings dumps every option at once; sync/status live on a separate Admin nav item. Group Settings into click-in categories and fold Admin into it. | M | 🔴 open |
| ⊕ N6 | Apaleo multi-property accounts merge into one hotel | An Apaleo account with several properties has all of them merged into one Fondas hotel (counts/occupancy blend). Fine for single-property pilots; matters for the 1–3-property owners in the ICP. | M | 🔴 open — deferred |

### How to address each — Gate 1

**1 · Mobile pass. ✅ Done — verified on a real phone (27 Aug).** The code (B9) shipped and deployed — sidebar as a slide-over drawer under `md`, the brief single-column at ≥16px body, the dashboard stat row wrapping 2×2, the inboxes as stacked list→detail navigation — and the founder confirmed on a real device that a full brief reads cleanly, an email replies end-to-end, and the drawer nav opens and closes with nothing overflowing. No further action; no Claude Code prompt needed.

**2 · PMS connect inside onboarding. ✅ Done — verified with a fresh signup (27 Aug).** The code (B10) shipped as a stepper — Hotel basics → Connect PMS → First sync → Done — with a "generate a preview brief now" button and a "skip for now" path. The founder confirmed as a brand-new hotel that a fresh signup reaches a real preview brief without ever opening Settings, with the reservation count matching the property, and the skip path and "finish setup" resume banner both behaving. No further action; no Claude Code prompt needed.

**3 · Website punch-list.** Three concrete fixes. (a) Wire the 9 dead footer links (currently `href="#"` with a `°` marker); (b) set `NEXT_PUBLIC_SITE_URL` on Vercel Preview — a dashboard setting only you can see, or unset previews leak production URLs into SEO; (c) keep `COMPANY.priceMonthly`, the Stripe price, and the prose price in sync (hand-linked today).

_The env var (b) is a Vercel dashboard task — do it yourself. For (a) and (c), paste:_

```
Task — clear the website punch-list.
1. Wire the 9 footer links currently href="#" with a ° marker (Integrations,
   About, Careers, Contact, Press, Help centre, Changelog, Cookies, Security).
   Point the ones we can honestly ship now — Contact, Security, Cookies,
   Integrations — at real pages; hide or remove the rest until they exist rather
   than linking to empty stubs.
2. Add a /[lang]/contact page (marketing chrome, en/es/ca) showing
   hello@fondas.app and a short "what to expect" line; point the pricing CTA here.
3. Make COMPANY.priceMonthly, the Stripe price, and the COMPANY.price prose
   read from one source (or cross-reference them) so they can't drift.
```

**Status (28 Aug): ✅ code done & deployed** (commit `edebc13`). Verified in the tree: no `href="#"` dead links remain; a real `/[lang]/contact` page exists; and every price (marketing stats, pricing section, legal terms) now reads from `COMPANY.priceMonthly` / `company.ts`, so it can't drift. **Only leftover — optional, non-code:** set `NEXT_PUBLIC_SITE_URL` (= `https://fondas.app`) on Vercel **Preview** so preview builds don't emit production URLs in their SEO tags. Production is unaffected (it falls back correctly), and previews aren't public, so this is hygiene, not a blocker.

**4 · `hello@fondas.app` inbox.** The domain can *send* (Resend verified) but has no inbox to *receive*. Free forwarding to your iCloud is ~10 minutes — the only blocker is knowing where `fondas.app`'s DNS is managed (Cloudflare / Vercel / registrar), because the MX/forwarding record goes there. Do `privacy@fondas.app` at the same time.

_Founder/ops task — no Claude Code prompt. Decide the DNS host, add forwarding, send a test from an outside address, confirm it lands. (Tell me the DNS host and I can walk you through the exact records.)_

**5 · Apaleo end-to-end.** The library is code-complete (OAuth, credential storage, reservation fetch) but no real Apaleo property has ever gone sync → brief. Run one through the full chain and read the result. Until it passes, keep Apaleo in the ICP but don't demo on it and don't open Apaleo Community / Agent Hub outreach.

**How to test it — corrected (28 Aug):** Apaleo uses OAuth (a "Connect Apaleo" button), not a paste-in key. (1) Free sandbox with sample data: sign up at `identity.apaleo.com/account/register-dev-account`, launch a sandbox property. (2) Register Fondas as a **store app** (authorization-code) at **Apps → My store apps → Add a new store app** — NOT "Connected apps / custom app," which is client-credentials-only and returns `unauthorized_client`. The store app's Client ID contains `-AC-` (Authorization Code); the custom one is `-SP-`. Set **Redirect URI** `https://fondas.app/connect/apaleo/callback` (exact — a blank/mismatched redirect also gives `unauthorized_client`), **Scopes** `reservations.read` + `setup.read` (the plain `rateplans.read` no longer exists — it's split into variants). (3) In Vercel (Prod + Preview) set `APALEO_CLIENT_ID`, `APALEO_CLIENT_SECRET`, and `APALEO_SCOPES=offline_access reservations.read setup.read` (this override drops the retired `rateplans.read` from the request), then redeploy. (4) Connect from `fondas.app` → log into sandbox → approve → sync → brief.

**Progress (28 Aug):** ✅ OAuth connection now works end-to-end (after switching from the custom/client-credentials app to a store/authorization-code app and registering the redirect URI). 🔴 **Sync bug found — the never-run Apaleo path fails:** `GET /booking/v1/reservations` returns `422`. In `lib/apaleo.ts`, `getReservations()` requests `dateFilter=Stay` + date `from`/`to` without scoping to a property, and `apaleoFetch` discards the error body so Apaleo's exact message is hidden. **Fix (Claude Code):**

```
Task — fix the Apaleo reservations sync (422) and make Apaleo errors debuggable.
Context: connecting Apaleo now works (OAuth OK), but the first sync fails with
"Apaleo request to /booking/v1/reservations failed with status 422." In lib/apaleo.ts,
getReservations() calls /booking/v1/reservations with { dateFilter: "Stay", from, to }
(dates YYYY-MM-DD) via apaleoFetch/getAll.
1. apaleoFetch discards the error body — on a non-2xx it throws with only the status. Read
   the response body (res.text(), parse JSON if present) and include Apaleo's validation
   message in the thrown ApaleoApiError and Sentry context. This reveals what Apaleo rejects.
2. Fix the reservations query. The 422 is almost certainly because the list isn't scoped to
   a property and/or the window is too wide for an unscoped query. Fetch the account's
   properties (GET /inventory/v1/properties, covered by setup.read) and pass propertyIds to
   /booking/v1/reservations. One property → use it; several → iterate. Keep dateFilter=Stay
   with date from/to. If Apaleo names a maximum interval, chunk the window and merge.
Adjust to whatever the surfaced 422 body says. Don't touch the MEWS path. Run npm run lint.
```
Then commit → push → redeploy → reconnect/re-sync. If it still 422s, the now-visible error message names the exact remaining fix.

**Fix applied (28 Aug, Claude Code):** the real cause was **date format, not property scoping** — Apaleo's `GET /booking/v1/reservations` wants `from`/`to` as UTC date-**time** (`2026-08-14T00:00:00Z`), and Fondas sent plain `YYYY-MM-DD`. Also fixed: Apaleo error bodies now surfaced (readable messages + Sentry context), a `204 No Content` empty-page crash, and rate-plans/inventory being pulled unscoped across all properties (inflated occupancy on multi-property accounts). Property scoping added too (correct, though not the cause). Verified with stubbed-fetch tests; MEWS untouched; lint/tsc/build pass. No migration or env change. **✅ Proven end-to-end 28 Aug:** after deploy, a forced sync pulled the sandbox reservations and they appear in Fondas — the Apaleo integration is confirmed working. (Surfaced two side-gaps along the way: the sync had to be forced manually — N5; and the sandbox's demo data is future-dated across 5 hotels — N6.)

_Founder-run verification. If a stage breaks, paste:_

```
Task — prove Apaleo end-to-end. Using [Apaleo sandbox / a real property]
credentials, run one property through connect → initial sync → briefing
generation from Apaleo data, and confirm the brief reads correctly. The Apaleo
client already exists (OAuth, credential storage, reservation fetch) — do NOT
rebuild it. Find and fix only what breaks in the sync→brief path for Apaleo
specifically (field mapping, date handling, pagination). Report exactly which
stage failed and what you changed.
```

**6 · Draft-acceptance measurement.** The #1 PMF signal, and genuinely not captured — the Analytics surface is still a "coming soon" page. **Interim (this week):** measure by hand — log sent-unedited / minor / major / discarded per sent draft, and ask each pilot at the 2-week review. **Real fix (B12 + B16):**

```
Task — ship draft-acceptance measurement (B12 + B16).
1. Add posthog-node, server-side only (no client SDK, no cookies — keep the
   "strictly necessary cookies only" statement true). lib/analytics.ts wrapper:
   no-op unless POSTHOG_KEY is set.
2. Emit events keyed by hotel_id (NEVER guest data or email content):
   brief_generated, brief_email_sent, draft_generated, draft_sent,
   draft_edited_before_send (edit-distance bucket none/minor/major), chaser_sent,
   eta_captured, chat_query. Compute the bucket by comparing drafted vs sent body
   at send time.
3. Add a server-side rollup turning draft_edited_before_send buckets into a
   rolling acceptance rate (sent ≤ minor edit / total), queryable per hotel over
   a date range — THE PMF metric.
4. Note in the privacy-policy source that analytics are aggregate, no guest PII,
   for my lawyer to review.
Confirm no event payload contains an email address or guest name.
```

**Status (28 Aug): ✅ code shipped, richer than asked — not yet capturing.** Claude Code delivered posthog-node (server-only, no-op when `POSTHOG_KEY` is unset), all eight events with PII made *structurally* impossible (every property is a UUID/enum/number/bool — no property typed as bare `string` — proven by `npm run analytics-pii-audit` and backed by a runtime tripwire that drops any widened event), normalised-Levenshtein edit buckets computed at send time, and a per-hotel-RLS rollup (`draft_edit_events`, migration 0019) with no guest identifier and no join path back to email data. The privacy policy gained a "Product analytics" section + PostHog sub-processor entry, flagged `⚠️ FOR LEGAL REVIEW`. **✅ Activated & verified 28 Aug.** (0) code committed + deployed (`db7a8f0` → `b78e438`); (1) `POSTHOG_KEY` + `POSTHOG_HOST` set in Vercel; (2) `APPLY_0019.sql` applied in Supabase; (3) verified — a `chat_query` event arrived in PostHog Activity via `posthog-node`, with `PERSON` = a hotel UUID (no guest name/email), confirming the privacy design live. **Note on the metric itself:** `chat_query` proves the pipe; the acceptance-rate number is built from `draft_sent` / `draft_edited_before_send`, which fire only when drafted replies are actually sent (needs Gmail connected — see the 7-day expiry under #14). So the number accrues with real inbox use; the infrastructure is complete.

> **⚠️ Workflow note (found 28 Aug):** Claude Code edits files but does **not** deploy them — work only goes live once it's committed, pushed to `main`, and Vercel auto-deploys. A git check found ~60 uncommitted files (analytics, the N1 language fix, a contact page, privacy/`company.ts` edits, doc consolidation). **Several items this doc tracks as "in progress/done" are built but not yet live.** Commit + push after each Claude Code session, or the work is both un-deployed and at risk of loss.

**Metric refinement worth knowing:** bulk "approve all" sends have no editor, so they always score as unedited and would flatter a hotel that lives on that button. The rollup returns two numbers — `acceptance_rate` (all sends) and `considered_acceptance_rate` (non-bulk only). **Judge the GTM §8 ">60% draft acceptance" bar on `considered_acceptance_rate`;** a wide gap between the two means the hotel is bulk-approving — a real signal, but a different one. The 90% minor/major threshold is the one knob to revisit once real pilot data lands.

**7 · Data-honesty language.** The decision is settled (§1.4 ②): Fondas *does* store data — encrypted, EU-hosted, used only for briefings, deleted on offboarding. The work is propagation across the site, the pilot agreement, the one-pager, and the objection script. Repo-side:

```
Task — make the data-handling language honest and consistent.
The truth (GTM §1.4): Fondas STORES reservation + guest data, encrypted,
EU-hosted on Supabase, used only to generate briefings, deleted on offboarding.
1. Grep the codebase and site content for "we don't store" / "discard" /
   "used and discarded" wording and replace with the honest line.
2. Apply it to marketing privacy/security copy, the legal pages, and any in-app
   data-handling text — en/es/ca.
3. Report every location changed so I can mirror it in the pilot agreement and
   one-pager (those live outside the repo).
```

**Status (28 Aug): ✅ done & deployed** (commit `b10cca5`, pushed + live). Finding: no false "we discard it" claim was ever in the product — that line was in the already-deleted `PILOT_OUTREACH.md`. The real fix was honesty-by-omission in three spots, all now upfront that guest/reservation data is stored (encrypted, isolated, deleted on exit): the "Where does your data live?" FAQ (`faq.a5`), the Mews/Apaleo/Gmail connector descriptions, and the privacy policy's Security section — across en/es/ca. **"EU-hosted" verified ✅ (28 Aug):** Supabase region confirmed as **West EU (Ireland)**, so the claim is true — safe to carry into the pilot agreement, DPA and one-pager. _(Aside: `GTM_STRATEGY.docx` is current — its "discard" mention is the §1.4 passage refuting the old claim, not a live claim.)_

**⊕ 8 · Reliability log + 5 green mornings.** `RELIABILITY.md` has five blank rows; today's check passes but the story you sell is *consecutive unattended* mornings. Backfill honestly, then run `npx tsx scripts/reliability-check.ts` each morning until you have 5+ consecutive green days. Cheapest possible counter to the VC "no tests" question.

_Founder/ops task — no Claude Code prompt. Run the existing script daily and fill the table by hand._

**⊕ 9 · Spanish-brief deliverability. ✅ Done — verified 27 Aug.** A real `briefing_language='es'` brief was confirmed to arrive in Spanish, in a non-personal inbox, not in spam. (Deliverability only — the email's *visual palette* is the separate call in #10 below.)

**⊕ 10 · Brief email palette.** The brief email was redesigned and deployed, but three surfaces that render *outside* the app's CSS are still on the old ramp and can't be verified by a green build. Low priority — it only needs to not look broken in the demo.

```
Task — migrate the last three v2 "Signal" surfaces to v3 "Fonda × Sana", LITERAL
hex only. Files: app/api/cron/briefing/route.ts (morning brief), lib/newsletter.ts
(confirmation + unsubscribe footer), app/[lang]/opengraph-image.tsx (OG image).
1. Replace v2 values (white card on #F6F6F4, #0A0A0A ink, navy #1B3BB3 eyebrow,
   navy mark square) with the v3 palette copied by hand from FONDA_SANA_REDESIGN.md
   §3.1 (neutral #EEEEEE ground, warm near-black ink, no navy in chrome).
2. Every value MUST stay literal hex — do NOT use var(--fonda-*); email clients
   and Satori can't evaluate CSS custom properties and it breaks silently while
   the build stays green. app/global-error.tsx is already migrated this way — use
   it as the reference.
3. Fix the CARD/GROUND comment tokens (currently backwards) and repoint palette
   comments from FONDA_DESIGN_IDENTITY.md to FONDA_SANA_REDESIGN.md.
Do not mark done until I confirm a real send to Gmail + Outlook and an OG check in
Slack/X.
```

**⊕ N1 · Language control.** _Surfaced during verification, 27 Aug — not in the original §3.3 audit. (N-prefixed items are ones found after the initial audit, to avoid renumbering the rest.)_ Three related problems in the one area that matters most for a Spanish-first demo. **(a) Save bug:** on the Morning Brief settings panel, switching the brief language to Spanish and saving persists to the DB (a refresh shows Spanish) but the selector snaps back to English until you manually refresh — the save works, but it *looks* broken, which is the last thing a Spanish-first product should look in a demo. **(b) No account-wide language setting:** the UI language is driven only by the `/[lang]` URL today; there's no stored account default and no home for it in the main Settings. **(c) Onboarding likely doesn't capture language** — so a new hotel isn't set to Spanish from the first sitting. Recommended model: one **account language** set in Settings and captured in onboarding, defaulting both the UI locale and the brief language, with the per-brief selector kept as an override. Two prompts — ship the bug fix before demos, then the feature.

```
Task A — fix the brief-language selector not reflecting after save.
Symptom: on the Morning Brief settings panel (app/[lang]/dashboard/brief), changing
Language to Spanish and clicking Save persists to the DB (a refresh shows Spanish)
but the selector snaps back to English until I manually refresh.
1. Diagnose the state bug: the selector's value is almost certainly rendering from a
   stale server prop (or an uncontrolled defaultValue) not revalidated after the
   server action returns.
2. Fix so the saved value shows immediately with no refresh: revalidatePath on the
   brief page after the update action and/or make the select controlled from the
   action's returned state; show a brief "Saved" confirmation.
3. Confirm briefing_language still persists and the cron reads the saved value.
No schema change. Keep es/ca strings in parity. Run npm run lint.
```

```
Task B — add an account-wide language setting and capture it in onboarding.
Context: today the UI language is driven only by the /[lang] URL segment (en/es/ca)
and there's no stored account default; the only language control is the per-brief
briefing_language on the Morning Brief panel. Spanish GMs want everything in Spanish
by default.
1. Persist a default language (locale) on the hotel/account settings (reuse
   hotel_settings; RLS + migration pattern; update schema.sql + verify_schema.sql).
   Values: en/es/ca.
2. Surface it in the MAIN Settings page (Settings → General/Preferences) as "Account
   language" — the discoverable home for it, not just the brief panel.
3. Use it as (a) the default UI locale on login/redirect when no /[lang] is otherwise
   chosen, and (b) the default for briefing_language on new hotels. Keep the per-brief
   selector as an override, defaulted from the account language.
4. Add a Language step (or a field on Hotel basics) to the onboarding stepper so
   language is set from the first sitting; default to the browser locale, let the user
   change it. Persist via server-side provisioning (no client INSERTs).
5. All new UI strings in en/es/ca. Run npm run lint. In your summary, explain how UI
   locale, account language, and briefing_language now relate so I can confirm the model.
```

**Status (28 Aug): ✅ both built, building clean — pending migration + deploy.** Prompt A found the real cause of the save bug (React 19 resets an uncontrolled `<select>` after a server action, snapping it back to English) and fixed it with a controlled + `startTransition` pattern. Prompt B added the **Account language** setting (Settings + onboarding), migration **0020** (`hotel_settings.default_locale`). The model: one seed (account language) feeds two consumers — at **onboarding** it sets both `default_locale` and `briefing_language`; at **login** it sets the landing locale; **changing it in Settings** switches the UI only and deliberately leaves `briefing_language` alone (English UI + Spanish guest drafts is a real case). **✅ Done, deployed & verified 28 Aug.** Both checks pass: the language save now sticks with no refresh (Prompt A fix confirmed), and a fresh signup asks for language. Save-bug fix + account-wide language setting + onboarding capture all live.

**⊕ N2 · Close the ETA-from-reply loop.** _Surfaced by the #6 work, 28 Aug._ The analytics wiring revealed `eta_captured` will read zero because `recordArrivalTime()` has no callers: the chaser emails the guest, but nothing reads the reply to extract the arrival time — so the guest-reply half of the check-in-chasing surface (one of the four core surfaces) is unfinished. **Droppable for pilots** — ETAs can also arrive from the PMS (`arrival_time_source='pms'`), so the Check-ins page and brief still populate where the PMS has the data, and a demo seeds ETAs anyway. Track it; decide priority against real pilot behaviour. If you want it:

```
Task — finish B11: capture guest-stated ETAs from chaser replies.
Context: reservations.arrival_time + arrival_time_source exist, and
recordArrivalTime() exists but has no callers, so eta_captured is always zero.
1. In the email pipeline (lib/email-processor.ts + lib/checkin-chaser.ts), when an
   inbound email matches a reservation with a pending chaser, extend the existing
   classification/extraction Anthropic call to return a structured arrival time
   ONLY if the guest states one ("llegamos sobre las 15h" -> 15:00; flag approximate).
2. Call recordArrivalTime() with it, mark the chaser resolved, and fire the existing
   eta_captured event. Store nothing if no explicit time (conservative).
3. Check-ins page shows the ETA + "from guest" tag; the brief shows known ETAs inline.
Log extraction outcomes for accuracy review. Keep es/ca strings. Run npm run lint.
```

**⊕ N3 · "Email me this brief now" button.** _Surfaced 28 Aug._ The Morning Brief page has a **Refresh** button, but it only regenerates the brief *on screen* (`/api/briefing`, mode "manual") — it does not email anything. Email delivery happens only via the scheduled job at the send hour, once per day (idempotent — it won't re-send if today's brief already went out). So there's no way to get a brief into your inbox on demand, which the pilot runbook ("generate a preview brief live on the call") and your own daily checks would both use. Small, demo-useful. If you want it:

```
Task — add an "Email this brief now" action to the Morning Brief page.
Today /api/briefing regenerates the brief on screen but never emails it; the cron
(app/api/cron/briefing/route.ts) is the only sender and is once-per-day idempotent.
1. Add a button on app/[lang]/dashboard/brief/page.tsx: "Email me this brief now",
   which generates today's brief and sends it to the configured brief_recipients via
   the existing sendBriefingEmail path (reuse it — do not duplicate the Resend call).
2. Make it explicit and safe: it always sends (bypass the once-a-day idempotency for
   this manual action), shows a "Sent to <recipients>" confirmation, and fires the
   existing brief_email_sent analytics event with trigger:"manual".
3. GM-facing and simple; es/ca strings; run npm run lint.
```

**⊕ N4 · Can't disconnect / switch a hotel's data source.** _Surfaced 28 Aug while testing Apaleo._ Fondas has three sources — `mews`, `apaleo`, and `sheet` (a Google-Sheets-as-fake-PMS connector for testing without a real PMS). `disconnectMews`/`disconnectApaleo` exist but there's no `disconnectSheet`, and Settings only renders the *currently connected* source's card — so a hotel on `sheet` is locked there with no way to switch to a PMS. Small, worth building; **not a hard pilot blocker** (real hotels pick their PMS once at onboarding) but real insurance for fixing a wrong/broken connection during a live pilot onboarding. Workaround for testing: create a fresh test hotel and connect the new source in onboarding.

```
Task — let a hotel disconnect its data source and switch to a different one (Settings).
Today pms_type is "mews" | "apaleo" | "sheet"; disconnectMews and disconnectApaleo exist
but there's no disconnectSheet, and Settings only renders the currently-connected source's
card — so a hotel on "sheet" can't disconnect or switch to a real PMS.
1. Add a disconnectSheet() server action mirroring disconnectMews/disconnectApaleo: clear
   sheet_url_encrypted, reset pms_type/pms_connected, same RLS/auth pattern.
2. In Settings, always offer a "Disconnect" control for whatever source is connected
   (mews/apaleo/sheet). After disconnecting, show the full connector chooser (MEWS form,
   Apaleo connect, Sheet form) so the user can pick a different source — don't hard-lock to
   the current pms_type.
3. Make the switch safe: on disconnect, stop syncing the old source; recommend clearing
   previously-synced reservations so old sheet rows don't mix with new PMS data — tell me
   what you chose.
4. Server-side only (no client writes), es/ca strings, run npm run lint.
```

**⊕ N5 · No "Sync now" after connecting a PMS via Settings.** _Surfaced 28 Aug testing Apaleo._ `POST /api/sync` runs only from the onboarding first-sync step or the scheduled cron (`GET /api/sync`). Connecting a PMS from Settings stores the credentials but triggers no sync, so the hotel stays empty until the cron fires — and the brief "Refresh" button calls `/api/briefing` (rebuild only), not `/api/sync`. This is why a freshly Settings-connected Apaleo hotel showed no data. Small, high-utility (saves re-onboarding to force a sync; also needed after a re-connect). If you want it:

```
Task — add a "Sync now" button so a PMS sync can be triggered from the dashboard/Settings.
Today POST /api/sync runs only in onboarding (components/onboarding/first-sync-step.tsx) and
the cron; connecting a PMS from Settings pulls nothing until the cron fires.
1. Add a "Sync now" action/button (Settings → Integrations, and/or the dashboard pre-sync
   empty state) that POSTs /api/sync for the current hotel, shows progress + a result
   ("synced N reservations"), and surfaces errors in the product voice.
2. Reuse the existing /api/sync route and window (today ±14 days); no new sync logic.
3. Disable/spinner while running; es/ca strings; run npm run lint.
```

**⊕ N7 · Settings IA (grouped sub-menus) + fold in the Admin page (covers N5).** _Surfaced 28 Aug._ `app/[lang]/dashboard/settings/page.tsx` is one long flat page (~7 sections), and sync/status live on a **separate Admin nav item** (`app/[lang]/dashboard/admin/page.tsx`) that already has a working `SyncNowButton` (→ `/api/sync/pms`). Group Settings into click-in categories and move Admin's contents in — reuse the existing button, don't rebuild:

```
Task — reorganize Settings into grouped sections and fold the Admin page into it.
Context: a working "Sync now" already exists — components/dashboard/sync-now-button.tsx
(POSTs /api/sync/pms) — on the separate Admin page (app/[lang]/dashboard/admin/page.tsx),
which also shows PMS sync status, last-synced time, reservation/guest counts, and a
recent-sync-runs list. The Admin nav item is a separate top-level entry in
components/dashboard/sidebar.tsx. Goal: no separate Admin menu — its contents live inside a
reorganized Settings, reusing the existing components (don't rebuild the sync button).
PART A — Reorganize Settings. The settings page is one long flat page (~7 sections). Group it
so opening Settings shows a short menu of categories the user clicks into (in-page sub-nav/tabs
OR nested routes under /dashboard/settings, whichever is cleaner). Placement/navigation only —
don't change any form's behavior or data model. Preserve all functionality, RLS/auth, es/ca
strings; add strings for the group nav. Groups (adjust edge cases sensibly):
  1. "Connections" — PMS/data-source connect (connected-status + Mews/Apaleo/Sheet chooser +
     PmsDisconnectCard) + the existing SyncNowButton + PMS sync status/last-synced + the
     recent-sync-runs list (moved from Admin) + Gmail (GmailConnectionCard).
  2. "Hotel information" — HotelDetailsForm, HotelProfileForm (room types, tone, upsells),
     TripAdvisorForm.
  3. "Account" — AccountLanguageForm, GmNameForm, and other account-level settings.
PART B — Remove the Admin menu. Relocate everything from the admin page into the Connections
group (reuse SyncNowButton with endpoint="/api/sync/pms"). Remove the separate Admin item from
the sidebar. Keep /dashboard/admin as a redirect to the Connections settings section so old
links don't 404. Preserve any access control the Admin page had. Delete the unused admin page
after relocating its content.
Run npm run lint.
```
Moderate change — after deploy, test every form still saves, PMS connect/disconnect works, and Sync Now works from its new home.

**⊕ N6 · Apaleo multi-property accounts merge into one hotel.** _Surfaced 28 Aug — Apaleo dev accounts ship 5 demo hotels._ Fondas is one-hotel-to-one-PMS; the Apaleo client now fetches all `propertyIds` and merges their reservations into the single connected hotel, so a multi-property account blends counts/occupancy. Correct and harmless for single-property pilots (a real GM's account is usually one property), but for the 1–3-property owners in the ICP (the Group tier), Apaleo onboarding should let the user pick which property (or properties) map to the hotel. Deferred until a multi-property Apaleo prospect is real; noted so it isn't rediscovered as a bug.

**Gate 1 exit:** every item 🟢, the full demo run twice (laptop, then phone), and nothing fake or broken anywhere a GM can click.

---

## Gate 2 — Before charging (P1)

_These are hard gates before the first euro, not before the first pilot. Sequence them to the calendar: start the lawyer conversation and Google verification the week the **second** pilot goes live (~4 Sep), because both have weeks of lead time._

| # | Gap | Why it matters | Effort | Status |
|---|---|---|---|---|
| 11 | Billing / Stripe | No way to take money. Fine for free pilots; hard gate before the €199 ask. | M | 🔴 not built (B20) |
| 12 | Rate limiting + per-hotel spend caps | Unmetered Anthropic-backed routes = uncapped cost and abuse risk once outside your control. | S | 🔴 not built (B21) |
| 13 | Legal entity + lawyer-drafted DPA | GDPR applies the moment guest data flows; a competent DPO will ask for an Article 28 agreement. | M | 🔴 not started |
| 14 | Google OAuth verification | Needed before public Gmail connect beyond manual test users. Weeks of lead time. | M | 🔴 not submitted |
| ⊕ 15 | Newsletter unsubscribe flow | A working unsubscribe link is a legal requirement — illegal to send a single newsletter without it. | S | 🔴 not built |
| ⊕ 16 | `company.ts` / legal pages real details | Live site still shows `[Fondas Technologies, S.L.]` placeholders; ships with the entity. | XS | 🔴 placeholders |

### How to address each — Gate 2

**11 · Billing / Stripe (B20).** Build Stripe subscriptions with trial gating for all three SKUs plus the founder-pricing coupon. Have it ready for the mid-October €199 ask, not before pilots.

```
Task B20 — Stripe billing + trial gating.
1. Stripe subscriptions for three SKUs: Single €199/mo, Group €149/property/mo
   (2+), Annual €1,990/yr. Add a founder-pricing coupon (€149/mo lifetime) for
   the pilot cohort.
2. Trial gating: a pilot runs free and converts to paid without re-onboarding;
   never block the core pilot experience during trial.
3. Store subscription state per hotel (RLS pattern, server-side only). Handle
   Stripe webhooks server-side (checkout completed, subscription updated/
   cancelled, payment failed) idempotently.
4. Keep COMPANY.priceMonthly, the Stripe price object, and the prose price in sync.
5. Never log or expose card data; Stripe secret stays server-only.
```

**12 · Rate limiting + per-hotel spend caps (B21).** Today the Anthropic-backed routes are unmetered — safe only while you control every pilot. Add per-tenant limits and a monthly spend ceiling with graceful degrade. Ships alongside billing.

```
Task B21 — rate limiting + per-hotel AI spend caps.
1. Per-hotel rate limiting on the Anthropic-backed routes (drafting, chat,
   briefing): a sensible per-minute and per-day ceiling per hotel.
2. Per-hotel monthly AI-spend ceiling: track token/cost usage per hotel_id; on
   exceed, degrade gracefully (queue or a calm "back shortly"), never a raw 500.
3. Store limits/usage per hotel (RLS, server-side); configurable with a sane
   default.
4. Log cap hits to Sentry with hotel_id + route.
```

**13 · Legal entity + DPA.** Three parts. (a) **Interim, do now:** write a plain one-page pilot agreement (data accessed, not used to train models, encrypted + EU-hosted on Supabase, the sub-processor list, terminable with deletion). (b) **Entity:** book the lawyer the week pilot #2 lands (~4 Sep); Spanish SL takes weeks, autónomo is the faster fallback. (c) **DPA:** lawyer-drafted Article 28 agreement for the first property whose DPO asks.

_Legal/founder work — no Claude Code prompt for the entity or DPA. (The one-pager and pilot agreement are writing tasks I can draft with you on request; the code-side of the legal pages is #16.)_

**14 · Google OAuth verification.** Correctly deferred for pilots (test users), but a hard gate before public Gmail connect and it carries weeks of lead time — **submit early**, the week pilot #2 lands. Prerequisites: legal pages live, domain live, consent screen complete.

_Founder task — no Claude Code prompt. Until it clears, keep adding each prospect's Google account as an OAuth test user the day a demo is booked._

**Known side-effect of Testing mode (found 28 Aug):** while the app is unverified (publishing status = Testing), Google **expires each Gmail refresh token after 7 days** — so every connected mailbox (yours and each pilot's) silently disconnects weekly with a `Gmail token refresh failed (400)` until someone reconnects it (Settings → Gmail card → Disconnect → Connect). A real pilot chore, and a second reason to submit verification early: publishing the app removes the 7-day expiry. Interim: reconnect when the error appears, and expect to do it ~weekly per pilot.

**⊕ 15 · Newsletter unsubscribe flow.** The double-opt-in newsletter is live (0 rows) but there's no unsubscribe flow, and a working one-click unsubscribe is a legal requirement before the first send.

```
Task — build the newsletter unsubscribe flow (legal gate before the first send).
1. One-click unsubscribe endpoint keyed by a signed token in the email footer
   (no login); mark the subscriber unsubscribed; show a simple confirmation page
   (en/es/ca).
2. Every newsletter/confirmation email includes the unsubscribe link and a
   List-Unsubscribe header.
3. While here, migrate lib/newsletter.ts's email off the v2 palette (literal hex,
   per the Gate 1 #10 task).
Do not send any newsletter until this is verified.
```

**⊕ 16 · `company.ts` / legal page details.** The legal pages still carry `[Fondas Technologies, S.L.]` placeholders. Fill with what's true today (or the real SL details on incorporation). Moves in lockstep with #13.

```
Task — fill app/[lang]/(legal)/company.ts with real details, replacing the
[Fondas Technologies, S.L.] placeholders. I'll provide: legal name, CIF,
registered address, contact emails. Until incorporation completes use what's
true today (individual/autónomo), not a fictional SL. Confirm hello@ and
privacy@fondas.app are referenced consistently.
```

**Gate 2 exit:** entity exists or is actively in progress, Stripe + rate-limiting live, the one-page agreement and DPA ready to send same-day, Google verification submitted, and unsubscribe working before any newsletter goes out.

---

## Gate 3 — Before scaling / the raise (P2)

_Hold this line. Breadth before depth is how a solo founder dies. The one item to pull forward is **Outlook**, and only if pilots keep surfacing it. Everything else waits for pilot-pipeline evidence to justify it._

| # | Gap | Why it matters | Effort | Status |
|---|---|---|---|---|
| 17 | **Outlook / Microsoft 365** | "We use Outlook" disqualifies ~half the ICP. Highest-leverage TAM expansion. | L | 🔴 not built |
| 18 | Multi-property owner digest | Monetises the cross-PMS wedge; unlocks the Group tier and higher ACV. | M | 🔴 not built |
| 19 | Graduated autonomy (auto-send routine) | Altek executes; Fondas drafts. Draft → approve → auto-handle-routine, or it looks dated within a year. | M | 🔴 not built (B19) |
| 20 | Pre-arrival upsell drafting | Turns Fondas from cost-saver into revenue-maker: "one late checkout a week pays for Fondas." | M | 🟠 data fields done (B6); drafting not built (B15) |
| 21 | Automated tests / CI on money paths | No safety net for a solo founder shipping fast; the counter to the "no tests" VC question. | M | 🔴 not built (B22) |
| 22 | WhatsApp delivery of brief + urgent flags | Spanish GMs live in WhatsApp. A delivery channel, not a chatbot. | S | 🔴 not built |
| 23 | 3rd PMS (Cloudbeds or Amenitiz) | Roughly doubles Spanish TAM. Choose by pilot-pipeline evidence. | L | 🔴 not built |
| ⊕ 24 | Revenue signal in the brief | Flags soft dates / rate position in prose — the "revenue-maker" story, from GauVendi/happyhotel territory. | M | 🔴 not built (B17) |
| ⊕ 25 | Repeat-guest personalization | Recognises returning guests in drafts and briefs — depth inside a surface you already own. | S | 🔴 not built (B18) |
| ⊕ 26 | `schema.sql` from-scratch rebuild risk | Missing migration 0011; a rebuilt/staging DB would silently lack the hotel profile. | XS | 🔴 tech debt |

### How to address each — Gate 3

**17 · Outlook / Microsoft 365.** The single highest-leverage TAM lever. Build it as a second mailbox provider behind the existing Gmail abstraction; pull it forward only if pilots keep surfacing Outlook. Until it ships, "Uses Gmail" stays a hard ICP qualifier.

```
Task — add Outlook / Microsoft 365 as a second mailbox provider behind the
existing Gmail abstraction.
1. Microsoft Graph OAuth, minimal scopes (read + send), mirroring the Gmail
   posture EXACTLY: drafts never sent without GM approval; tokens encrypted at
   rest, hidden from client selects, server-side only.
2. Abstract the mailbox layer so read/match/draft/send is provider-agnostic;
   Gmail and Graph are two implementations of one interface.
3. Register production OAuth redirect URIs; document the Microsoft consent-screen/
   verification steps (separate from Google).
4. Update the ICP-facing site copy so Outlook is no longer a disqualifier.
```

**18 · Multi-property owner digest.** The feature that monetises neutrality and unlocks the €149/property Group tier. Build it when a real multi-property owner is in the pipeline, not speculatively.

```
Task — multi-property owner digest (supports the Group tier).
1. Model an owner that owns 2+ hotels (mixed PMS allowed); RLS so an owner sees
   only their hotels.
2. Owner-level digest rolling each property's morning brief into one summary,
   with per-property drill-down; delivered by email at the owner's hour/language.
3. Reuse the briefing components; don't fork them.
```

**19 · Graduated autonomy (B19).** "Always drafts, never sends" looks dated within a year (Altek executes). Add a draft → approve → auto-handle-routine path with per-category settings; design first, build gated on B16 acceptance data.

```
Task B19 — graduated autonomy for the email assistant (design first, then build,
gated on acceptance data).
1. Per-category autonomy settings per hotel: draft-only → auto-send-routine, with
   categories (routine confirmations, FAQ replies) separately configurable;
   complaints/urgent ALWAYS review-before-send.
2. Only expose auto-send for a category once B12/B16 data shows it's consistently
   sent unedited — wire the setting to that signal.
3. Full audit trail of anything auto-sent + an easy per-hotel kill switch.
Show me the settings model before building the send path.
```

**20 · Pre-arrival upsell drafting (B15).** Half-built: the upsell fields (B6) shipped and chat can answer "how much is late checkout?" What's missing is *proactive* drafting of pre-arrival offers from those fields.

```
Task B15 — pre-arrival upsell drafting (uses the B6 upsell fields).
1. For upcoming arrivals, draft a pre-arrival email offering the hotel's own
   active paid extras (late checkout, breakfast, transfer, parking, custom) from
   the hotel profile — with prices, in the hotel's voice and the guest's language.
2. Draft only — GM reviews and sends; no catalog, no payments, no PMS writes.
3. Surface in the Communications (pre-arrival) inbox; respect a per-hotel on/off
   and a "days before arrival" setting.
```

**21 · Automated tests / CI on money paths (B22).** Targeted tests on the paths that lose money or trust if they break silently — the concrete answer to the "no tests" concern; pair it with the reliability log and frame the first engineer as part of the raise.

```
Task B22 — automated tests + CI on the money/trust paths only.
1. Focused tests for: PMS sync, briefing generation, draft send, and (once B20
   lands) billing/webhooks. Cover the failure modes that break silently, not
   coverage for its own sake.
2. CI workflow running lint + these tests on every push; block merge on failure.
3. Hermetic tests (mock PMS/Anthropic/Stripe); no real secrets, no guest data in
   fixtures.
```

**22 · WhatsApp delivery.** A *delivery channel*, not a chatbot. Deliver the brief and urgent flags to the GM's WhatsApp in addition to email — high daily-habit payoff in this market, but prove the habit on email first.

```
Task — WhatsApp delivery of the brief + urgent flags (a delivery channel, NOT a
guest chatbot).
1. Deliver the morning brief and urgent flags (new complaint, VIP arriving with
   no room note) to the GM's WhatsApp via the WhatsApp Business API, alongside
   email.
2. Per-hotel opt-in + number; same send-hour/language settings as the email
   brief; template-approved messages only.
3. GM-facing only — build no guest-facing messaging.
```

**23 · Third PMS (Cloudbeds or Amenitiz).** Roughly doubles Spanish TAM, but an L — pick the one your actual prospects run, and hold it until MEWS + Apaleo + Outlook are proven and a raise funds it.

```
Task — add [Cloudbeds | Amenitiz] as a third PMS behind the existing PMS
abstraction (pick the one our pilot pipeline actually runs).
1. Implement its client (OAuth/credential storage, reservation fetch) mirroring
   the MEWS/Apaleo pattern; tokens encrypted, server-side only, hidden from
   client selects.
2. Wire it into onboarding's Connect-PMS step and the sync→brief path; prove one
   real property end-to-end before any outreach on it.
3. Keep the mapping to our internal reservation shape in one place.
```

**⊕ 24 · Revenue signal in the brief (B17).** Once a rate cache exists, flag soft dates and rate position *in the brief's prose*. A signal, not a pricing engine — don't compete with the funded RMS specialists.

```
Task B17 — rate cache + revenue signal in the brief (a signal, NOT a pricing
engine).
1. Build a rate cache (own rates, comp-set position if available from the PMS/
   rate source); refresh on the sync schedule.
2. In the brief's PROSE, flag soft dates and rate position ("Thursday is filling
   slowly; you're ~€15 under the comp set") — extend lib/briefing.ts context, not
   a new dashboard.
3. No dynamic pricing, no RMS — prose signal only.
```

**⊕ 25 · Repeat-guest personalization (B18).** Recognise returning guests in drafts and briefs — small, high-warmth, entirely inside surfaces you already own.

```
Task B18 — repeat-guest personalization.
1. Track stay count and preferred_language per customer (extend the customers
   profile; RLS pattern).
2. Surface returning-guest context in drafts and briefs ("third stay this year,
   prefers Catalan") — injected into the draft/brief context.
3. No new surface; enrich existing drafting + briefing.
```

**⊕ 26 · `schema.sql` rebuild risk.** Production is fine, but `schema.sql` (the "blueprint" meant to rebuild the whole database from empty) has drifted — as of 28 Aug it's missing migrations **0011, 0015, 0017, 0018, 0019 and 0020**, so a from-scratch rebuild would silently produce a broken database. `verify_schema.sql` lists exactly which. Bites the first day you spin up a second environment — a scaling moment.

```
Task — catch up supabase/schema.sql so it can rebuild a current database from
scratch. Run verify_schema.sql to list what's missing, then fold migrations 0011,
0015, 0017, 0018, 0019 and 0020 into schema.sql in order, matching the live database
exactly (blueprint file only — do NOT change production). Also correct the stale
"migration 0016 is NOT applied" note in LAUNCH_PUNCHLIST.md — it IS applied.
Run npm run lint.
```

**Gate 3 exit:** these are the raise's use-of-funds, not solo-founder tasks. Ship them against pilot evidence and pre-seed money — with Outlook the only candidate to pull forward, and tests + the schema fix the two worth doing sooner because they're cheap insurance.

---

## The whole picture in one glance

| Gate | Genuinely un-built (🔴) | Built, needs your verification (🟠) | Cheapest high-value move |
|---|---|---|---|
| **1 · Before pilots** | reliability log (#8, calendar-bound — runs in background); optional polish: N7 Settings reorg (deploying), N2 ETA loop, N3 brief-now, #10 palette | _(all pilot-blockers cleared)_ mobile, onboarding, Spanish-brief, #6 analytics, #3 website, #7 data-honesty + EU-region, N1 language, **#5 Apaleo E2E**, **#4 `hello@` inbox** ✅ | **Last true pre-outreach blocker (`hello@`) cleared → clear to start go-to-market.** Reliability log accrues in parallel. |
| **2 · Before charging** | Stripe, rate-limiting/caps, entity+DPA, Google verification, unsubscribe flow | `company.ts` details | Write the one-page pilot agreement now; book the lawyer the week pilot #2 lands |
| **3 · Before scaling** | Outlook, group digest, autonomy, upsell drafting, tests/CI, WhatsApp, 3rd PMS, revenue signal, repeat-guest, schema fix | — | Hold the line; pull Outlook forward only if pilots keep asking |

**The one-line reading of the audit.** Gate 1 is closer to done than the strategy implies — two of its "gaps" are finished code waiting on an afternoon of your own testing, and most of what remains is verification and propagation, not building. Gate 2 is all real build + legal lead-time, so start the slow parts (lawyer, Google verification) early. Gate 3 is the raise's shopping list, not yours — protect your focus and let pilot evidence, then pre-seed money, decide the order.
