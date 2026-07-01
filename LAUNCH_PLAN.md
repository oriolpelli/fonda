# Fonda — MVP Launch Review & Roadmap

_Prepared 30 June 2026 · Target: 3 free pilots now → first paying customers in ~6 weeks_

---

## 1. Executive summary

Fonda is much further along than a typical pre-launch product. The four core surfaces —
morning briefing, email assistant, check-in chasing, and "Ask Your Hotel" chat — are **built,
wired end-to-end, and deployable** on top of a clean Next.js 16 / Supabase / Anthropic stack
with real MEWS and Apaleo PMS integrations, Gmail OAuth, Resend email, Sentry monitoring,
row-level-security tenancy, token encryption at rest, and full English / Spanish / Catalan i18n.

The work remaining is **not "build the product"** — it's **harden, commercialize, and prove it**.
Specifically: there is no billing, the legal pages are placeholders, there are no automated
tests, AI endpoints are unmetered, mobile layout is thin, and Google still has to verify the app
before non-test users can connect Gmail. One urgent security issue (a leaked GitHub token) needs
fixing today.

**Verdict on timeline:**

| Milestone | Realistic effort | What gates it |
|---|---|---|
| **Pilot-ready** (3 free hotels, daily use) | ~1 week of focused work | Rotate leaked token · real legal pages · domain + email deliverability · reliability proof |
| **Paid-ready** (charge €199/mo, open signups) | ~5 more weeks | Stripe billing · Google app verification · rate limiting · tests/CI · data-quality fixes |

The single biggest external dependency is **Google app verification** for Gmail's restricted
scopes — it takes weeks and should be started **this week** even though pilots don't need it.

**Top five things to do first:** (1) rotate the exposed GitHub token, (2) start Google
verification, (3) replace the placeholder Terms/Privacy with real GDPR-ready copy, (4) lock the
domain + verified sending domain, (5) run the briefing/email pipeline on a real hotel for several
days to prove reliability before any pilot call.

---

## 2. Current-state review

### 2.1 What's built and working

| Area | Status | Evidence in repo |
|---|---|---|
| Auth (email/password) + session refresh + route guard | ✅ Working | `proxy.ts`, `lib/supabase/*`, defense-in-depth in dashboard layout |
| Server-side hotel provisioning | ✅ Working | `onboarding/actions.ts` → `provision_hotel` RPC via service role |
| Multi-tenant data model + RLS | ✅ Working | `supabase/schema.sql` — per-hotel policies, `current_hotel_id()` SECURITY DEFINER |
| MEWS PMS client + sync | ✅ Working (mature, 591 lines) | `lib/mews.ts`, `lib/mews-sync.ts`, `/api/sync` cron |
| Apaleo PMS client (OAuth) | ✅ Working (468 lines) | `lib/apaleo.ts`, `/connect/apaleo/*` |
| Morning briefing generation + email | ✅ Working | `lib/briefing.ts`, `/api/cron/briefing`, Resend |
| Email assistant (classify + draft) | ✅ Working | `lib/email-processor.ts`, `lib/gmail.ts`, `/api/cron/emails` |
| Check-in chasing | ✅ Working | `lib/checkin-chaser.ts`, `/api/cron/checkin` |
| Ask Your Hotel chat (streaming, scoped) | ✅ Working | `app/api/chat/route.ts` — hotel resolved from session, never client |
| Token encryption at rest | ✅ Working | `lib/encryption.ts` (PMS + Gmail tokens) |
| i18n EN / ES / CA | ✅ Working | `dictionaries/{en,es,ca}.json`, `app/[lang]/…` |
| Error monitoring | ✅ Wired (optional) | Sentry `instrumentation*.ts` |
| Design system v2 "Signal" | ✅ Implemented | `FONDA_DESIGN_IDENTITY.md`, `globals.css` |

The security posture of the data layer is notably good for this stage: tenancy is enforced in
the database, not just the app; provisioning deliberately has no client INSERT path; PMS/mailbox
tokens are encrypted and revoked from client `select *`; and the chat route resolves the hotel
from the session rather than trusting a client-supplied id.

### 2.2 What's stubbed, missing, or mismatched

| Gap | Impact | Blocks paid? | Blocks pilot? |
|---|---|---|---|
| **No billing / Stripe** | Can't charge or gate access | ✅ Yes | No (pilots are free) |
| **Legal pages are placeholders** | EU hotels handle guest PII — real Privacy/Terms required | ✅ Yes | ✅ Yes (trust) |
| **Google app not verified** | Non-test users can't connect Gmail | ✅ Yes | No (pilots = test users) |
| **No automated tests / CI** | Every change risks silent regressions for a solo founder | ✅ Yes | ⚠️ Risky |
| **No rate limiting on AI routes** | Cost blow-ups / abuse on `/api/chat`, briefing | ✅ Yes | ⚠️ Risky |
| **Thin mobile/responsive layout** | GMs read the briefing on a phone at 6:45am | ⚠️ Should | ⚠️ Should |
| **Landing lists Outlook / Booking.com / SiteMinder** | Only MEWS/Apaleo/Gmail are real — claims/reality mismatch | ✅ Yes (trust) | ⚠️ Fix copy |
| `arrival_time` never populated by sync | Check-in chaser targets *every* arrival, not just unknown ETAs | No | ⚠️ Note to pilots |
| Room types show raw PMS category ID | Briefing/chat look unpolished | No | ⚠️ Should |
| `rates.currentRates` empty (not cached) | Briefings have occupancy but no rate detail | No | No |
| Chat "draft email" has no recipient | Draft can't be sent, only linked | No | No |
| No product analytics (beyond Sentry) | Hard to learn from pilot behaviour | No | ⚠️ Should |

### 2.3 Code health

Clean, modern, and readable. ~3,400 lines of focused `lib/` logic, sensible separation
(PMS clients normalize to a shared shape via `lib/pms.ts`), server actions for mutations, and
RSC for reads. **No test suite and no CI pipeline** is the main engineering risk: as a solo
founder shipping fast, you have no safety net against breaking the briefing or sync. Vercel Pro
is required for the four sub-daily crons.

### 2.4 UI/UX assessment

The v2 "Signal" design system is coherent and on-brand (Geist type, one navy signal, flat
cards, light-only), and the product correctly hides the AI machinery — briefings render as
editorial prose, not chat bubbles. The two weak spots are **mobile** (only ~27 responsive
utilities across the whole app — the morning-briefing moment is mobile-first) and **onboarding
flow** (PMS connection happens in Settings *after* onboarding rather than inside the wizard,
adding a drop-off point before the user sees any value).

### 2.5 Security review — findings

1. **🔴 URGENT — leaked GitHub Personal Access Token.** A `ghp_…` token is embedded in the git
   remote URL (`git remote -v`). Anyone with that string has push access to the repo. **Rotate
   it today**: revoke at github.com → Settings → Developer settings → Tokens, then reset the
   remote with `git remote set-url origin https://github.com/oriolpelli/fonda.git` and use the
   credential helper or SSH. Then audit the repo for any history that contains it.
2. **🟢 Good — secrets hygiene.** `.env*` is correctly gitignored; only `.env.example` is
   tracked. No secrets in committed code.
3. **🟡 No rate limiting / spend caps** on Anthropic-backed routes. Add per-hotel throttling and
   a hard Anthropic usage cap before opening signups.
4. **🟡 Restricted Gmail scopes** require Google's security assessment for production — plan for
   it (see roadmap), and keep scopes as narrow as possible (`gmail.readonly`, `gmail.send`).
5. **🟢 Tenancy** is enforced at the DB via RLS — strong. Recommend a short pre-paid pen-test /
   security review (the repo ships a `security-review` command — run it on the diff before launch).

---

## 3. Market scan (focused)

### 3.1 The landscape

The hotel-AI market in 2026 is crowded but **clustered around guest-facing communication** —
chatbots, concierge, upsell, and review management. Fonda is deliberately on a **different
axis**: a back-of-house **operations intelligence layer for the GM**, not a guest chatbot. That
is the opening — but two platform-native moves have narrowed it and must be watched.

### 3.2 Competitors

| Player | What it does | Pricing (indep. hotel) | Overlap with Fonda |
|---|---|---|---|
| **HiJiffy** | Guest-messaging AI, 2,500+ hotels, direct-booking focus | ~€4/room/mo; ~€120 base → €200–300 w/ modules | Low — guest-facing, not GM ops |
| **Duve** | Guest-experience platform, enterprise (Accor, OYO); $60M Series B Dec 2025 | Mid/enterprise | Low — scale/guest journey |
| **Asksuite** | Reservation/service chatbot for independents | ~$150–300/mo | Low — guest-facing |
| **Canary** | Guest management, voice AI, fraud/upsell | from ~$99/mo | Low — guest ops/payments |
| **Apaleo Agent Hub** | AI-agent marketplace *inside* Apaleo (launched 2025); 3rd-party "guest briefing" agents exist | Varies | **High & strategic** — same data, native distribution |
| **Mews Digital Assistant / Mews+Claude ops recipes** | PMS-native assistant; community recipes generate arrival briefings | Bundled | **High & strategic** — platform may absorb the use case |

### 3.3 Pricing benchmark

The independent-hotel band sits at roughly **€99–€300/month**, often metered per room (~€4/room).
A flat **€199/month** for a 30–80 room property is competitive and *simple* — below per-room
pricing at scale, and easy to say yes to. Hold the flat price; it's a selling point against
per-room creep.

### 3.4 Fonda's wedge — and the risk to it

**Wedge (real and defensible short-term):**
- **GM-first, not guest-first.** Almost everyone else automates guest chat; Fonda automates the
  GM's morning. Different buyer, different job, less direct competition.
- **Cross-PMS + bundled.** One product spanning MEWS *and* Apaleo, combining briefing + email +
  chasing + ask-anything — competitors are point solutions on one platform.
- **Editorial output quality.** A beautifully written briefing is the demo that sells. This is
  craft competitors with generic chatbot UIs don't prioritize.
- **Boutique aesthetic + EU-local (ES/CA/EN).** Matches the 4-star design-forward ICP.

**The risk — platforms moving in:** Apaleo's **Agent Hub** and Mews' **Digital Assistant** mean
the PMS vendors are productizing exactly the "AI on top of your PMS" idea, with native
distribution and the data already in hand. Fonda's mitigations: (1) be **multi-PMS** so you're
not at any one platform's mercy; (2) own the **email + cross-system** layer the PMS can't see;
(3) compete on **output quality and GM workflow**, not raw data access; (4) consider **listing on
Apaleo Agent Hub as a distribution channel** rather than fighting it. This should shape strategy,
not delay launch — the window is open now.

### 3.5 Positioning recommendation

Lead with the **outcome and the buyer**, never the technology: _"Fonda gives the GM of an
independent hotel their morning back — arrivals, VIPs, issues, and rate signal written and
waiting at 6:30am, plus an inbox that drafts its own replies."_ Keep "AI" out of the product UI
and the demo (your own design principle and outreach script already say this — stay disciplined).

---

## 4. Gap analysis — what needs doing, by category

**UI/UX**
- Make the dashboard + briefing genuinely mobile-responsive (the 6:45am phone moment).
- Pull PMS connection into the onboarding wizard so users reach value without a Settings detour.
- Map room-type IDs to friendly names in briefing/chat output.
- Fix landing-page integration claims (mark Outlook/Booking.com/SiteMinder "coming soon" or remove).
- Add empty/loading/error states polish for first-run (no synced data yet).

**Features**
- Stripe billing: plan, checkout, customer portal, trial→paid gating, dunning.
- Populate `arrival_time` (from PMS or guest replies) so check-in chasing targets unknown ETAs.
- Cache rate plans so briefings carry rate detail, not just occupancy.
- Add a recipient to chat-created email drafts so they're sendable.
- Lightweight product analytics (e.g. PostHog) to watch pilot behaviour.

**Coding / engineering**
- Add a minimal test suite around the money paths: briefing generation, email classify/draft,
  PMS sync normalization, RLS policy checks.
- Add CI (GitHub Actions): typecheck + lint + tests on every push.
- Add rate limiting + per-hotel spend caps on all Anthropic routes; set a hard Anthropic budget.
- Confirm Vercel Pro (sub-daily crons) and alerting on cron failures.

**Security**
- Rotate the leaked GitHub token (today) and scrub history if needed.
- Run the `security-review` command on the pre-launch diff.
- Keep Gmail scopes minimal; document data handling for Google's assessment.
- Consider a basic external review/pen-test before charging.

**Legal / compliance**
- Real Privacy Policy + Terms (GDPR; EU guest PII; sub-processors: Supabase, Anthropic, Google,
  Resend, Vercel, Sentry). A Data Processing Addendum for hotels. Cookie/consent if you add analytics.
- Confirm Anthropic's data-use terms and state "your data is not used to train models."

**Domains / infra**
- Acquire/confirm **fonda.app**; set DNS on Vercel.
- Verify the **Resend sending domain** (briefings@…) — without it, mail only reaches your own inbox.
- Register production OAuth redirect URIs (Google, Apaleo) on the final domain.
- Daily Supabase backups on (Pro); confirm `MEWS_TOKEN_ENCRYPTION_KEY` is stable and backed up.

**Commercial**
- Start Google verification now (long lead time).
- Finalize pricing page + the €199 plan.
- Execute the existing pilot-outreach plan (it's already strong — `PILOT_OUTREACH.md`).

---

## 5. The roadmap

Three stages. Stage 0 is "do not skip / do this first." Stage 1 gets pilots live. Stage 2 is the
hardening track that converts pilots to paying and opens signups. Effort assumes solo + Claude
Code at ~5–6 focused hours/week, with build work compressible if you have more time.

### Stage 0 — Unblock & de-risk (this week)

| # | Task | Why | Done when |
|---|---|---|---|
| 0.1 | **Rotate leaked GitHub token**, reset remote, scrub if in history | Active credential exposure | New token works; old one revoked |
| 0.2 | **Start Google app verification** (consent screen, scopes, privacy URL) | Weeks-long lead; gates public Gmail | Submitted to Google |
| 0.3 | **Acquire fonda.app + verify Resend domain** | Email deliverability; OAuth URIs | Test briefing email lands in a real inbox |
| 0.4 | **Replace Terms/Privacy placeholders** with real GDPR copy | Trust + legal exposure | Lawyer-reviewed or solid template live |
| 0.5 | **Confirm Vercel Pro + crons firing + Sentry alerting** | Reliability foundation | All 4 crons green; alert on failure |

### Stage 1 — Pilot-ready & onboard 3 hotels (Weeks 1–2)

| # | Task | Acceptance criteria |
|---|---|---|
| 1.1 | **Reliability proof on a real/dummy hotel** | Briefing generates + emails daily for 5+ days with no manual intervention; `briefings` table fills |
| 1.2 | **Email-draft quality pass** on a real inbox | Majority of drafts sendable with minor edits; complaints flagged correctly; tone tuned in Settings |
| 1.3 | **Mobile layout for dashboard + briefing** | Briefing is clean and readable on a phone |
| 1.4 | **Fix landing integration claims** | Page only promises what's live |
| 1.5 | **Onboarding flow incl. PMS connect** | New hotel reaches a real briefing in one sitting |
| 1.6 | **Run pilot outreach** (`PILOT_OUTREACH.md`) | 20 hotels contacted; 3 demos booked |
| 1.7 | **Onboard 3 pilots live** (30-min screen-share each) | 3 hotels using Fonda daily; WhatsApp support group live |

### Stage 2 — Hardening → first paying customers (Weeks 3–6)

| # | Task | Acceptance criteria |
|---|---|---|
| 2.1 | **Stripe billing** — plan, checkout, portal, gating | A test card can subscribe to €199/mo and access is gated |
| 2.2 | **Rate limiting + Anthropic spend caps** | Abusive/looping calls are throttled; monthly AI spend capped |
| 2.3 | **Test suite + CI** on the money paths | Green CI on push; briefing/email/sync/RLS covered |
| 2.4 | **Data-quality fixes** — `arrival_time`, room-type names, rate cache | Check-in chasing targets unknown ETAs; briefings show friendly names + rates |
| 2.5 | **Product analytics** | You can see which features pilots actually use |
| 2.6 | **Google verification complete** | Any GM (not just test users) can connect Gmail |
| 2.7 | **Pre-launch security review** (`security-review` cmd + optional external) | No high-severity findings open |
| 2.8 | **2-week pilot survey → ask for the sale** | ≥1 pilot converts to €199/mo; pricing page live; signups open |

### Timeline at a glance

```
Week 0 (now) │ Stage 0: token, Google verify start, domain, legal, infra
Week 1–2     │ Stage 1: reliability proof, mobile, onboarding, sign 3 pilots
Week 3–4     │ Stage 2: Stripe, rate limits, tests/CI, data-quality fixes
Week 5–6     │ Stage 2: analytics, Google verify lands, security review, convert → PAID
```

---

## 6. Launch checklist (condensed)

**Cannot charge until:** Stripe live · real legal pages · Google verification done · rate
limiting + spend caps · backups on · security review clean.

**Cannot pilot until:** token rotated · domain + Resend verified · briefing proven reliable for
days · drafts good enough to send · honest landing copy.

**Fine to be imperfect at launch:** AI edge cases · settings completeness · rate detail in
briefings · advanced reporting. (A product that does the core job reliably is worth paying for;
a pretty one that breaks is not.)

---

## 7. Decisions for you

1. **Legal:** template + self-review, or pay a lawyer for the DPA/Privacy? (EU PII raises the stakes.)
2. **Apaleo Agent Hub:** list there as a distribution channel, or stay standalone for now?
3. **Billing model:** confirm flat €199/mo vs a small per-room component above N rooms.
4. **Pilot price-in date:** hold to "ask at week 2 of pilot," or run pilots longer before charging?
5. **Analytics:** acceptable to add PostHog given the "no PII / privacy-first" positioning?
