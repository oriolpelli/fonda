# Wednesday 29 July — Start here

_A plain-language plan for the day. Read the first section, then work top to bottom. Nothing here assumes you can read code._

---

## What today is about (read this first)

Yesterday you turned on the hard part — the email assistant now works in production, sorting and drafting real guest mail with the right urgency notes. Today is more visible and, in some ways, easier: **the dashboard — the page a GM opens first thing in the morning.**

This is the screen that decides a demo in the first ten seconds. A GM should land on it and immediately see the shape of their day: how full the hotel is today, who's checking in and out, how many rooms are free — and, underneath, a short ranked list of *what actually needs their attention right now*. Not a wall of numbers; a page that answers "what do I do first?"

One change from the original plan, carried over from yesterday's decision: there's no separate Concierge inbox anymore, so the dashboard's guest-email card becomes a **"needs a reply" card**, fed by the same urgency rules you just built (complaints first, then guests arriving today, then whoever's waited longest). It links straight into Communications.

Two honest notes so nothing surprises you:

- This is the **biggest single build of the week**. If it runs long, that's expected — Thursday morning is deliberately left free as overflow. Don't rush it.
- The rate/ADR row will say **"rates coming soon"** rather than a number. That's on purpose. Showing invented rate data to a GM is the fastest way to lose their trust — they'll spot a wrong ADR instantly. Real rate data is an August task.

**By the end of today you want to be able to say:** "I opened the dashboard as if I were the GM, the numbers matched what I know is in the system, and the to-do list put the right thing first."

---

## The order of the day

1. **Morning check** (60 seconds) — confirm last night ran, log day 2
2. **Check yesterday's brief landed** — from your real domain, not spam
3. **Build the dashboard with Claude Code** (~2.5 hours) — task B8
4. **Check it like a GM** — open it, see if it tells you what to do first

---

## 1. Morning check — 60 seconds

Open Terminal, then:

```bash
cd ~/fonda
npm run reliability-check
```

**Today it should finally say PASS.** Yesterday's FAIL was two things — the stale errors from Monday's fixes, and the brief failing on the wrong sender domain — both now resolved and aged out of the 24-hour window. If it's green, you've got your first genuinely clean unattended morning. If it still shows a FAIL, copy the whole output into Claude Code with "this failed this morning, what happened?" — the reasons are now honest (yesterday's classifier fix means the cron can no longer report false success).

Then log the day in `RELIABILITY.md` — date, did it sync, was a brief made and emailed, were emails processed, any errors. This is **day 2** of the run you're building toward the pilot story.

---

## 2. Check yesterday's brief actually landed

Glance at whichever inbox your brief recipient is set to. Yesterday's 07:00 brief was the first sent from your real domain (`fondas.app`) after the sender fix. Confirm it arrived, in the right language, and **isn't sitting in Junk**. If it's in Junk, mark it "Not Junk" — that teaches the mail provider your domain is legitimate, which matters before real GMs receive briefs.

---

## 3. Build the dashboard — task B8

Open Claude Code in your project folder and paste these two prompts in order.

**First — the kickoff prompt (paste this first):**

```
Read BUILD_PLAN_JULY31.md in the repo root. We are executing the week of 27–31 July.
Today's task is B8 — I'll paste the task prompt next. Before starting: run `git status`
to confirm the tree is clean, and tell me in one line what B8 will change. Rules for the
whole session: follow CLAUDE.md and FONDA_DESIGN_IDENTITY.md strictly; every new
table/column inherits the per-hotel RLS pattern; all new UI strings go into all three
dictionaries (en/es/ca); run `npm run lint` before declaring anything done; never touch
.env* or commit secrets. IMPORTANT lesson from yesterday: never import a function from a
"use client" module into a server component — put any shared helper in a neutral module
(see lib/inbox-sort.ts, lib/gmail-status.ts). And "it builds" is not "it works": verify
the page actually renders for a signed-in user, not just that lint/build pass. I am not a
developer — when you're finished, explain what changed in plain language and tell me
exactly what to click to check it.
```

**Then — the B8 task prompt (this is the original, with the guest-email card updated for the single-inbox decision):**

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
3. "Needs a reply" card (this REPLACES the old Concierge summary — there is no separate
   Concierge inbox now, per B7.1): the top 3 unanswered guest emails ranked by the B7.1
   urgency rules, each linking into /dashboard/communications. Reuse lib/inbox.ts and
   lib/email-urgency.ts (complaints first, then arriving today, then longest-waiting) —
   do not re-derive urgency.
4. Priority to-do list — RULES ONLY, no AI calls. Implement lib/todo-rules.ts as a pure,
   unit-testable function producing ranked items from: unanswered complaint (highest),
   VIP arriving today without a room note, >N unconfirmed ETAs for tomorrow, unanswered
   email older than 24h, any day within 14 days with occupancy < 40% (soft date). Each
   item: one sentence + a link to the page where you act on it. Where a rule overlaps the
   B7.1 urgency logic, share the code rather than duplicating the thresholds.
5. Pre-sync empty state: "Connect your PMS to see today" linking to Settings → Integrations.
6. Loading skeletons + error boundary per spec §3.1 states.

i18n en/es/ca. Run npm run lint, and verify the page renders for a signed-in user (not
just that it builds). In your summary, list the exact to-do rules and thresholds in plain
language so I can tune them from hospitality experience.
```

In plain terms: this replaces the old stats page with the real GM landing page — the day's numbers up top, a two-week occupancy strip (with rates honestly marked "coming soon"), a card showing the guest emails that most need answering, and a ranked to-do list that tells the GM what to handle first.

---

## 4. Check it like a GM

When Claude Code says it's done, **open the dashboard yourself and look** — this is the acceptance check, and after yesterday you know why it matters more than any automated pass:

- The numbers up top match what you'd expect from the synced data (occupancy, check-ins, check-outs, free rooms).
- The **to-do list puts the right thing first** — an unanswered complaint should sit above a half-empty day next week.
- The **"needs a reply" card** shows your test emails, complaint on top, linking into Communications.
- The rates row says **"coming soon"**, not a number.
- It **loads in about a second**, and — importantly — it loads while you're **signed in**, not just as a build check.

**This is where your hospitality experience beats mine.** When Claude Code lists the exact to-do rules and thresholds, read them like a GM at 7am and change them to match how you'd actually prioritise. For example: is a day next week at 38% occupancy really worth a to-do item, or is that noise? Is one unconfirmed arrival tomorrow worth flagging, or does it take three? Tell Claude Code your numbers.

---

## Today is done when

- The dashboard is the real GM landing page, not the old stats screen
- Its numbers match the synced data, and it loads fast while signed in
- The to-do list and "needs a reply" card surface the right things in the right order
- Day 2 is logged, and yesterday's brief is confirmed in the inbox (not Junk)

If B8 overruns into Thursday morning, that's fine — it's planned for. Protect getting it *right* over getting it done by lunch.

---

## If you get stuck on anything

You don't need to diagnose it. Paste into Claude Code: what you were trying to do, what you expected, and exactly what happened (with any error text copied in full). And remember yesterday's lesson — if a page shows an error only when you're logged in, that's a real bug the build checks can't see; say so, and point Claude Code at Sentry.
