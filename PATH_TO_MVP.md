# Fondas — Path to a Market-Ready MVP

_Created 31 July 2026. Picks up exactly where `BUILD_PLAN_JULY31.md` stopped being
ticked, and folds in every open item from `LAUNCH_PUNCHLIST.md` (the website
redesign). This is the single list to work through — top to bottom — until Fondas is
a product you can put in front of a hotel without apologising for anything._

**Scope:** finish the build, ship the redesign safely, prove it runs, and rehearse the
demo. This is the last mile to a market-ready product. It stops at "ready to show and
sell." The actual outreach, pilots, and billing live in `GO_TO_MARKET.md` and start
*after* this document is done.

**Your constraints, unchanged:** ~4 hours/day · you don't write code — Claude Code
does · solo · Vercel Pro.

---

## 0. How to use this file — read this first

Nothing about your job has changed since the last plan. Four moves, repeated:

1. **Do the dashboard clicks** — the small settings tasks in Vercel, Supabase, etc.
2. **Paste a prompt into Claude Code** and let it build.
3. **Check the result like a GM inspecting a room** — did the thing actually work when
   *you* used it? That's the acceptance check. You never read the code.
4. **Report problems back in plain language.** "The pricing page still shows the fake
   testimonial" is a perfect bug report.

**The one rule that matters, again:** don't tick a box because Claude Code said it was
done. Tick it because you *used the thing and it worked.* That single discipline is
what keeps this from drifting the way the last plan did — B8 shipped but was never
ticked, and Wednesday and Thursday quietly became redesign days with nothing logged.

**Kickoff prompt — paste this first, every Claude Code session:**

```
Read PATH_TO_MVP.md and BUILD_PLAN_JULY31.md in the repo root. We are finishing the
MVP. Today's task is [TASK ID] — I'll paste the task prompt next. Before starting: run
`git status` to confirm the tree is clean, and tell me in one line what [TASK ID] will
change. Rules for the whole session: follow CLAUDE.md and FONDA_DESIGN_IDENTITY.md
strictly; every new table/column inherits the per-hotel RLS pattern; all new UI strings
go into all three dictionaries (en/es/ca); run `npm run lint` before declaring anything
done; never touch .env* or commit secrets. I am not a developer — when you're finished,
explain what changed in plain language and tell me exactly what to click to check it.
```

---

## 1. Where you actually are (31 July)

Reconstructed from the git history, because the plan file wasn't updated past Tuesday.

**Done and working:**

| Task | What it is | Evidence |
|---|---|---|
| **B5** | Reliability harness — the one-command morning check | Committed 27 Jul |
| **B7.1** | Single guest inbox with urgency ranking + email-classifier fix | Committed 28 Jul |
| **B8** | Dashboard snapshot (occupancy, arrivals, to-do list) | Committed 28 Jul night — **shipped but never ticked in the old plan** |

**The big open thing:** the entire "Signal" website redesign is sitting **uncommitted**
in your working tree — hero parallax, vignettes, OG image, SEO, marketing mobile nav,
legal pages, split-screen onboarding. There are **no commits on 29 or 30 July**; that's
where the redesign time went. Step 1 below is to save it before anything else.

**Slipped and still open:**

- **B9** — dashboard mobile pass (the sidebar still has no mobile drawer)
- **B10** — PMS connection inside the onboarding flow
- **Friday verification sweep** and the **full demo rehearsal**
- **`RELIABILITY.md`** — the daily log is empty for all four days; the "green mornings"
  proof has never been written down
- **Every item in `LAUNCH_PUNCHLIST.md`** — the redesign shipped placeholders on
  purpose so nothing provisional goes live by accident

---

## 2. Definition of done — a market-ready MVP

Tick these only after using the product yourself. When all are true, you can demo and
onboard a hotel without hitting anything fake or broken.

**Product works end to end**

- [ ] The four main pages are real, not placeholders — dashboard, guest inbox, brief, check-ins
- [ ] It ran unattended for 4+ consecutive mornings and you have the log to prove it
- [x] The email assistant processed a real guest email end to end in production ✅ 28 Jul
- [ ] A Spanish brief arrived from your real domain, in an inbox that isn't yours, not in spam
- [x] If something breaks you find out — Sentry on, backups on ✅ 27 Jul
- [ ] You can run the whole demo on a laptop **and** a phone without hitting an empty page
- [ ] A brand-new hotel can sign up and reach a real preview brief in one sitting (B10)

**The public website is real, not provisional**

- [ ] No fake testimonials, no "Placeholder" chips, no dashed logo outlines, no "to confirm" markers
- [ ] The newsletter either collects addresses properly (form + double opt-in + privacy line) or is removed
- [ ] `/en`, `/es`, `/ca` all build clean and render fully styled
- [ ] Every visible link goes somewhere real (no `href="#"` dead links)
- [ ] `hello@fondas.app` is monitored — it's the contact on the site
- [ ] `NEXT_PUBLIC_SITE_URL` is set per-environment so non-prod deploys don't poison SEO

**Deliberately still not in scope:** billing, user permissions, analytics page, live rate
data, Apaleo, WhatsApp. See `BUILD_PLAN_JULY31.md` §9.

---

## 3. The sequence — work top to bottom

Five blocks. Roughly a session each, but do them in order — later blocks assume the
earlier ones are done. Estimated hours are generous; some will be faster.

### Block A — Save your work and prove it runs (~1h, do this first)

Everything else risks the uncommitted redesign. Lock it in, then re-establish the
reliability habit.

**A1 · Commit the redesign.** Paste the kickoff prompt with `[TASK ID] = A1`, then:

```
Task A1 — the Signal website redesign is currently all uncommitted. Commit it in
logical chunks with descriptive messages (e.g. hero + parallax, vignettes, SEO/OG/
sitemap, legal pages, onboarding split-screen, dictionaries). Do NOT stage .env* or
anything with a secret — run `git status` and show me the grouping before committing.
Run `npm run lint` first and fix anything it reports. Do not change behaviour; this is
purely saving existing work.
```

*Acceptance check:* `git status` comes back clean, and `git log` shows a handful of new
commits describing the redesign. Nothing about the live site should change yet.

**A2 · Morning ritual + backfill the log.** In Terminal:

```bash
cd ~/fonda
npm run reliability-check
```

It should print PASS. Then open `RELIABILITY.md` and fill in the daily table **honestly**
for 28–31 July from what actually ran (check Vercel → Cron Jobs and your inbox if you're
unsure). Four real green mornings is a genuinely strong story. An invented one is how a
pilot quietly breaks. If today shows FAIL, paste the whole output into Claude Code before
moving on.

*Acceptance check:* the check says PASS, and the log has real entries — not blanks, not guesses.

---

### Block B — Ship the redesign safely (~3h · the 🔴 must-fix punchlist)

Nothing provisional can go live. Do all five, then deploy the redesign as one clean release.

**B-1 · Replace the fake social proof.** Paste kickoff (`[TASK ID] = punchlist social proof`), then:

```
Task — replace the placeholder social proof on the landing page with real content.
`socialProof.*` in dictionaries/{en,es,ca}.json are placeholder quotes, names ("Name to
confirm"), properties and metrics. I will give you the real design-partner quotes and
hotel names to paste in. Once they're in: remove the visible "Placeholder" chip, the
`border-dashed` logo outlines, and the `°` / "to confirm" markers in app/[lang]/page.tsx,
and swap the 5 placeholder logo chips for the real hotel logos I provide. If I don't yet
have real quotes for a slot, remove that slot entirely rather than shipping a fake one.
i18n en/es/ca. Run npm run lint.
```

> **Your input needed:** you have to supply the real quotes, names, and logos — or tell
> Claude Code to cut the section down to only what's real. Do not ship a placeholder.

*Acceptance check:* load `/en`, `/es`, `/ca` — every testimonial is real, no "Placeholder"
badge, no dashed outlines, no `°` marks anywhere.

**B-2 · Make the newsletter real (or remove it).** The footer capture has no form and a
dummy button — it collects nothing today.

```
Task — the footer newsletter capture is inert (no <form>, a type="button" submit).
Make it real: a server action that stores the address, double opt-in (send a confirm
email, only store as subscribed after they click), and a visible privacy line — this is
marketing PII under CLAUDE.md. Store subscribers in a Supabase table with the per-hotel
RLS pattern where applicable. If double opt-in is too much for now, instead remove the
newsletter block cleanly rather than leaving a dead field. i18n en/es/ca. Run npm run lint.
```

*Acceptance check:* enter your own email → you get a confirmation email → after clicking,
you're subscribed. The privacy line is visible next to the field.

**B-3 · Set `NEXT_PUBLIC_SITE_URL` per environment (dashboard clicks, no code).**
In Vercel → your project → Settings → Environment Variables:

- **Production:** `NEXT_PUBLIC_SITE_URL = https://fondas.app`
- **Preview:** set it to the preview URL (or leave Vercel's per-deploy URL) — the point is
  it must **not** say `https://fondas.app` on non-prod.

Then redeploy. *Why:* without this, preview/staging pages emit canonical URLs, hreflang,
and JSON-LD IDs all pointing at production — which confuses Google about which site is real.

*Acceptance check:* on a preview deploy, view source and confirm the canonical/`og:url`
points at the preview domain, not production.

**B-4 · Confirm `hello@fondas.app` is monitored (dashboard clicks).** It's the "Talk to
us" address on pricing and the contact in the site's structured data. Send it a test email
and make sure it lands somewhere you'll actually read.

*Acceptance check:* your test email to `hello@fondas.app` arrives in a mailbox you check daily.

**B-5 · Real build + eyeball all three locales.** In Terminal:

```bash
cd ~/fonda
npm run build
```

It must finish with no errors. Then open `/en`, `/es`, and `/ca` and confirm each renders
fully styled: hero, illustration, social proof, comparison table, footer, mobile menu,
pricing. This is the gate for the whole redesign.

*Acceptance check:* build is clean and all three languages look right end to end. **Now
deploy the redesign** (this is the release). Load the live site in all three languages one
more time.

---

### Block C — Finish the product (~4h · the slipped build tasks)

These two make the difference between "a nice website" and "a product a GM can use." Do
**B9 first** — a GM reads the brief on a phone at 6:45am, and that moment is the whole
pitch.

**C1 · B9 — make the app work on a phone.** Prompt (from `BUILD_PLAN_JULY31.md` §6.4):

```
Task B9 — mobile/responsive pass. Scope: the GM's 6:45am phone moment — Morning Brief,
Dashboard, the guest inbox, and the sidebar. Target: clean at 375px width.

1. Sidebar → slide-over drawer under md: hamburger in a slim top bar (wordmark + menu),
   light scrim per design identity (no dark mode), focus trapped, closes on nav.
2. Morning Brief: single column, body >=16px, measure <=60ch, settings panel stacks below.
3. Dashboard: stat row wraps 2x2; 14-day strip horizontally scrollable with snap; to-do
   list full width.
4. Guest inbox: list -> detail becomes stacked navigation on mobile (list first, tap into
   a message, back returns to the list) rather than side-by-side.
5. Audit remaining dashboard pages for anything actually broken at 375px and fix cheaply.
6. Test at 375px, 768px, 1280px. No new breakpoint values beyond Tailwind defaults.

Run npm run lint. Summarize per page what changed.
```

*Acceptance check:* on your **actual phone**, open the site, read a full brief without
pinching or sideways-scrolling, reply to one email start to finish, and open/close the
menu. Nothing runs off the edge.

**C2 · B10 — connect-your-PMS during signup.** Prompt (from §6.5, with the redesign note
folded in):

```
Task B10 — move PMS connection into the onboarding wizard. Goal: a new hotel reaches a
real morning brief in one sitting, without discovering Settings. Keep the split-screen
brand panel the redesign already added to onboarding.

app/[lang]/onboarding is currently a single page — turn it into a stepper.
1. Steps: (1) Hotel basics [exists] -> (2) Connect your PMS -> (3) First sync -> (4) Done.
   Step 2: reuse mews-connection-form.tsx and apaleo-connection-card.tsx; include a clearly
   worded "skip for now" path.
   Step 3: trigger an initial sync, show progress, then a real preview ("We found 214
   upcoming reservations - your first brief arrives tomorrow at 7:00") with a "generate a
   preview brief now" button that runs generation immediately.
   Step 4: point to the Dashboard; mention Gmail connect as the next optional step (this is
   the redesign's "Connect your PMS & inbox" CTA).
2. Keep all provisioning server-side via the existing provision_hotel RPC - no client INSERTs.
3. If PMS was skipped: dashboard shows the pre-sync empty state, and onboarding is resumable
   from a banner ("Finish setup - connect your PMS").
4. Audit the first-run experience of every dashboard page with zero synced data; make each
   empty state say what the page will show + the one action to take.

i18n en/es/ca. Run npm run lint.
```

*Acceptance check:* sign up with a brand-new email as if you were a hotel — you reach a
generated preview brief without ever visiting Settings. If you get lost, so will a GM.

---

### Block D — Verify and rehearse (~2h · the finish line)

**D1 · Verification sweep.** Paste this into Claude Code (from §7). It audits its own work
and tells you what's actually true — the safeguard against drift.

```
Weekly audit. Read PATH_TO_MVP.md and BUILD_PLAN_JULY31.md and verify the tasks marked
done are actually true in the codebase. For each: confirm its acceptance check would pass
(inspect code, run lint, run scripts/reliability-check.ts, confirm migrations are in
schema.sql). Report a short table - task | status | gap | fix effort - covering:
1. Anything claimed done that isn't, with the specific gap.
2. Drift from FONDA_DESIGN_IDENTITY.md or CLAUDE.md: hard-coded hex, missing es/ca strings,
   client-side service-role usage, RLS gaps on new tables.
3. Confirm no secrets are staged: git log -p over this week's commits for anything
   resembling a key.
Write the report in plain language - I'm not a developer. For anything wrong, tell me
whether it blocks a demo or is cosmetic.
```

Fix anything it flags that blocks a demo. Cosmetic items can wait.

**D2 · Run the full demo twice — laptop, then phone.** Walk the real path a GM will see:
dashboard → guest inbox with a draft ready → morning brief → check-ins → chat. Write down
anything that would embarrass you in front of a GM, and fix it. Do it once on the laptop,
once on your phone.

*Acceptance check:* both run-throughs complete with no empty page, no fake data, no broken
layout. When this passes, tick §2 honestly — **you have a market-ready MVP.**

---

### Block E — Polish before you start selling (🟡 should-do-soon, then 🟢 later)

Not blockers for the MVP, but do the 🟡 items before your first real demos — they're what
makes it feel finished. The 🟢 items can wait until after your first pilot conversations.

**🟡 Should do soon**

- [ ] **Wire the footer's dead links.** ~9 are still `href="#"` with a `°` marker. Point
  them at real pages as they ship: About, Careers, Contact, Press, Help centre, Changelog,
  Cookies, Security, Integrations. A simple **`/contact` page** also gives the pricing CTA a
  real home.
- [ ] **Keep the price in one place.** `COMPANY.priceMonthly` feeds the marketing figure,
  but the Stripe price and the `COMPANY.price` prose are hand-synced — update all three
  together whenever the price changes so the site never contradicts itself.
- [ ] **Real product screenshots in the feature bento.** The vignettes are decorative — swap
  in real cropped screenshots of each surface, especially check-in and chat (which have no
  showcase band today).
- [ ] **Real Morning-Brief screenshot** in the product showcase, replacing the hand-built
  window mockup. An optional 2-minute demo video would strengthen it.
- [ ] **Reduced-motion check** on the parallax hero — confirm it renders fully static under
  `prefers-reduced-motion: reduce` (no transforms, full-opacity text).
- [ ] **Hero final QA** — "The admin runs itself." stays one line on desktop, the villa is
  ~70vw and wider than the phrases, and the navy headline line stays legible over the
  illustration (deepen the scrim if it fights the pool).
- [ ] **OG image spot-check** — confirm the 1200×630 card renders in Geist on a real
  Slack/X unfurl for all three locales.

**🟢 Nice to have / after first pilots**

- [ ] Auth verify-email step: add "Open Gmail / Outlook" provider shortcuts.
- [ ] Review the comparison-table copy ("Late arrivals surface in the brief, not at the
  door") — it's placeholder wording, make it yours.
- [ ] Site IA for SEO: real `/features`, `/customers`, `/resources` pages so the broader
  "AI software for hotels" positioning has room.
- [ ] Confirm Sentry is configured for production via `instrumentation.ts` (per
  `next.config.ts`) — alerting is already live; this is a belt-and-braces check.

---

## 4. When you're done

When every box in §2 is ticked — honestly, by using the product yourself — Fondas is a
market-ready MVP. At that point close this file and open `GO_TO_MARKET.md`: outreach,
pilots, and billing start there. Don't start selling before §2 is green; the fastest way
to lose a pilot is to demo something that breaks.

---

## 5. Reference

Every technical term, command, and dashboard how-to used above is explained in
`BUILD_PLAN_JULY31.md` §11 — opening Terminal, editing `.env.local`, adding Vercel
settings, redeploying, and what to paste when something breaks. Nothing here assumes you've
done any of it before.
