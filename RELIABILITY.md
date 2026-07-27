# Reliability — proving Fondas runs without you

The point of this file: a hotel can only depend on Fondas if it runs the
morning correctly while you're asleep. This is how you check that in 60
seconds a day, and where you write down the proof.

---

## The morning ritual (60 seconds)

Open Terminal, then:

```bash
cd ~/fonda
npm run reliability-check
```

It prints one line per hotel — `PASS` or `FAIL` — with plain-English reasons
underneath. Then fill in one row of the table below.

> Use `npm run reliability-check`, not `npx tsx` directly. The script reuses
> parts of the app that refuse to load outside a server, and the npm script
> passes the one flag that makes that work.

### What the five checks mean

| Line | What it's telling you |
|---|---|
| **Bookings synced** | Fondas pulled today's bookings from the PMS within the last 2 hours, and how many guest names came with them |
| **Morning brief** | Today's brief was written *and actually emailed*. Written-but-not-sent is reported as a failure, because that's the case you'd otherwise never notice |
| **Guest emails** | How many guest emails were sorted and drafted in the last 24h. Zero is fine — a quiet mailbox is normal |
| **Overnight errors** | Any job that failed in the last 24h, with the reason |
| **Mailbox connection** | Actually contacts Gmail to prove the connection still works. This is the one that catches a mailbox that has silently stopped working |

`n/a` means the check doesn't apply yet (no PMS connected, no mailbox linked) —
it isn't a failure and doesn't affect the result.

**If it says FAIL:** copy the whole output into Claude Code and say "this
failed this morning, what happened and how do we fix it?" You don't need to
interpret it yourself.

---

## Daily log

Fill this in each morning. Four consecutive green days is the story you tell a
GM.

| Date | Sync | Brief generated | Brief emailed | Emails processed | Errors | Notes |
|---|---|---|---|---|---|---|
| 2026-07-28 | | | | | | |
| 2026-07-29 | | | | | | |
| 2026-07-30 | | | | | | |
| 2026-07-31 | | | | | | |
| 2026-08-01 | | | | | | |

---

## What a healthy run looks like in the Vercel cron logs

Vercel → your project → **Cron Jobs**. Four jobs run on their own schedule:

| Job | Runs | What it does |
|---|---|---|
| `/api/sync` | every 15 min | Pulls bookings and guest names from the PMS |
| `/api/cron/briefing` | every 15 min | Checks whether any hotel's local send hour has arrived; writes and emails the brief |
| `/api/cron/emails` | every 5 min | Pulls new guest email, sorts it, drafts replies |
| `/api/cron/checkin` | daily 09:00 UTC | Prepares arrival-time requests |

**Healthy** = recent runs all showing status **200**. A `401` means the secret
in Vercel doesn't match (this happened on 26 July — an invisible character got
pasted into `CRON_SECRET`). A `500` means something broke; paste it into Claude
Code.

The briefing job running every 15 minutes is normal and does **not** mean four
briefs get sent. It wakes up, sees it isn't the hotel's send hour, and stops.

---

## Known limitations — read once, so nothing surprises you

**"Emails processed" is approximate.** The database records when an email
arrived, not when it was sorted. In practice these are minutes apart, so the
count is right day to day; it would only mislead if a large backlog got
processed long after arriving.

**Duplicate briefs are prevented, but not bullet-proof.** Before sending, the
job checks whether today's brief already went out. Two ticks landing at the
exact same instant could in theory both pass that check. At 15-minute spacing
this is very unlikely, and production behaviour confirms it works — on 27 July
the brief was generated and delivered exactly once at 05:01 despite the job
running four times that hour. Closing the remaining gap properly needs a
database-level lock that respects each hotel's own timezone; deliberately
deferred, not forgotten.

**One bad timezone used to break everyone.** Fixed on 27 July. Previously, a
hotel with an invalid timezone setting threw an error that stopped the briefing
job for *every* remaining hotel in that run — so hotels later in the list
silently got no brief. Now that hotel is skipped, the error is recorded, and
everyone else is unaffected. The reliability check flags an invalid timezone
with a ⚠ next to the hotel name.

**Errors now go to Sentry.** Every scheduled job reports failures to Sentry
tagged with the hotel and the stage that failed. Verified end to end on 27 July
(a test event was accepted by Sentry), so alerts are real, not assumed.

---

## Guest names were missing — fixed 27 July

**The symptom:** sync reported 1,364 bookings but **0 guests**. Briefs and
email drafts would have read generically ("the guest in room 12") instead of
using real names — the kind of thing a GM notices immediately in a demo.

**The cause:** Fondas was calling an old version of the MEWS booking API. That
older version labels the guest on a booking `CustomerId`, but the code was
reading a field called `AccountId` — the name the *current* version uses. The
field was always empty, so Fondas never knew which guest to look up, and never
fetched a single name.

**The fix:** Fondas now calls the current version of that API, which returns
the field the code expects. Verified against MEWS directly: 3,464 bookings came
back, 2,782 distinct guests, and their names resolved correctly. Bookings made
by a company or travel agency are correctly not treated as guest profiles.

**What you need to do:** nothing — but after the next sync runs, the
reliability check's "Bookings synced" line should show a guest count above
zero. It deliberately fails while that number is 0, so you can't miss it.

---

## One-time setup

The `cron_logs` table (which records whether each job ran) must exist before
the "Overnight errors" check works. Apply it once:

1. supabase.com → your project → **SQL Editor** → New query
2. Open `supabase/APPLY_0014.sql`, copy all of it, paste, **Run**
3. It should list six rows (`id`, `job`, `hotel_id`, `status`, `message`,
   `created_at`)

Safe to run twice. Until you do, the check reports "could not read the job
error log" rather than falsely reporting all-clear.
