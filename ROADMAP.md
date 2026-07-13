# Fonda — Objectives Re-assessment & July Roadmap (v2)

_v2 — 8 July 2026, reworked after the 8-startup competitive deep dive (`COMPETITOR_LANDSCAPE.md`). Goal unchanged: solid MVP **and** first properties trying it by **31 July**._
_Inputs: `FONDA_REDESIGN_SPEC.md` (Phases A–B done, verified), `MARKET_STRATEGY.md`, `COMPETITOR_LANDSCAPE.md`, `LAUNCH_PLAN.md`, `PILOT_OUTREACH.md`. Assumes Claude Code velocity: build phases are measured in sessions, not weeks — the binding constraints are external (DNS, Google, lawyers, GM calendars, and calendar days for the reliability proof)._

## 0. What changed in v2 (and what deliberately didn't)

**The July plan survives the competitive research almost intact — that's a feature.** Nothing in the landscape says "build something else in July"; it says "the window is real, the region is open, move." The changes:

1. **Spain-density is now doctrine, not preference.** Every comparable winner took a home region first (Otel→Ireland, Altek→Nordics, profitize→South Tyrol, Cora/ALOE→Italy). Nobody has Spain. Outreach stays 100% Barcelona/Madrid until 10 paying — resist opportunistic Lisbon/Amsterdam demos in July.
2. **The demo gets a new closing slide: the fragmentation map** (`COMPETITOR_LANDSCAPE.md` §1). "You could buy six subscriptions — comms, revenue, finance, tasks, experiences, CRM — or one layer that runs your morning." This is now Fonda's sharpest sales line.
3. **One small July addition (1.12): upsell fields in the hotel profile** (late checkout price, breakfast, transfer, parking). ~Minutes of Claude Code work now; unlocks August's highest-leverage feature (pre-arrival upsell drafts, per ALOE's territory) and lets pilot onboarding capture the data while you're on the call anyway.
4. **August is reprioritized around three "combine, don't build" features** (landscape §4): pre-arrival upsell suggestions, revenue *signal* in the brief (rate cache promoted), and repeat-guest personalization. Graduated autonomy for the email assistant enters the roadmap as the answer to Altek AI's "we execute, not draft" positioning.
5. **A quarterly watchlist cadence is added** (landscape §5): Altek southward moves, Otel down-market, platform copilots adding inbox handling, Cora/ALOE adding GM digests.

**Explicitly unchanged:** no booking engine, no dynamic pricing, no task management, no FP&A, no guest chatbot — each now has a funded specialist, which strengthens rather than weakens the bundle thesis.

---

## 1. Spec verification (task 1)

**Status confirmed against the codebase:**

- **Phase A ✅ done** — sidebar + all §2 routes exist (`brief`, `checkins`, `concierge`, `communications`, `analytics`, `chat`, `settings`).
- **Phase B ✅ done and wired** — `0011_hotel_profile.sql`, profile/room-types/TripAdvisor forms, and `buildHotelProfileSummary` injected into **all four** AI surfaces (briefing, email-processor, checkin-chaser, chat).
- **Phase C ⬜ not started** — no `brief_recipients` in code or migrations; `api/cron/briefing` still emails *all* hotel users. Correctly the next phase.

**Consistency findings (minor):**

1. **Stale mapping column** — §2 "Maps to today" still references old routes (`/briefing`, `/checkin`, `/emails`); the migration to the new IA already happened. Cosmetic; update or ignore.
2. **`/dashboard/admin` exists but isn't in the spec's IA** — §2 puts user management in the account menu / Settings §5.4. Reconcile when Phase G lands (recommend: fold admin into Settings → Users as specced).
3. **Open decisions §10: two are already decided de facto** — #1 room types = manual capture (room-types-editor ✅) and #6 TripAdvisor = paste-and-summarize (tripadvisor-form ✅). Mark them resolved. #2 (to-do list): go rules-first, as the spec itself recommends. #3 (analytics depth) and #5 (extra languages): resolved below by deferral. #4 (stay-phase split): keep stay-phase.
4. Internal consistency is otherwise good — recipients ≤3 agrees across §3.2/§5/§8; page keys match presets; migrations list covers every "Data: new" flag.

**Completeness gaps (matter more):**

5. **No mobile phase.** The spec never mentions responsive layout, yet `LAUNCH_PLAN.md` 1.3 calls the 6:45am phone moment pilot-critical, and the app has only ~40 responsive utilities. → Added as **Phase M** below.
6. **No onboarding-wizard phase.** PMS connect still lives in Settings; launch plan 1.5 wants it in onboarding so a new hotel reaches a real briefing in one sitting. → **Phase O** below.
7. **No draft-quality feedback loop.** `MARKET_STRATEGY.md` §3.6 makes draft-acceptance rate the #1 PMF metric, but nothing in the spec measures it. Cheap to add (store sent-vs-draft diff). → **Phase Q** below (August).
8. Analytics page is a 35-line stub with, per spec, Manager-only permission — verify a server-side guard exists when Phase G lands (currently permissions don't exist at all, which is fine for single-user pilots).

---

## 2. Objectives re-assessment (task 2)

**The July goal is not "finish the spec." It's "pilot-ready product + properties in the door."** The spec is a good build reference, but treating phases C→I as the to-do list would spend July building Analytics and permissions while zero hotels use Fonda. Reordered through the market lens:

**What stays (validated by the market work):**

- **The four-surface bundle and GM-first thesis** — reinforced by Otel AI's funding and the platform copilots; the segment (20–80-room boutique, MEWS/Apaleo, ES/CA) is yours.
- **Phase B investment** — Hotel Profile & Tone is exactly the "brain that knows your hotel" moat `MARKET_STRATEGY.md` Appendix A says to market. Money well spent.
- **Phase C next** — correct, and now urgent for a different reason: Spanish pilots getting an English brief kills the demo. It's also small (one migration + settings panel + cron change).
- **Signal design system, €199 flat, pilot outreach plan** — unchanged.

**What changes:**

- **Phase E (Concierge/Communications split) is promoted** — it's the UI expression of the inbox-first positioning, so it must exist before demos. Phase D (Dashboard) matters for the demo's first impression but ships with ADR stubbed and a rules-only to-do list.
- **Phases G, H, I are deferred to August.** Pilots are single-GM users (no permissions needed), Analytics has no 30-day data to show yet, and the chat widget already works. Building these in July would be procrastination with good aesthetics.
- **Mobile becomes a real phase (M)** — it was the spec's biggest omission and it's pilot-critical.
- **Outreach starts this week, not after the build.** Contact→active pilot takes ~3 weeks (`PILOT_OUTREACH.md` §8). Started July 21st, pilots land in mid-August and the July 31 goal is missed by arithmetic, not effort. **This is the single most important scheduling fact in this document.**
- **The reliability proof is calendar-bound** — 5+ unattended days means it must start by ~14 July, which means domain + Resend + Vercel Pro this week.

**Focus order, in one line:** unblock infra (you) → open the funnel (you) → Phase C + E + D + M (Claude Code) → onboard → feedback. Everything else is August.

---

## 3. The roadmap (task 3)

### Week 1 — Mon 7 → Sun 13 July · "Unblock + open the funnel"

**You / business (~half-day of clicking, then ~1h/day):**

| # | Item | Source |
|---|---|---|
| 1.1 | Revoke leaked GitHub token; re-auth via `gh`/SSH | STAGE0 §0.1 — **today** |
| 1.2 | Buy fondas.app → Vercel domains; Resend DNS (SPF/DKIM/DMARC); test email to a real Gmail inbox | STAGE0 §0.3 |
| 1.3 | Vercel Pro + all env vars + confirm 4 crons return 200; Supabase daily backups; Anthropic spend cap | STAGE0 §0.5 |
| 1.4 | Fill `company.ts`; legal pages live; book lawyer review + DPA | STAGE0 §0.4 |
| 1.5 | Submit Google verification (needs 1.2 + 1.4 live) | STAGE0 §0.2 — weeks of lead time |
| 1.6 | **Outreach day 1:** build 30-hotel list (Apaleo community, Design Hotels, LinkedIn BCN/MAD); send 5/day from Tue 8th | PILOT_OUTREACH — critical path |

**Build (Claude Code, ~3–4 sessions):**

| # | Item | Done when |
|---|---|---|
| 1.7 | **Phase C complete:** `brief_recipients` (≤3) migration + Morning Brief settings panel (recipients, send time, language) + cron emails configured list | A Spanish-language brief lands in an arbitrary inbox, end-to-end |
| 1.8 | ✅ Naming unified on **Fondas**. Audit found customer-facing surfaces (wordmark, emails, legal, dictionaries, package.json) were already 100% "Fondas" — no UI inconsistency. Aligned README/CLAUDE.md prose to "Fondas" and documented that the design system is separately named "Signal" (the 7 "Fonda" design-token comments are intentional, not drift). | Zero customer-facing inconsistencies ✅ |
| 1.9 | Landing: hero reordered inbox-first per `MARKET_STRATEGY.md` §2.1; claims stay honest | Copy matches positioning |
| 1.10 | Sample-briefing asset (beautiful anonymized brief as PDF/page) for outreach touch 3 | Sendable link |
| 1.11 | **Start the reliability run**: dummy/real hotel syncing + briefing daily, unattended | Running by Sun 13 — gates pilot onboarding |
| 1.12 | **Upsell fields in hotel profile** (late checkout / breakfast / transfer / parking, with prices) — data model + form only | Fields exist; captured during pilot onboarding (drafting feature ships in August) |

**Non-blocking follow-ups surfaced during B1 (Phase C) verification** — queue, don't block:

- **Localize the brief email** — subject line and section headings (`Arrivals & departures`, `Overnight email`, `Rate alert`) are hardcoded English in `app/api/cron/briefing/route.ts`; drive them off `briefing_language`. Fits naturally into the settings/brief work (Claude Code's B2) or the email-polish pass (B13). Without it a Spanish pilot gets Spanish body text under English headings.
- **Timezone-throw hardening** — `Intl.DateTimeFormat` throws on an invalid `hotels.timezone`; a single bad row currently aborts the whole cron tick. Wrap `localHour`/`localDate`/`formatLongDate` per-hotel so one bad timezone skips that hotel instead of failing all.

### Week 2 — Mon 14 → Sun 20 July · "Pilot-ready product"

**Build (~4–5 sessions):**

| # | Item | Done when |
|---|---|---|
| 2.1 | **Phase E:** Concierge/Communications stay-phase split over existing inbox | In-house vs pre-arrival correctly routed on real emails |
| 2.2 | **Phase D:** Dashboard (occupancy, free rooms, in/out counts, concierge summary, **rules-based** to-do list; ADR stubbed) | Demo-ready snapshot |
| 2.3 | **Phase M (new):** mobile pass on Brief, Dashboard, Concierge/Comms + sidebar → drawer | Brief is clean on a phone |
| 2.4 | **Phase O (new):** PMS connect step inside onboarding wizard + first-run empty states | New hotel reaches a real brief in one sitting |
| 2.5 | **Phase F-lite:** parse ETA from chaser replies → `arrival_time` → Check-ins page shows it | Reply populates ETA without manual entry |

**You:** keep 5/day outreach cadence; book demos (target 3–5); run the **email-draft quality pass** on a real inbox (tune tone via the Phase B profile); demo script updated to open on the inbox (MARKET_STRATEGY §3.4).

**Gate at Sun 20:** reliability run ≥5 green days · Spanish brief verified · drafts mostly sendable. If any fail, fix before onboarding anyone — a broken pilot is worse than a late one.

### Week 3 — Mon 21 → Sun 27 July · "Properties in"

| # | Item |
|---|---|
| 3.1 | **Onboard pilots 1–2** (30-min screen-share each: PMS connect + Gmail + profile/tone fill-in — add each as Google test user) |
| 3.2 | WhatsApp support thread per pilot; check in daily on brief quality |
| 3.3 | Minimal PostHog (EU): brief opens, draft edits/sends, chat queries — the §3.6 metrics |
| 3.4 | **Feature freeze** except pilot-feedback fixes; Claude Code time goes to polish (room-type names, empty states, error copy, ES/CA translations of new UI) |

### Week 4 — Mon 28 → Fri 31 July · "Feedback + stabilize"

| # | Item |
|---|---|
| 4.1 | Onboard pilot 3 (if scheduled — peak season may push it to early Aug; 2 live pilots still meets the goal) |
| 4.2 | First structured feedback: 15-min call or 5-question note per pilot (what's wrong in the brief, which drafts they edited, what they'd pay) |
| 4.3 | Fix the top 3 reported issues; screenshot/quote collection begins (case-study raw material) |
| 4.4 | **31 July checkpoint — "solid MVP" defined as:** Phases A–E + M + O live · 5-day+ unattended reliability · ≥2 properties connected, receiving daily briefs and using the inbox · first feedback captured in writing |

### August — reprioritized with the competitive knowledge

**Revenue & differentiation track (new priorities, from `COMPETITOR_LANDSCAPE.md` §4):**

| Priority | Item | Why now |
|---|---|---|
| Aug-1 | **Pre-arrival upsell drafts** in Communications (uses 1.12 fields; guest replies, hotel books in PMS — no catalog, no payments) | Turns Fonda from cost-saver into revenue-maker; "one late checkout a week pays for Fonda" is the €199 justification against €99 anchors (Cora) |
| Aug-2 | **Phase Q — draft-diff tracking** → acceptance-rate metric | The #1 PMF number; also the dataset that later justifies autonomy |
| Aug-3 | **Rate cache (Phase H, promoted)** → revenue *signal* in the brief ("Thu is 40% sold at €145; last year 70%") — prose signal, never a pricing engine | The GauVendi/happyhotel space, taken as a sentence in the brief instead of a product |
| Aug-4 | **Repeat-guest personalization** — `customers.preferred_language` + "3rd stay, always asks for a quiet room" in drafts/brief | Cheap (existing data), and it's what "boutique" means |
| Aug-5 | **Graduated autonomy settings** (auto-send routine confirmations; always-review complaints/VIPs) — design + first category | The answer to Altek AI's "we execute, not draft"; ship only after Aug-2 data proves draft quality |

**Commercial & infra track (unchanged from v1):** Stripe billing + trial gating · week-2 pilot survey → **the €199 ask** (mid-late August) · Google verification lands · Hotel Tech Report profile + first pilot reviews · Phase G (users/permissions — first multi-staff pilot triggers it) · Phase I (chat page) · Outlook-vs-3rd-PMS decision with pipeline evidence.

**Watchlist cadence:** first quarterly competitive review **1 October** (Altek expansion, Otel down-market, platform copilots' inbox moves, Cora/ALOE GM-digest moves — triggers in `COMPETITOR_LANDSCAPE.md` §5).

---

## 4. Risks to this plan

- **Peak-season calendars** (the known objection): GMs slow to book demos in July. Mitigation: over-contact (30+, not 20), lead with "setup fits around you, 30 min," and accept pilots starting Aug 1–7 as partial success.
- **Reliability run finds real bugs** (that's its job): budget week-2 Claude Code time for fixes, not only features.
- **Gmail restricted-scope friction**: pilots must be added as test users *before* their onboarding call — do it when the demo is booked, not during.
- **Scope creep via the spec**: G/H/I are explicitly out of July. If a build session finishes early, the next task is polish or outreach research — not Analytics.
