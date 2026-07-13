# Fonda — Claude Code Execution Playbook

_8 July 2026 · Companion to `ROADMAP.md` (v2). Every build task from the July roadmap, in order, with a ready-to-paste Claude Code prompt, its dependencies, and its acceptance check. Founder-only tasks (no code) are marked 🧑 and listed as checklists._

**How to use this file**

1. Work top to bottom. Tasks are sequenced so nothing blocks.
2. Start every Claude Code session with the **Session kickoff prompt** below, then paste the task prompt.
3. After each task, run the **acceptance check**. Mark the checkbox here so any future session knows the state.
4. One task per session where possible. Small tasks (B2, B6) can share a session.

---

## Session kickoff prompt (paste first, every session)

```
Read ROADMAP.md (v2) and EXECUTION_PLAYBOOK.md in the repo root. We are executing
the July plan. Today's task is [TASK ID] from the playbook — I'll paste the task
prompt next. Before starting: confirm which playbook tasks are already checked
off, run `git status` to make sure the tree is clean, and tell me in one line
what [TASK ID] will change. Rules for the whole session: follow CLAUDE.md and
FONDA_DESIGN_IDENTITY.md strictly; every new table/column inherits the per-hotel
RLS pattern; all new UI strings go into all three dictionaries (en/es/ca); run
`npm run lint` before declaring anything done; never touch .env* or commit secrets.
```

---

## WEEK 1 (Mon 7 – Sun 13 July) — Unblock + open the funnel

### 🧑 F1 — Founder checklist (no Claude Code; ~half day)

- [ ] Revoke leaked GitHub token (github.com → Settings → Developer settings → Tokens); re-auth with `gh auth login` or SSH. (STAGE0 §0.1)
- [ ] Buy **fondas.app** → add to Vercel (apex + www). (STAGE0 §0.3)
- [ ] Resend: add domain, set SPF/DKIM/DMARC records, wait for **Verified**, set `RESEND_FROM`. Send test brief to a personal Gmail — confirm inbox, not spam.
- [ ] Vercel **Pro**; copy every `.env.local` var into Vercel (Prod + Preview), especially `CRON_SECRET`; confirm all 4 crons return 200.
- [ ] Supabase daily backups ON; `MEWS_TOKEN_ENCRYPTION_KEY` copied to password manager.
- [ ] Anthropic console: set monthly spend cap.
- [ ] Fill `app/[lang]/(legal)/company.ts` (SL details, CIF, addresses); confirm `hello@` and `privacy@fondas.app` mailboxes exist.
- [ ] Submit Google OAuth verification (consent screen per STAGE0 §0.2 — needs legal pages + domain live first).
- [ ] Register production OAuth redirect URIs (Google + Apaleo) on fondas.app.
- [ ] **Outreach day 1:** build 30-hotel list (Apaleo Community, Design Hotels/SLH directories, LinkedIn `"General Manager" boutique Barcelona/Madrid`). Send 5 connection requests/day using `PILOT_OUTREACH.md` §4 copy. Track in the §8 spreadsheet.

---

### ✅ B1 — Phase C: Morning Brief recipients, send time, language (the "stuck in English" fix)

**Depends on:** nothing. **Roadmap:** 1.7. **Size:** 1 session.

- [x] Done

```
Task B1 — implement Phase C of FONDA_REDESIGN_SPEC.md (§3.2, §5.2, §8 "Brief delivery").

Goal: the morning brief goes to a configured list of recipients, at a configured
send time, in a configured language — instead of today's behavior where
app/api/cron/briefing/route.ts emails ALL hotel users.

Steps:
1. New migration supabase/migrations/0012_brief_delivery.sql:
   - Add to hotel_settings: brief_recipients jsonb NOT NULL DEFAULT '[]'
     (array of ≤3 email strings) and brief_send_hour smallint NOT NULL DEFAULT 7
     (0–23, hotel-local). briefing_language already exists — do not duplicate it.
   - Follow the existing RLS pattern in prior migrations exactly. Also update
     supabase/schema.sql and verify_schema.sql to match.
2. Extend the Morning Brief page (app/[lang]/dashboard/brief) with a Settings
   panel (server action in the pattern of dashboard/settings/actions.ts):
   - Up to 3 recipient emails (add/remove rows, validate format, trim, dedupe).
   - Send time selector (hour, shown in the hotel's timezone from settings).
   - Language selector en/es/ca (reads/writes existing briefing_language).
   - Brief history list: last 30 days from the briefings table (date + open link).
   Reuse components/dashboard/briefing-settings-form.tsx if sensible, otherwise
   replace it — don't leave two competing settings forms.
3. Change app/api/cron/briefing/route.ts: recipients = brief_recipients when
   non-empty, else fall back to current behavior (all hotel users) so existing
   setups don't silently stop receiving mail. Respect brief_send_hour: the cron
   runs on a schedule — only generate+send for hotels whose local hour matches
   brief_send_hour and that haven't received today's brief yet (check briefings
   table for an existing row today; make the send idempotent).
4. i18n: all new UI strings in dictionaries en/es/ca.
5. Write a short verification note in the PR/commit message: how you tested that
   (a) a hotel with briefing_language='es' produces a Spanish brief, (b) only
   configured recipients get it, (c) double-running the cron doesn't double-send.

Design: FONDA_DESIGN_IDENTITY.md — flat cards, hairline borders, 10px inputs,
navy signal only on the primary Save action. Run npm run lint when done.
```

**Acceptance check:** set language to `es` + your own email as sole recipient on the dev hotel → trigger the cron manually (`curl` with `CRON_SECRET`) → a Spanish brief arrives at that address only; second trigger sends nothing.

---

### ✅ B2 — Naming unification: Fonda vs Fondas

**Depends on:** decision — **RESOLVED: brand = "Fondas"** (matches the code, the wordmark, and the fondas.app domain). **Roadmap:** 1.8. **Size:** small; can share a session with B6.

- [x] Done (2026-07-09)

**Outcome (done in a Cowork session, not Claude Code):** An audit found the
customer-facing surfaces — wordmark, email From-names, legal pages
(privacy/terms/company), all three dictionaries, and `package.json` — were
**already 100% "Fondas"**. There was no user-visible inconsistency to fix. The
only singular "Fonda" references were (a) internal dev docs (README, CLAUDE.md)
and (b) 7 design-system code comments ("Fonda v2 Signal", "Fonda design
tokens"). Actions taken:

- README.md and CLAUDE.md prose updated to say **Fondas** for the product, with
  a note that the **design system is separately named "Signal"** — the "Fonda"
  in design-token comments and `FONDA_DESIGN_IDENTITY.md` refers to that system,
  not the product, and was intentionally left as-is.
- No code/UI changes were needed; nothing to lint or redeploy.

> **Note for any future session (Claude Code or Cowork):** the original B2 prompt
> in this file recommended brand = "Fonda" and told an agent to rewrite
> "Fondas" → "Fonda". **That decision was reversed — do NOT run it.** Brand is
> "Fondas". The design system stays "Fonda/Signal".

**Acceptance check (passes):** `grep -riE "\bFonda\b" app components lib dictionaries --include="*.{ts,tsx,json}"` returns only design-system comments (intentional); no product-name "Fonda" in user-facing strings.

---

### ✅ B3 — Landing page: inbox-first hero + fragmentation story

**Depends on:** B2. **Roadmap:** 1.9 + v2 §0.2. **Size:** 1 session.

- [x] Done (2026-07-10 — hero copy approved in all three languages; acceptance check passed on /es)

```
Task B3 — reposition the marketing landing page (app/[lang]/page.tsx) per
MARKET_STRATEGY.md §2.1 and ROADMAP.md v2 §0.2. The positioning: "Fonda runs
your hotel's front-office admin — the inbox, the morning, the chasing — no
matter which PMS you use." Lead with the email assistant; the briefing is the
emotional hook but framed as one output of Fonda knowing your hotel.

1. Hero: rewrite headline/subhead (all three languages) to lead with the inbox
   + morning bundle and the buyer (the GM), never the technology. Keep the
   two-line headline rhythm per FONDA_DESIGN_IDENTITY.md §3. No "AI" in the
   headline; the word may appear at most once on the whole page, factually.
2. Add or adapt a section directly under the hero showing an email draft
   preview (mirror the BriefingPreviewWindow pattern — build an
   EmailDraftPreviewWindow with the same window chrome) so the first product
   visual a visitor sees is a guest email with a ready draft, followed by the
   existing briefing preview.
3. Feature order on the page (and in lib/features.ts): email assistant first,
   briefing second, check-in chasing, chat.
4. Add a quiet "one layer, not six subscriptions" section: a simple 3×2 grid of
   the jobs Fonda bundles (guest replies, morning brief, ETA chasing,
   ask-anything, pre-arrival messages, daily signal) — no competitor names on
   the public site.
5. Integration claims stay honest: MEWS, Apaleo, Gmail only.
6. Keep stats section but reframe the four stats around the inbox + morning
   (time in inbox, brief at 6:30, one price €199 — no invented precision).
7. All copy in en + es + ca dictionaries, same quality in all three — write the
   Spanish and Catalan as a native hotelier would say it, not literal
   translation.
Run npm run lint. Show me the three hero variants (en/es/ca) in your summary.
```

**Acceptance check:** open `/es` — hero reads inbox-first in natural Spanish; first visual is the email draft; no unshipped integrations named.

---

### ✅ B4 — Sample briefing asset (the lead magnet)

**Depends on:** nothing. **Roadmap:** 1.10. **Size:** 1 session.

- [x] Done (2026-07-10 — /[lang]/sample-brief live in en/es/ca; founder to confirm the A4 print and save the outreach PDF)

```
Task B4 — create the "sample briefing" outreach asset per ROADMAP.md 1.10.

Build a public, static, no-auth page at /[lang]/sample-brief that renders one
beautiful, fully fictional morning brief for an invented 42-room Barcelona
boutique hotel ("Hotel Miravent" — invent all details; no real guest data, no
real hotel names). Content: date line, greeting, arrivals (2 VIP notes, one
late arrival), departures, an unconfirmed-ETA list, one flagged guest email
with the drafted reply excerpt, occupancy line with a soft-date signal, and a
short "what Fonda did overnight" footer. Written in the editorial voice —
like a great night manager's handover note, no bullets-and-bold dashboard tone.

1. Reuse the brief rendering components/styles from the dashboard so it looks
   exactly like the product. Marketing nav/footer, plus a single CTA band:
   "Want this for your hotel tomorrow morning? — hello@fondas.app".
2. Provide it in en/es/ca via the normal dictionary route pattern (the brief
   body itself can be one hardcoded localized object — it's content, not chrome).
3. Add a print stylesheet so "Save as PDF" from the browser produces a clean
   A4 one-pager (hide nav/CTA on print).
4. Add a link to it from the landing page footer ("See a sample brief").
Run npm run lint.
```

**Acceptance check:** `/es/sample-brief` renders, reads like a real hotelier's brief, prints to one clean A4 page. Save the PDF — it's the attachment for outreach touch 3.

---

### ✅ B5 — Start the reliability run

**Depends on:** F1 (Resend + Vercel Pro + crons). **Roadmap:** 1.11. **Size:** ½ session + 5+ calendar days of watching.

- [ ] Started (date: ______) · [ ] 5 green days

```
Task B5 — reliability run setup, per ROADMAP.md 1.11.

Goal: one hotel (my real test hotel on MEWS, or a dummy hotel with seeded data
if the MEWS sandbox is flaky) generating and emailing a brief every day with
zero manual intervention, so I can show 5+ unattended green days before pilots.

1. Verify the full chain locally first: sync → briefing generation → Resend
   send. Fix anything broken.
2. Create scripts/reliability-check.ts runnable via npx tsx: queries Supabase
   for (a) last successful sync per hotel, (b) today's briefing row, (c) any
   cron failures logged in the last 24h, and prints a one-line PASS/FAIL per
   hotel with reasons. I'll run it each morning.
3. Make sure every cron route logs failures to Sentry with enough context
   (hotel id, stage) — check instrumentation is actually receiving events.
4. Tell me exactly what to verify in the Vercel dashboard each morning
   (which cron logs, what a healthy run looks like) in a short RELIABILITY.md.
Run npm run lint.
```

**Acceptance check:** `npx tsx scripts/reliability-check.ts` prints PASS; a real brief arrived at your inbox this morning without you touching anything. Log 5 consecutive green days here: __ __ __ __ __

---

### ✅ B6 — Upsell fields in hotel profile (v2 addition — data only)

**Depends on:** Phase B (done). **Roadmap:** 1.12. **Size:** small; pair with B2.

- [ ] Done

```
Task B6 — add upsell/ancillary fields to the hotel profile, per ROADMAP.md 1.12.
Data model + settings form only; the drafting feature that uses them ships in
August (Aug-1), so keep this minimal.

1. Migration 0013_hotel_upsells.sql: add upsells jsonb NOT NULL DEFAULT '[]' to
   the hotel profile storage used in migration 0011 (follow its exact pattern +
   RLS). Shape: [{ key: 'late_checkout' | 'breakfast' | 'transfer' | 'parking'
   | 'custom', label: string, price: string, notes?: string, active: boolean }].
2. Extend the Hotel Profile & Tone settings form (Phase B components) with an
   "Extras & upsells" group: toggle + label + price + notes per item, plus one
   free "custom" row. Follow the room-types-editor.tsx editing pattern.
3. Include active upsells in buildHotelProfileSummary (lib/hotel-profile.ts) as
   a short line — so drafts/chat can already *answer* "how much is late
   checkout?" correctly even before proactive upselling ships.
4. i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** add "Late checkout — €25" in Settings → ask the dashboard Chat "cuánto cuesta el late checkout?" → correct answer.

---

## WEEK 2 (Mon 14 – Sun 20 July) — Pilot-ready product

### ✅ B7 — Phase E: Concierge / Communications stay-phase split

**Depends on:** nothing (B1 recommended first). **Roadmap:** 2.1. **Size:** 1 session.

- [ ] Done

```
Task B7 — implement Phase E of FONDA_REDESIGN_SPEC.md (§2 boundary rule, §3.4,
§3.5): split the existing inbox into Concierge (in-house) and Communications
(pre-arrival & general) by stay phase.

1. Derivation, per spec §2: an email is IN-HOUSE when its matched reservation
   has arrival ≤ today ≤ departure (hotel-local dates); otherwise (future
   reservation or no match) it's PRE-ARRIVAL/GENERAL. lib/email-processor.ts
   already matches emails to reservations — expose stay_phase at query time
   (computed in the page query or a view; avoid storing a value that goes stale
   as dates pass).
2. /dashboard/concierge: reuse the existing email-inbox.tsx flow (draft →
   review/edit → send) filtered to in-house; complaints/urgent flagged at top;
   guest + booking context inline. Label copy: "In-house guests" (+es/ca).
3. /dashboard/communications: same flow filtered to pre-arrival/general.
   Label: "Before arrival" (+es/ca).
4. Empty states for both (explicitly: "No in-house guest messages right now" —
   FONDA_DESIGN_IDENTITY empty-state style, no illustration).
5. Sidebar badges: unhandled-count per page, quiet gray, navy only when a
   complaint is waiting.
6. Do not fork email-inbox.tsx into two copies — parameterize it.
i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** seed one email from a guest currently in-house and one from a future arrival → they appear in the correct pages; complaint appears on top with the navy flag.

---

### ✅ B8 — Phase D: Dashboard content

**Depends on:** B7 (for the concierge summary). **Roadmap:** 2.2. **Size:** 1–2 sessions.

- [ ] Done

```
Task B8 — implement Phase D of FONDA_REDESIGN_SPEC.md (§3.1): the Dashboard
snapshot page.

1. Top row: occupancy today (%), free rooms, check-ins today, check-outs today
   — from reservations, hotel-local dates. Stat style per design identity (big
   number, mono eyebrow label, 1px dividers).
2. 14-day strip: occupancy per day; ADR line STUBBED — render the row with a
   quiet "rates coming soon" placeholder (rate cache is an August task; do not
   build it now).
3. Concierge summary card: up to 3 most relevant in-house items (complaints
   first, then oldest unanswered), linking into /dashboard/concierge.
4. Priority to-do list — rules only, per spec §3.1 notes and open decision #2.
   Implement lib/todo-rules.ts producing ranked items from: unanswered
   complaint (highest), VIP arriving today without room note, >N unconfirmed
   ETAs for tomorrow, unanswered email older than 24h, day within 14 days with
   occupancy < 40% (soft date). Each item: one sentence + link to the page
   where you act on it. Pure function, unit-testable structure, no AI calls.
5. Pre-sync empty state: "Connect your PMS to see today" with a link to
   Settings → Integrations.
6. Loading skeletons + error boundary per spec §3.1 states.
i18n en/es/ca. Run npm run lint. In your summary, list the exact to-do rules
and thresholds you implemented so I can tune them.
```

**Acceptance check:** dashboard loads under a second with seeded data; to-do list shows the seeded complaint first; ADR row shows the stub, not fake numbers.

---

### ✅ B9 — Phase M: mobile pass (brief, dashboard, inboxes, sidebar)

**Depends on:** B7, B8. **Roadmap:** 2.3. **Size:** 1 session.

- [ ] Done

```
Task B9 — mobile/responsive pass, per ROADMAP.md 2.3 (the spec's missing
phase). Scope: the GM's 6:45am phone moment — Morning Brief page, Dashboard,
Concierge, Communications, and the sidebar. Target: clean at 375px width.

1. Sidebar → slide-over drawer under md: hamburger in a slim top bar (wordmark
   + menu), overlay per design identity (no dark mode, light scrim), focus
   trapped, closes on nav.
2. Morning Brief: single column, comfortable reading size (body ≥16px,
   measure ≤ 60ch), settings panel stacks below the brief.
3. Dashboard: stat row wraps 2×2; 14-day strip horizontally scrollable with
   snap; to-do list full-width.
4. Concierge/Communications: list → detail becomes stacked navigation on
   mobile (list first, tap into message, back returns to list) rather than
   side-by-side.
5. Audit remaining dashboard pages for anything actually broken (overflow,
   unusable controls) at 375px and fix cheaply — polish only where broken.
6. Test at 375px, 768px, 1280px. Don't introduce new breakpoint values beyond
   Tailwind defaults.
Run npm run lint. Summarize per page what changed.
```

**Acceptance check:** on your phone (or 375px devtools): read the full brief comfortably, triage one email end-to-end, open the drawer nav. Nothing overflows.

---

### ✅ B10 — Phase O: PMS connect inside onboarding + first-run states

**Depends on:** nothing. **Roadmap:** 2.4. **Size:** 1 session.

- [ ] Done

```
Task B10 — move PMS connection into the onboarding wizard, per ROADMAP.md 2.4
and LAUNCH_PLAN 1.5. Goal: a new hotel reaches a real morning brief in one
sitting, without discovering Settings.

1. Extend app/[lang]/onboarding to a stepper: (1) Hotel basics [exists] →
   (2) Connect your PMS → (3) First sync → (4) Done.
   Step 2: reuse mews-connection-form.tsx and apaleo-connection-card.tsx;
   include a clearly-worded "skip for now" path.
   Step 3: trigger an initial sync, show progress, then a real preview (e.g.
   "We found 214 upcoming reservations · your first brief arrives tomorrow at
   7:00") — with a "generate a preview brief now" button that runs generation
   immediately so the wow moment happens during onboarding.
   Step 4: point to the Dashboard; mention Gmail connect as the next optional
   step (Settings → Integrations).
2. Keep all provisioning server-side via the existing provision_hotel RPC
   pattern — no client INSERTs (CLAUDE.md rule).
3. If the user skipped PMS: dashboard shows the B8 pre-sync empty state, and
   onboarding can be resumed from a banner ("Finish setup — connect your PMS").
4. Audit the first-run experience of every dashboard page with zero synced
   data and make each empty state helpful (what this page will show + the one
   action to take).
i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** create a fresh account → connected the sandbox PMS and saw a generated preview brief without ever visiting Settings.

---

### ✅ B11 — Phase F-lite: capture ETA from guest replies

**Depends on:** nothing. **Roadmap:** 2.5. **Size:** 1 session.

- [ ] Done

```
Task B11 — close the ETA loop, per ROADMAP.md 2.5 and FONDA_REDESIGN_SPEC §3.3:
when a guest replies to a check-in-time chaser, extract the arrival time and
store it, so Check-ins shows real ETAs.

1. Migration 0014_arrival_time.sql: reservations.arrival_time time NULL +
   reservations.arrival_time_source text NULL ('guest_reply' | 'pms') — follow
   existing RLS/migration patterns; update schema.sql/verify_schema.sql.
2. In the email pipeline (lib/email-processor.ts + lib/checkin-chaser.ts):
   when an inbound email matches a reservation with a pending chaser, add an
   extraction step (existing Anthropic call pattern; extend the classification
   prompt rather than adding a second API call if practical) that returns a
   structured arrival time if and only if the guest states one ("we land at
   14:30, at the hotel around 4" → 16:00, flag approximate). Store it, mark
   the chaser resolved.
3. Check-ins page: show ETA column (time + "from guest" tag), "ETA unknown →
   chase" action state remains for the rest. Sort: unknown-ETA first.
4. Morning brief: today's arrivals with known ETAs get the time inline
   (extend lib/briefing.ts context, not the prose template).
5. Handle ambiguity conservatively: if no explicit time, store nothing.
   Log extraction outcomes so I can review accuracy over the pilot.
i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** reply to a chaser with "llegamos sobre las 15h" from a test inbox → Check-ins shows 15:00 "from guest" and the chaser is marked resolved.

---

### 🧑 F2 — Week 2 founder checklist

- [ ] Outreach cadence continues (5/day); target 3–5 demos booked.
- [ ] Email-draft quality pass on a real inbox: send 10 varied test guest emails (es/en/ca, one complaint, one late-checkout ask), review drafts, tune tone in Hotel Profile; iterate until ≥6/10 sendable with minor edits.
- [ ] Demo run-through with the new flow: open on Concierge inbox with a draft ready → brief → chasing → chat. Update the `PILOT_OUTREACH.md` §5 script notes.
- [ ] Add each booked pilot's Google account as a **Test user** in the OAuth consent screen the day the demo is booked.
- [ ] **Gate check Sun 20:** reliability ≥5 green days · Spanish brief verified end-to-end · drafts pass. If not, week 3 slips — fix first.

---

## WEEK 3 (Mon 21 – Sun 27 July) — Properties in

### 🧑 F3 — Pilot onboarding (the founder does this live)

- [ ] Pilot 1 onboarded (30-min call: PMS connect → first sync → preview brief → Gmail connect → profile & tone + upsell fields filled together → brief recipients set to the GM).
- [ ] Pilot 2 onboarded.
- [ ] WhatsApp thread per pilot opened; daily check on their brief.

### ✅ B12 — Minimal product analytics (PostHog EU)

**Depends on:** pilots incoming. **Roadmap:** 3.3. **Size:** ½ session.

- [ ] Done

```
Task B12 — add minimal, privacy-first product analytics per ROADMAP.md 3.3 and
MARKET_STRATEGY.md §2.5. PostHog EU cloud, no session recording, no autocapture.

1. Add posthog-node (server-side capture only — no client SDK, no cookies, so
   the legal "strictly necessary cookies only" statement stays true; flag it in
   your summary if any client event is truly unavoidable).
2. Events, keyed by hotel_id (never guest data, never email content):
   brief_generated, brief_email_sent, draft_generated, draft_sent,
   draft_edited_before_send (with edit-distance bucket none/minor/major — a
   cheap first version of the acceptance metric), chaser_sent, eta_captured,
   chat_query, pilot page_view per dashboard page (server component log).
3. lib/analytics.ts wrapper: no-op unless POSTHOG_KEY env var is set.
4. Add a note to the privacy policy source about operational analytics
   (aggregate, no guest PII) for my lawyer to review.
Run npm run lint.
```

**Acceptance check:** PostHog dashboard shows `brief_email_sent` for the dev hotel; no event payload contains an email address or guest name.

### ✅ B13 — Feature freeze polish (run as needed, week 3–4)

- [ ] Done (rolling)

```
Task B13 — polish pass under feature freeze (ROADMAP.md 3.4). No new features.
Pick from this list, highest first, and tell me what you fixed:
1. Room-type display: map raw PMS category ids to friendly names using the
   Phase B room_types profile data wherever guests/rooms render (brief,
   check-ins, chat context).
2. ES/CA translation quality sweep of ALL new UI from tasks B1–B12 — a native
   hotelier's phrasing, consistent terminology (e.g. one term for "brief"
   across es: "resumen matinal" everywhere). Known pending from B3
   (2026-07-10): B3 standardized the marketing page on "resumen matinal";
   three "Resumen matutino" occurrences remain in dictionaries/es.json
   (dashboardNav.brief, the brief page title, and the noBriefing empty
   state) — sweep them to "resumen matinal".
3. Error-state copy: every user-visible failure (sync failed, Gmail
   disconnected, brief generation failed) says what happened + the one action
   to take, in the product voice — calm, concrete, no jargon.
4. Loading skeletons anywhere a page can hang >300ms without one.
5. Anything reported by pilots this week (I'll paste their feedback below).
Run npm run lint.
```

---

## WEEK 4 (Mon 28 – Fri 31 July) — Feedback + stabilize

### 🧑 F4 — Founder checklist

- [ ] Pilot 3 onboarded (or scheduled first week of August — acceptable).
- [ ] Structured feedback per pilot (15 min): what's wrong in the brief · which drafts did you edit and why · what would you pay · what's missing for daily use. Paste verbatim notes into a `PILOT_FEEDBACK.md`.
- [ ] Screenshot/quote collection with permission (case-study raw material).
- [ ] **31 July checkpoint** (ROADMAP.md 4.4): A–E+M+O live · 5+ unattended green days · ≥2 properties live with daily briefs + inbox use · feedback in writing.

### ✅ B14 — Top-3 pilot fixes

- [ ] Done

```
Task B14 — pilot feedback fixes. Here is the feedback from PILOT_FEEDBACK.md /
pasted below: [PASTE FEEDBACK]. Propose the top 3 fixes ranked by (impact on
daily use × effort), confirm with me, then implement them one at a time under
the feature-freeze rules: no new surfaces, no new dependencies, lint clean,
es/ca strings included.
```

---

## AUGUST — prompts to be written when we get there

The August tracks are specced in `ROADMAP.md` v2 (Aug-1…Aug-5 + commercial track). Write the detailed prompts at the end of July with pilot knowledge in hand. Placeholders so nothing is lost:

| ID | Task | Prompt written? |
|---|---|---|
| B15 | Aug-1 Pre-arrival upsell drafts (uses B6 fields) | ☐ |
| B16 | Aug-2 Draft-diff tracking → acceptance-rate metric (extends B12's edit-distance buckets) | ☐ |
| B17 | Aug-3 Rate cache + revenue signal in brief (spec Phase H, promoted) | ☐ |
| B18 | Aug-4 Repeat-guest personalization (`customers.preferred_language`, stay count) | ☐ |
| B19 | Aug-5 Graduated autonomy (design first; gate on B16 data) | ☐ |
| B20 | Stripe billing + trial gating (LAUNCH_PLAN 2.1) | ☐ |
| B21 | Rate limiting + per-hotel spend caps (LAUNCH_PLAN 2.2) | ☐ |
| B22 | Test suite + CI on money paths (LAUNCH_PLAN 2.3) | ☐ |

---

## Standing verification prompt (run at each week boundary)

```
Weekly audit. Read EXECUTION_PLAYBOOK.md and verify the checked-off tasks are
actually true in the codebase: for each task marked Done this week, confirm its
acceptance check would pass (inspect code, run lint, run
scripts/reliability-check.ts, check migrations applied in schema.sql). Then:
1. List anything claimed done that isn't, with the gap.
2. List any drift from FONDA_DESIGN_IDENTITY.md or CLAUDE.md rules introduced
   this week (hard-coded hex, missing es/ca strings, client-side service-role
   usage, RLS gaps on new tables).
3. Confirm no secrets are staged: git log -p over the week's commits for
   anything resembling a key.
Report as a short table: task · status · gap · fix effort.
```
