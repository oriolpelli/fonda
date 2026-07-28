# Tuesday 28 July — Start here

_A plain-language plan for the day. Read the first section, then work top to bottom. Nothing here assumes you can read code._

---

## What today is about (read this first)

Yesterday was foundations — the boring, essential plumbing. You made the email sender real, turned on backups and the smoke alarm (Sentry), locked down the encryption key, and built the 60-second check that tells you Fondas ran overnight. You also fixed two real bugs, so briefs now have actual guest names in them.

**Today is the day Fondas starts doing its most distinctive job: handling guest email.**

Two things make that happen, and they build on each other:

1. **You connect a real email inbox to Fondas.** Until now, the email assistant has never actually run — it had no mailbox to read. Today it gets one. This is the single most important thing you do all week, which is exactly why it's scheduled for Tuesday and not Friday: if it fights back, you've got three days to sort it out.

2. **Claude Code splits that inbox into two views.** Right now there's one undifferentiated pile of email. By tonight, Fondas will separate it the way a hotel actually thinks: guests **staying right now** go to the *Concierge* page, guests **arriving later** or general enquiries go to the *Communications* page, and complaints jump to the top. This is the feature that makes Fondas look like it understands hotel operations instead of being a generic email tool.

A simple way to picture it: yesterday you installed the taps and the wiring. Today you turn the water on and watch it flow into the right sinks.

**By the end of today you want to be able to say:** "I connected a mailbox, sent myself three test emails as different kinds of guest, and each one landed on the right page — with the complaint sitting at the top."

---

## The order of the day

Do these in order. The build session in step 3 only makes sense once the mailbox in step 2 is connected.

1. **Morning check** (60 seconds) — confirm last night ran, log the day
2. **Connect a mailbox** (~15 min) — the important one
3. **Build the inbox split with Claude Code** (~2 hours) — task B7
4. **Test it like a guest** (~15 min) — send three emails, watch where they land
5. **Check your brief arrived** — from your real domain, not spam

---

## 1. Morning check — 60 seconds

Open Terminal (Cmd+Space, type "Terminal", Enter), then:

```bash
cd ~/fonda
npm run reliability-check
```

It prints one line per hotel — PASS or FAIL — with plain reasons underneath.

**Expect a FAIL this morning, and don't worry about it.** Yesterday's three errors (from the key rotation and the guest-name fix) are already resolved, but the check looks back 24 hours, so they'll still show until they age out later today. That's the check being honest, not a new problem. By tomorrow it should be clean.

Then write one line in your daily log. Open `RELIABILITY.md` and add today's row — something like:

> 28 Jul · synced ✅ · brief generated ✅ · brief emailed ✅ · emails: mailbox connecting today · errors: 3 stale from Mon's fixes, all resolved, aging out · notes: day 1 of the unattended run

---

## 2. Connect a real email inbox — the important one

This is the moment the email assistant comes alive.

**Use a spare Gmail account, not your personal one.** You're about to let Fondas read and draft replies to whatever lands in this inbox, so you want a dedicated address — think of it as the hotel's front-desk email, not your own.

In the app: go to **Settings → Integrations**, find the Gmail / mailbox section, and connect the spare account. Google will ask you to sign in and approve access — that's expected. Approve it.

**Why this matters so much:** every clever thing Fondas does with email — sorting guests, drafting replies, flagging complaints — needs a live mailbox to work on. Until today it had none, so that whole half of the product had never actually run. Once this is connected, the email job (which runs every few minutes) will start reading real messages.

If the connection fails or looks stuck, don't push through it — paste the exact error into Claude Code with "I was connecting a Gmail mailbox in Settings → Integrations and got this." That's a complete bug report.

---

## 3. Build the inbox split — task B7

Now Claude Code builds the two-inbox view. Open Claude Code in your project folder and **paste these two prompts in order.**

**First — the kickoff prompt (paste this first):**

```
Read BUILD_PLAN_JULY31.md in the repo root. We are executing the week of 27–31 July.
Today's task is B7 — I'll paste the task prompt next. Before starting: run
`git status` to confirm the tree is clean, and tell me in one line what B7
will change. Rules for the whole session: follow CLAUDE.md and FONDA_DESIGN_IDENTITY.md
strictly; every new table/column inherits the per-hotel RLS pattern; all new UI strings
go into all three dictionaries (en/es/ca); run `npm run lint` before declaring anything
done; never touch .env* or commit secrets. I am not a developer — when you're finished,
explain what changed in plain language and tell me exactly what to click to check it.
```

**Then — the B7 task prompt:**

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

In plain terms, what B7 does: it teaches Fondas to look at each guest's booking dates and decide whether they're **in the hotel now** or **not yet**, then routes their email to the matching page — with anything that reads like a complaint pulled to the top so you never miss it.

When Claude Code finishes, it'll tell you what changed and what to click. Don't tick this as done until you've done the test in step 4.

---

## 4. Test it like a guest — send three emails

This is your acceptance check: you play the guest, and you watch whether each email lands in the right place.

**First, get real names to test with.** For the "in-house vs arriving-later" split to have something to match against, your test emails should look like they're from guests who really exist in the synced demo data. Ask Claude Code:

```
From the synced demo data, give me the name and email of one guest who is IN-HOUSE
today (arrival on or before today, departure on or after today) and one guest who
ARRIVES LATER this month. I'll use them to test the Concierge/Communications split.
```

Then, **from a different email account**, send three messages to the mailbox you connected. Use the names Claude Code gave you where relevant. Here's ready-to-send wording:

**Email 1 — a guest staying right now (should land in Concierge):**
> Subject: Late checkout tomorrow?
>
> Hi, this is [in-house guest name] in my room. Any chance of a late checkout tomorrow, around 2pm? Also could we get a couple of extra towels sent up? Thanks.

**Email 2 — a guest arriving later (should land in Communications):**
> Subject: Parking and arrival time
>
> Hello, this is [future-arrival guest name] — I have a booking coming up later this month. Do you have on-site parking, and is it okay if we arrive around 10pm? Thank you.

**Email 3 — a complaint (should jump to the top, marked in navy):**
> Subject: Air conditioning not working
>
> The air conditioning in our room has been broken since we arrived and it's very hot. We've asked twice already and nothing has happened. This is really disappointing.

**Then wait up to ~5 minutes** (the email job runs on a timer), refresh, and check:

- Email 1 appears under **Concierge** ("In-house guests")
- Email 2 appears under **Communications** ("Before arrival")
- Email 3 sits **at the top with a navy marker**, and each has a **draft reply ready** to review

If something lands in the wrong place, tell Claude Code plainly — e.g. "the complaint went to Communications but it should be flagged in Concierge" — and let it fix it.

---

## 5. Check your brief arrived

Separately, glance at the spare Gmail (or wherever your brief recipient is set): **this morning's 07:00 brief should have arrived from `send.fondas.app`** — the first one ever sent from your real domain. Confirm it's there, it's in the right language, and it's **not in the spam folder**. If it's in spam, note it — we may need to warm up the domain, but one message isn't a crisis.

---

## Today is done when

- The reliability check ran and you logged day 1 (a FAIL from the stale errors is fine and expected)
- A real Gmail mailbox is connected and the email job is reading it
- Your three test emails landed on the right pages, with the complaint on top and a draft waiting
- The morning brief arrived from your real domain, not in spam

If B7's test passes, you've turned on the most differentiated part of Fondas — and tomorrow (Wednesday) is the dashboard, the page a GM lands on first.

---

## If you get stuck on anything

You don't need to diagnose it. Paste into Claude Code: what you were trying to do, what you expected, and exactly what happened (with any error text copied in full). That's always a good enough bug report.
