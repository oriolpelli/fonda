# Fondas — Build & Readiness Plan → 31 July

_Created 27 July 2026. **Supersedes** `ROADMAP.md`, `EXECUTION_PLAYBOOK.md`, `STAGE0.md`, `F1_FOUNDER_CHECKLIST.md`, and the build half of `LAUNCH_PLAN.md`. Market and pilot work lives in `GO_TO_MARKET.md`._

**Scope:** everything needed for Fondas to be a demo-ready, reliable, installable product by **Friday 31 July**. No outreach, no pilots, no billing.

**Built around your actual constraints:** 4 hours/day · you don't write code — Claude Code does · solo · Vercel Pro · 5 working days (Mon 27 → Fri 31).

---

## 0. How to use this file — read this first

You know hotels, not codebases. That's fine: **your job this week is not to write software.** It's four things, repeated:

1. **Do the dashboard clicks** (Supabase, Sentry, Vercel, Resend) — the "founder block" each day.
2. **Paste a prompt into Claude Code** and let it build.
3. **Check the result like a GM inspecting a room** — does the thing actually work when you use it? That's the acceptance check. You never need to read the code.
4. **Report problems back to Claude Code in plain language.** "The concierge page is empty and it shouldn't be" is a perfectly good bug report.

Section 11 is a glossary and how-to for every technical term and command in this file. When something says "run this in Terminal," §11 tells you exactly what that means. Nothing here assumes you've done it before.

**The one rule that matters:** don't tick a box because Claude Code said it was done. Tick it because you *used the thing and it worked*. That distinction is exactly why the last plan drifted — tasks were marked complete that weren't.

---

## 1. Where the project actually stands (27 July)

I checked this against the actual code, not against the old checklists. The last time any code was written was **13 July** — nine days ago. That gap is what this week closes.

### Built and working

| What | In plain terms |
|---|---|
| **Sidebar + all pages exist** | The skeleton of the app — every page you'd click to is there, though some are empty shells |
| **Hotel Profile & Tone** | Fondas can be told about a specific hotel (rooms, style, tone of voice) and uses that everywhere it writes |
| **Brief delivery settings** | You can set who gets the morning brief, at what hour, and in which language |
| **Upsell fields** | Late checkout, breakfast, transfer, parking with prices — stored, and the chat can already answer questions about them |
| **Landing page + sample brief** | The public website, and a shareable example brief at `fondas.app/es/sample-brief` |
| **Infrastructure** | Domain live, email sending domain verified, Google login set up, all four automated jobs running |

### Not built — this week's work

| Task | In plain terms | Why it matters |
|---|---|---|
| **B5** | Proof it runs unattended | You can't ask a hotel to rely on it if you can't show it ran for days without you |
| **B7** | Split the inbox into "guests staying now" vs "guests arriving later" | The concierge page is currently an empty placeholder. This is your most differentiated feature |
| **B8** | The dashboard — today's numbers and a priority to-do list | First thing a GM sees in a demo. Currently shows an old, pre-redesign version |
| **B9** | Make it work properly on a phone | GMs read the brief at 6:45am on their phone, not at a desk |
| **B10** | Connect-your-PMS inside the signup flow | So a new hotel reaches a real brief in one sitting |
| **B11** | Read arrival times out of guest replies | Nice-to-have. Droppable this week |

### Problems found during the audit

These weren't in any existing document and two of them matter a lot:

| Problem | What it means | Severity |
|---|---|---|
| **No mailbox is connected** | The email assistant — your most differentiated feature — **has never actually run in production.** The job that processes emails reports "0 hotels" because no Gmail account is linked | 🔴 High |
| **Sync found 1,307 bookings but 0 guests** | Guest names may be missing from briefs and drafts, which would make a demo look generic | 🟠 Medium |
| **Email sender is still the test address** | `RESEND_FROM` points at Resend's sandbox, which only delivers to your own address. No brief has ever been sent from your real domain | 🔴 High — fix Monday |
| **No error alerting** | Sentry isn't switched on. If a job fails at 3am, nothing tells you — you'd find out from the hotel | 🔴 High — fix Monday |
| **Supabase on the free plan** | No database backups at all | 🔴 High — fix Monday |
| **Apaleo not connected** | Only MEWS works today. Don't promise Apaleo to anyone | 🟠 Note it |
| **One database serves both test and live** | Your live site runs on what the old docs call the "dev" database. Fine for now — just never run delete/reset commands against it | 🟡 Be careful |

---

## 2. Definition of done — Friday 31 July

Six boxes. Tick them only after using the product yourself.

- [ ] **The four main pages are real, not placeholders** — dashboard, concierge, communications, brief
- [ ] **It ran unattended for 4+ consecutive mornings** and you have a log to prove it
- [ ] **The email assistant has processed a real email end-to-end in production** — a guest email arrived, got classified, and a draft was waiting
- [ ] **A brief in Spanish arrived from your real domain** in an inbox that isn't yours, and wasn't in spam
- [ ] **If something breaks, you find out** — Sentry alerting on, database backups on
- [ ] **You can run the full demo on a laptop and a phone** without hitting an empty page

**Deliberately not this week:** billing, user permissions, analytics page, rate data, automated tests, Apaleo. See §9.

---

## 3. The week, day by day

### Monday 27 July — fix the foundations, start the clock

Nothing else counts until the sender address is real, so this is first.

**Founder block — dashboard clicks, ~50 minutes:**

- [ ] **Fix the email sender.** Change `RESEND_FROM` to `Fondas <briefings@send.fondas.app>` in two places: the `.env.local` file (§11.3) and Vercel (§11.4). Note it's `send.fondas.app`, not `fondas.app` — that's the subdomain you verified.
- [ ] **Upgrade Supabase to Pro** ($25/mo) → then Settings → Database → confirm daily backups are ON. *Why: right now a mistake or corruption would be unrecoverable. Hotel booking data is not something to hold without backups.*
- [ ] **Set up Sentry.** Create a project (choose Next.js), copy the DSN it gives you into `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in both `.env.local` and Vercel. *Why: this is your smoke alarm. Without it, failures are silent.*
- [ ] **Set a monthly spend cap** at console.anthropic.com → Settings → Limits. *Why: a bug in a loop could otherwise run up a large bill overnight.*
- [ ] **Save `MEWS_TOKEN_ENCRYPTION_KEY` to your password manager.** *Why: if this is ever lost, every hotel's PMS and Gmail connection breaks permanently and each one has to reconnect by hand.*
- [ ] **Redeploy** (§11.5) so all of the above actually takes effect.
- [ ] **Confirm the database changes are applied** (§11.6) — two updates were applied by hand and should be verified rather than assumed.

**Build block — B5, the reliability harness.** Prompt in §6.1.

**End of day, you should be able to say:** "I ran one command, it said PASS, and a Spanish brief from my own domain landed in a Gmail account."

---

### Tuesday 28 July — connect a mailbox, split the inbox

- [ ] **Morning ritual** (§5) — takes 60 seconds. Log day 1.
- [ ] **Connect a real Gmail mailbox** to your test hotel via Settings → Integrations in the app. Use a spare Gmail, not your personal one. *This is the most important thing you do all week — it's the first time the email assistant will have ever run for real.*
- [ ] **Build block: B7** — split the inbox. Prompt in §6.2.
- [ ] **Test it like a guest would:** from another email account, send three emails to that mailbox — one pretending to be a guest currently staying, one from someone arriving next month, one complaint. Wait for the job to run (up to 5 minutes), then check they landed on the right pages.

---

### Wednesday 29 July — the dashboard

- [ ] Morning ritual, log day 2
- [ ] **Build block: B8** — the dashboard. Prompt in §6.3. This is the biggest task of the week; if it overruns, it takes Thursday morning too. That's planned for.

---

### Thursday 30 July — phone + signup flow

- [ ] Morning ritual, log day 3
- [ ] **Build block: B9** — make it work on a phone. Prompt in §6.4. Then genuinely open it on your own phone and try to read a brief in bed. That's the test.
- [ ] **Stress pass** (§5) — ~30 minutes deliberately trying to break it
- [ ] If time: start **B10** — the signup flow. Prompt in §6.5.

---

### Friday 31 July — finish and verify

- [ ] Morning ritual, log day 4
- [ ] **Build block: finish B10**
- [ ] **Verification sweep** — paste the prompt in §7 into Claude Code. It audits its own week's work and reports anything claimed but not actually done. Fix what it flags.
- [ ] **Run the full demo twice** — once on the laptop, once on the phone: dashboard → concierge inbox with a draft ready → brief → check-ins → chat. Write down anything that would embarrass you in front of a GM.
- [ ] Tick §2 honestly

**Droppable if the week runs tight:** B11, B12 (analytics), B13 (polish). Protect B5, B7, and B8 above all.

---

## 4. Founder checklist — all infrastructure in one place

Replaces the old `STAGE0.md` and `F1_FOUNDER_CHECKLIST.md`.

| # | Item | Status |
|---|---|---|
| 1 | GitHub token revoked | ✅ 26 Jul |
| 2 | `fondas.app` live on Vercel | ✅ 26 Jul |
| 3 | Resend sending domain verified | ✅ 26 Jul |
| 4 | Google project + Gmail API + login set up | ✅ 26 Jul |
| 5 | Login redirect addresses registered | ✅ 26 Jul |
| 6 | All settings copied into Vercel | ✅ 26 Jul |
| 7 | Vercel Pro; all 4 automated jobs responding | ✅ 26 Jul |
| 8 | Email sender switched to real domain | ⬜ Mon |
| 9 | Supabase Pro + backups on | ⬜ Mon |
| 10 | Sentry alerting live | ⬜ Mon |
| 11 | Anthropic spend cap | ⬜ Mon |
| 12 | Encryption key in password manager | ⬜ Mon |
| 13 | Database updates confirmed applied | ⬜ Mon |
| 14 | Gmail mailbox connected | ⬜ Tue |
| 15 | Apaleo connection | ⬜ Deferred to August — MEWS is enough for first pilots |
| 16 | Company legal details on the site | ⬜ **Blocked — no company yet.** See `GO_TO_MARKET.md` §8 |
| 17 | Google app verification | ⬜ **Blocked on #16.** Not needed for pilots |

---

## 5. Proving it runs without you

This is the thing that turns "a nice demo" into "something a hotel can depend on."

### What you're proving

That Fondas runs a hotel's morning for days on end while you sleep. Both halves: the PMS sync **and** the email assistant.

### The morning ritual — 60 seconds, every day

Open Terminal (§11.1), then:

```bash
cd ~/fonda
npx tsx scripts/reliability-check.ts
```

It prints one line per hotel: PASS or FAIL, with reasons. Then write the day into `RELIABILITY.md`: date · did it sync? · was a brief made? · was it emailed? · were emails processed? · any errors?

If it says FAIL, paste the whole output into Claude Code and say "this failed this morning, what happened and how do we fix it?"

### The stress pass — Thursday, ~30 minutes

Deliberately try to break it. Log what happens:

- Send 5 guest emails quickly, mixed Spanish and English, including one complaint and one late-checkout request — do they all get classified and drafted?
- Send one from an address with no booking — does it cope, or fall over?
- Fire the brief job twice — does it correctly refuse to send the same brief twice?
- Disconnect and reconnect the Gmail account — does reconnecting work?

There's also a known unfixed bug worth testing: if one hotel has a broken timezone setting, it currently stops the brief job for *every* hotel. B5 is meant to fix that — this is where you confirm it did.

### About "5 green days"

Starting Monday, the unattended mornings are the 28th, 29th, 30th, and 31st — that's **4 days by the deadline**, with the fifth on Saturday 1 August.

Don't round that up. Four logged days plus a clean fifth on Saturday is a genuinely strong story to tell a GM. An invented fifth day is the kind of thing that quietly becomes a broken pilot.

---

## 6. The build tasks

### How a build session works

1. Open Claude Code in the project folder
2. Paste the **kickoff prompt** below
3. Paste the **task prompt** for that day
4. Let it work. It will tell you what it changed
5. Run the **acceptance check** — always something you can see or click, never something you have to read code to judge
6. If it's wrong, say so plainly and let it fix it

**Kickoff prompt — paste first, every session:**

```
Read BUILD_PLAN_JULY31.md in the repo root. We are executing the week of 27–31 July.
Today's task is [TASK ID] — I'll paste the task prompt next. Before starting: run
`git status` to confirm the tree is clean, and tell me in one line what [TASK ID]
will change. Rules for the whole session: follow CLAUDE.md and FONDA_DESIGN_IDENTITY.md
strictly; every new table/column inherits the per-hotel RLS pattern; all new UI strings
go into all three dictionaries (en/es/ca); run `npm run lint` before declaring anything
done; never touch .env* or commit secrets. I am not a developer — when you're finished,
explain what changed in plain language and tell me exactly what to click to check it.
```

That last sentence matters. Add it every time.

---

### 6.1 · B5 — Proof it runs unattended (Mon, ~1.5h)

**What this gives you:** a single command that tells you each morning whether Fondas did its job overnight, plus a fix for a known bug that can take down the brief for every hotel at once.

```
Task B5 — build the reliability harness and prepare the unattended run.

Goal: the founder can verify every morning in 60 seconds that Fondas ran overnight
without intervention, covering BOTH the PMS sync and the Gmail email pipeline.

1. Create scripts/reliability-check.ts, runnable via `npx tsx`. For each hotel it
   queries Supabase and prints one PASS/FAIL line with reasons, checking:
   - last successful sync (sync_logs) within the last 2 hours
   - a briefings row for today with delivered_at set (not merely generated)
   - emails processed in the last 24h (count classified/drafted)
   - any cron failures logged in the last 24h
   - Gmail token present and unexpired for hotels that have connected one
   Exit code 0 on all-PASS, 1 on any FAIL. Output must be readable by a non-developer:
   plain sentences, no stack traces unless something failed.

2. Verify the full chain end to end before the run starts: sync → briefing generation →
   Resend send using the real verified sender (RESEND_FROM is now
   Fondas <briefings@send.fondas.app>). Fix anything broken. Confirm idempotency — a
   second cron call the same local day must skip, not re-send.

3. Fix the known timezone bug: Intl.DateTimeFormat throws on an invalid hotels.timezone
   and currently aborts the entire cron tick for all hotels. Wrap the per-hotel date/hour
   helpers in app/api/cron/briefing/route.ts so one bad hotel is skipped with a logged
   error instead of failing everyone.

4. Confirm every cron route logs failures to Sentry with hotel id + stage. SENTRY_DSN is
   now set — verify events actually arrive, don't assume.

5. Investigate why /api/sync returns customers: 0 despite 1,307 reservations. If guest
   names are missing, briefs and drafts will read generically. Report what you find.

6. Write RELIABILITY.md: a table the founder fills in daily (date · sync · brief
   generated · brief emailed · emails processed · errors · notes), plus what a healthy
   run looks like in the Vercel cron logs, described for a non-developer.

Run npm run lint.
```

**Acceptance check (what you do):** run the morning command — it says PASS. Then check your inbox: a brief in Spanish, sent from `@send.fondas.app`, has arrived at an address that isn't your Resend account. Trigger it a second time — no second email arrives.

---

### 6.2 · B7 — Split the inbox (Tue, ~2h)

**What this gives you:** two separate inboxes — guests staying right now (Concierge) and guests arriving later or general enquiries (Communications). It's the feature that makes Fondas look like it understands hotel operations rather than being a generic email tool. Right now the Concierge page is a blank placeholder.

```
Task B7 — implement Phase E of FONDA_REDESIGN_SPEC.md (§2 boundary rule, §3.4, §3.5):
split the existing inbox into Concierge (in-house) and Communications (pre-arrival and
general) by stay phase.

1. Derivation per spec §2: an email is IN-HOUSE when its matched reservation has
   arrival ≤ today ≤ departure (hotel-local dates); otherwise (future reservation or no
   match) it's PRE-ARRIVAL/GENERAL. lib/email-processor.ts already matches emails to
   reservations — expose stay_phase at query time (computed in the page query or a view).
   Do NOT store a value that goes stale as dates pass.
2. /dashboard/concierge: reuse the existing email-inbox.tsx flow (draft → review/edit →
   send) filtered to in-house; complaints/urgent flagged at top; guest and booking
   context inline. Label copy: "In-house guests" (+es/ca).
3. /dashboard/communications: same flow filtered to pre-arrival/general.
   Label: "Before arrival" (+es/ca).
4. Empty states for both ("No in-house guest messages right now"), per
   FONDA_DESIGN_IDENTITY empty-state style, no illustration.
5. Sidebar badges: unhandled count per page, quiet gray, navy only when a complaint is
   waiting.
6. Do NOT fork email-inbox.tsx into two copies — parameterize it.

Note: /dashboard/concierge is currently a 35-line empty-state stub — you are replacing
it, not extending it. i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** send yourself three test emails as described in Tuesday's plan. The one from a current guest appears under Concierge, the future arrival under Communications, and the complaint sits at the top with a navy marker.

---

### 6.3 · B8 — The dashboard (Wed, ~2.5h)

**What this gives you:** the page a GM lands on. Today's occupancy, arrivals, departures, free rooms — plus a ranked to-do list that tells them what actually needs attention. The current page is an older design that predates the redesign.

One deliberate decision: the ADR/rate row will show "rates coming soon" rather than a number. Showing invented rate data to a GM is the fastest way to lose credibility — they'll spot it instantly.

```
Task B8 — implement Phase D of FONDA_REDESIGN_SPEC.md (§3.1): the Dashboard snapshot.

The current app/[lang]/dashboard/page.tsx is the OLD pre-redesign stats page (six stat
cards + occupancy calendar + quick links). Replace it.

1. Top row: occupancy today (%), free rooms, check-ins today, check-outs today — from
   reservations, hotel-local dates. Stat style per design identity (big number, mono
   eyebrow label, 1px dividers).
2. 14-day strip: occupancy per day; ADR line STUBBED — render the row with a quiet
   "rates coming soon" placeholder. The rate cache is an August task; do not build it and
   do not invent numbers.
3. Concierge summary card: up to 3 most relevant in-house items (complaints first, then
   oldest unanswered), linking into /dashboard/concierge. Depends on B7.
4. Priority to-do list — RULES ONLY, no AI calls. Implement lib/todo-rules.ts as a pure,
   unit-testable function producing ranked items from: unanswered complaint (highest),
   VIP arriving today without a room note, >N unconfirmed ETAs for tomorrow, unanswered
   email older than 24h, any day within 14 days with occupancy < 40% (soft date). Each
   item: one sentence + a link to the page where you act on it.
5. Pre-sync empty state: "Connect your PMS to see today" linking to Settings →
   Integrations.
6. Loading skeletons + error boundary per spec §3.1 states.

i18n en/es/ca. Run npm run lint. In your summary, list the exact to-do rules and
thresholds in plain language so the founder can tune them from hospitality experience.
```

**Acceptance check:** open the dashboard. The numbers match what you'd expect from the synced data. The to-do list puts the complaint first. The rates row says "coming soon" rather than showing a number. It loads in about a second.

**This is where your hospitality experience is worth more than mine:** the to-do rules are guesses about what matters at 7am. When Claude Code lists them, change the thresholds to match how a real GM prioritises.

---

### 6.4 · B9 — Make it work on a phone (Thu, ~2h)

**What this gives you:** the 6:45am moment. A GM reads the brief on their phone before leaving the house. If that's awkward, the product doesn't get used, regardless of how good the writing is.

```
Task B9 — mobile/responsive pass. Scope: the GM's 6:45am phone moment — Morning Brief,
Dashboard, Concierge, Communications, and the sidebar. Target: clean at 375px width.

1. Sidebar → slide-over drawer under md: hamburger in a slim top bar (wordmark + menu),
   light scrim per design identity (no dark mode), focus trapped, closes on nav.
2. Morning Brief: single column, body ≥16px, measure ≤60ch, settings panel stacks below
   the brief.
3. Dashboard: stat row wraps 2×2; 14-day strip horizontally scrollable with snap; to-do
   list full width.
4. Concierge/Communications: list → detail becomes stacked navigation on mobile (list
   first, tap into a message, back returns to the list) rather than side-by-side.
5. Audit remaining dashboard pages for anything actually broken (overflow, unusable
   controls) at 375px and fix cheaply — polish only where broken.
6. Test at 375px, 768px, 1280px. No new breakpoint values beyond Tailwind defaults.

Run npm run lint. Summarize per page what changed.
```

**Acceptance check:** on your actual phone, open the site and read a full brief comfortably without pinching or scrolling sideways. Reply to one email start to finish. Open and close the menu. Nothing should run off the edge of the screen.

---

### 6.5 · B10 — Connect-your-PMS during signup (Thu/Fri, ~2h)

**What this gives you:** a new hotel goes from signing up to seeing a real brief in one sitting. Today, PMS connection is buried in Settings, so someone could sign up and never reach the thing that makes it worth using.

You'll be onboarding pilots personally on a screen-share, so this is less urgent than B7 or B8 — but it's what makes the first ten minutes feel professional.

```
Task B10 — move PMS connection into the onboarding wizard. Goal: a new hotel reaches a
real morning brief in one sitting, without discovering Settings.

app/[lang]/onboarding is currently a single 66-line page — turn it into a stepper.

1. Steps: (1) Hotel basics [exists] → (2) Connect your PMS → (3) First sync → (4) Done.
   Step 2: reuse mews-connection-form.tsx and apaleo-connection-card.tsx; include a
   clearly worded "skip for now" path.
   Step 3: trigger an initial sync, show progress, then a real preview ("We found 214
   upcoming reservations · your first brief arrives tomorrow at 7:00") with a "generate a
   preview brief now" button that runs generation immediately, so the wow moment happens
   during onboarding.
   Step 4: point to the Dashboard; mention Gmail connect as the next optional step.
2. Keep all provisioning server-side via the existing provision_hotel RPC — no client
   INSERTs (CLAUDE.md rule).
3. If PMS was skipped: dashboard shows the B8 pre-sync empty state, and onboarding is
   resumable from a banner ("Finish setup — connect your PMS").
4. Audit the first-run experience of every dashboard page with zero synced data; make
   each empty state say what the page will show + the one action to take.

i18n en/es/ca. Run npm run lint.
```

**Acceptance check:** sign up with a brand new email address, as if you were a hotel. You should reach a generated preview brief without ever visiting Settings. If you get lost or stuck, so will a GM.

---

## 7. Friday verification sweep

Before ticking anything, paste this into Claude Code. It audits its own week and tells you what's actually true — this is the safeguard against the drift that happened last time.

```
Weekly audit. Read BUILD_PLAN_JULY31.md and verify the tasks marked done this week are
actually true in the codebase. For each: confirm its acceptance check would pass
(inspect code, run lint, run scripts/reliability-check.ts, confirm migrations are in
schema.sql). Report a short table — task · status · gap · fix effort — covering:
1. Anything claimed done that isn't, with the specific gap.
2. Drift from FONDA_DESIGN_IDENTITY.md or CLAUDE.md introduced this week: hard-coded
   hex, missing es/ca strings, client-side service-role usage, RLS gaps on new tables.
3. Confirm no secrets are staged: git log -p over this week's commits for anything
   resembling a key.
Write the report in plain language — I'm not a developer. For anything that's wrong,
tell me whether it blocks a demo or is cosmetic.
```

---

## 8. Risks this week

| Risk | What to do |
|---|---|
| **The reliability run finds real bugs** — that's its purpose | Thursday afternoon is deliberately light. Bugs beat features: fix them before starting B10. |
| **B8 overruns** — it's the biggest task | Thursday morning is the planned overflow. If it eats that too, cut B9 down to just the brief and the menu. |
| **Gmail connection fails in production** | It's scheduled Tuesday morning precisely so there are three days to fix it. Don't leave it to Friday. |
| **4 hours/day is tight if anything goes wrong** | B11, B12, B13 are genuinely droppable. Protect B5, B7, B8. |
| **You get stuck on a technical step** | §11 covers every command in this file. Beyond that: paste the exact error into Claude Code and describe what you were trying to do. |
| **Claude Code says done but it isn't** | This already happened once — B6 was built but never ticked, and several tasks were assumed done that weren't. The acceptance checks and §7 exist for this. |
| **Sandbox data makes demos feel fake** | Before real demos, seed the test hotel with realistic Spanish guest names. Half an hour, big credibility difference. |

---

## 9. Deliberately deferred to August

Decided and dated, not forgotten:

| Item | Why it waits |
|---|---|
| Stripe billing | Nobody to charge until a pilot converts |
| Rate limiting / per-hotel spend caps | The global Anthropic cap covers July's risk |
| Automated tests + CI | Real risk, but doesn't block a pilot |
| Apaleo | MEWS is enough for the first hotels |
| User permissions (Phase G) | Pilots are single-GM |
| Rate data (Phase H), chat page (Phase I) | No history to show yet; the chat widget already works |
| Pre-arrival upsell drafts | The highest-value August feature — uses the fields B6 already built |
| Google app verification | Blocked on having a company; test users cover pilots |

---

## 10. Which documents still matter

| Document | Status |
|---|---|
| **`BUILD_PLAN_JULY31.md`** (this) | ✅ The only build plan |
| **`GO_TO_MARKET.md`** | ✅ Outreach, pilots, launch, billing |
| `ROADMAP.md` | ⚠️ Superseded — keep for competitive reasoning and August priorities |
| `EXECUTION_PLAYBOOK.md` | ⚠️ Superseded — prompts moved here |
| `STAGE0.md`, `F1_FOUNDER_CHECKLIST.md` | ⚠️ Superseded — merged into §4 |
| `LAUNCH_PLAN.md` | ⚠️ Split between this and `GO_TO_MARKET.md` |
| `PILOT_OUTREACH.md` | ⚠️ Superseded by `GO_TO_MARKET.md` |
| `NETLIFY_MIGRATION.md` | ❌ **Dead — staying on Vercel.** Delete it |
| `B1_VERIFY_RUNBOOK.md` | ✅ Keep — still the correct brief-delivery test |
| `RUNBOOK.md` | ✅ Keep — ops reference |
| Design docs (`FONDA_DESIGN_IDENTITY.md` etc.) | ✅ Keep — design source of truth |
| `MARKET_STRATEGY.md`, `COMPETITOR_LANDSCAPE.md` | ✅ Keep — strategy reference |

---

## 11. Reference — every technical thing in this file, explained

### 11.1 Opening Terminal and getting to your project

Terminal is the black window where you type commands. Press `Cmd + Space`, type "Terminal", press Enter.

Every session, first tell it where your project is:

```bash
cd ~/fonda
```

`cd` means "change directory". `~` means your home folder. If that errors, your project is somewhere else — find the folder in Finder, then drag it onto the Terminal window after typing `cd ` (with a space), and it'll fill in the path.

### 11.2 Vocabulary

| Term | What it means |
|---|---|
| **Cron / cron job** | A task that runs automatically on a schedule. You have four: syncing the PMS, sending briefs, processing emails, chasing check-ins |
| **Env var** (environment variable) | A setting stored outside the code — passwords, API keys, addresses. Lives in `.env.local` on your machine and in Vercel's dashboard for the live site |
| **Deploy** | Publishing your code to the live site. Until you deploy, changes only exist on your computer |
| **Migration** | A change to the database's structure — adding a column, a table. Numbered files in `supabase/migrations/` |
| **Lint** | An automatic style and error check. "Lint clean" means no obvious mistakes |
| **Repo / repository** | Your project folder, tracked by Git |
| **Commit** | A saved checkpoint of your changes |
| **RLS** (row-level security) | The database rule that stops Hotel A ever seeing Hotel B's data. Critical — every new table must have it |
| **Stub / placeholder** | A page that exists but does nothing yet |
| **End-to-end** | Tested through the whole chain, not just one piece |
| **Idempotent** | Running it twice has the same effect as running it once — e.g. the brief job won't send two briefs on the same day |
| **DSN** | The address Sentry gives you so errors get reported to your account |

### 11.3 Editing `.env.local`

This file holds your passwords and keys. It's on your computer only and is never uploaded to GitHub.

It's a hidden file, so in Finder press `Cmd + Shift + .` to reveal hidden files, then open `.env.local` from your project folder in any text editor.

Each line is `NAME=value`. Change only what's after the `=`. No quotes, no spaces around the `=`. Save when done.

**Easier option:** paste the value to me in chat and I'll edit the file directly.

### 11.4 Adding settings in Vercel

`.env.local` only affects your computer. The live site reads its settings from Vercel.

Vercel → your project → **Settings** → **Environment Variables** → add or edit → make sure **Production** and **Preview** are both ticked → Save → then redeploy (§11.5).

**Watch out:** this is exactly where the cron failure happened on the 26th — an extra invisible character got pasted into `CRON_SECRET` and every job returned "Unauthorized" for hours. When pasting, select carefully and don't drag past the end of the value.

### 11.5 Redeploying

Settings changes don't apply until you redeploy. Either:

- **Vercel dashboard:** Deployments → `⋯` on the most recent → Redeploy, or
- **Terminal:**
  ```bash
  cd ~/fonda
  git commit --allow-empty -m "chore: redeploy"
  git push
  ```

### 11.6 Checking database changes applied

Two structural updates (0012 and 0013) were applied by hand, so verify rather than assume:

1. supabase.com → your project → **SQL Editor** → New query
2. Open `supabase/APPLY_0012.sql` from your project folder, copy all of it, paste, Run
3. The check at the bottom should return two rows (`brief_recipients`, `brief_send_hour`)
4. Repeat with `APPLY_0013.sql`

These are safe to run twice — they're written to skip anything already applied.

### 11.7 Testing the automated jobs by hand

To check a job works without waiting for its schedule:

```bash
cd ~/fonda
SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
curl -i -H "Authorization: Bearer $SECRET" https://fondas.app/api/cron/briefing
```

The first line of the response is what matters:

- **`HTTP/2 200`** — worked
- **`HTTP/2 401`** — the secret in Vercel doesn't match the one on your machine (see §11.4)
- **`HTTP/2 500`** — something broke; paste the whole response into Claude Code

The four jobs are `/api/sync`, `/api/cron/briefing`, `/api/cron/emails`, `/api/cron/checkin`.

### 11.8 When something breaks

You don't need to diagnose anything. Paste into Claude Code:

1. What you were trying to do
2. What you expected
3. What actually happened, with the exact error text copied in full

"I ran the reliability check this morning and it said FAIL on the briefing, here's the output: [paste]" is a complete and useful bug report.

### 11.9 What "good" looks like each morning

- Reliability check prints PASS
- A brief is in your inbox, in the right language, reading like a competent night manager's handover
- Vercel → your project → Cron Jobs shows recent runs with status 200
- No new Sentry alerts

If all four hold for four consecutive mornings, you have something a hotel can genuinely depend on — and that, more than any feature, is what you're selling.
