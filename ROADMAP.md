# Fondas — Roadmap

**Status:** Authority. This is the only roadmap.
**Owner:** Oriol
**Rewritten:** 2026-09-18
**Cadence:** one release a week

> **The rule this document exists to enforce.** Before today, ten documents
> described what to build next, and three of them each opened by claiming to be
> "the single list." That is how items get worked twice and dropped once.
> **From here: priority lives in this file and nowhere else.** A spec may say
> *what* a thing is (`APP_UX_PROPOSAL.md`, `FONDA_SANA_REDESIGN.md`,
> `SITE_REDESIGN_V3.md`); a playbook may say *how* to prompt it
> (`EXECUTION_PLAYBOOK.md`); a runbook may say how to operate it
> (`RUNBOOK.md`, `RELIABILITY.md`). None of them say *when*. This does.
>
> If you find a priority claim in another file, it is stale. Fix it here.

**Replaces, in full:** `PATH_TO_MVP.md` · `WHATS_LEFT.md` · `LAUNCH_PUNCHLIST.md` ·
`FEATURE_GAPS.md` · `BUILD_PLAN_JULY31.md` · `STAGE0.md` ·
`F1_FOUNDER_CHECKLIST.md` · `TUESDAY_28_START_HERE.md` ·
`WEDNESDAY_29_START_HERE.md` · `Fonda_MVP_Dev_Roadmap.docx` · the previous
`ROADMAP.md`. Every open item in all eleven is carried below. See §8 for where
each one went.

---

## 0. Where we actually are, 18 September

**Product.** Five live surfaces behind the login — Home, Morning Brief,
Check-ins, Communications, Chat — plus Settings, on the v3 "Fonda × Sana" design
system. Three PMS sources work (MEWS, Apaleo, Google Sheet/CSV). Gmail ingest,
classification and draft-writing work. The briefing cron runs. Twenty-one
coming-soon stubs sit behind the nav.

**Site.** ✅ **Merged and live, 18 September.** `site/v3-redesign` went to
`main` as a fast-forward (25 commits) and production serves the v3 site in all
three locales. The repo's oldest unblocked item is closed; the branch can be
deleted.

**Commercially.** Zero pilots live. `GTM_STRATEGY.md` §4.5's dated milestones —
"2 pilots live by 4 Sep", "3 pilots by 18 Sep" — have all passed unmet. That is
the honest headline of this document and §2 is built around fixing it.

**The thing that has been true all along and is still true:** the product is
further ahead than the distribution. Nothing in §3 matters more than the two
items in §1.

---

## 1. Getting straight — the order

Everything below is sequenced, and the sequence matters more than the speed.
**Nothing reorganises, and no app code changes, until B3 is merged.** Touching
the repo root or the dashboard while a large branch is pending merge is how you
buy yourself a conflict at the worst moment.

### Step 1 — Land B3 (site)

1. ✅ **Site work finished** (18 Sep) — built through Phase J.
2. ✅ **Migration `0021_sample_brief_requests.sql` applied** (18 Sep).
3. ✅ **`lib/seo.ts` resolves the preview's own origin** (18 Sep). `SITE_URL`
   now takes the deployment's own host on Preview, so robots.txt, canonicals,
   hreflang and the JSON-LD `@id`s describe the preview instead of claiming to
   be production:

   ```ts
   const previewHost =
     process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
       ? process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ||
         process.env.NEXT_PUBLIC_VERCEL_URL
       : undefined;
   ```

   `NEXT_PUBLIC_SITE_URL` stays `https://fondas.app` for Production and is now
   harmless on Preview — the branch above runs first. The **branch** URL
   (`*-git-*.vercel.app`) is preferred over the per-deployment URL: it is stable
   across pushes, so a preview link keeps working as the branch moves, and
   Vercel documents `VERCEL_URL` as unusable under Standard Deployment
   Protection. The deployment URL stays as the fallback for CLI deploys, which
   have no branch.

   ✅ **Confirmed on the preview of `4f4cda4`** (18 Sep). `/robots.txt` on that
   preview reports:

   ```
   Host: https://fonda-git-site-v3-redesign-fonda.vercel.app
   Sitemap: https://fonda-git-site-v3-redesign-fonda.vercel.app/sitemap.xml
   ```

   That settles both open questions at once. "Enable access to System
   Environment Variables" is on — otherwise `NEXT_PUBLIC_VERCEL_BRANCH_URL`
   would be undefined and these two lines would read `fondas.app`. And the
   branch URL is being preferred over the per-deployment URL, as intended.
   Previews now describe themselves.

   **Previews are behind Deployment Protection.** An anonymous request to a
   preview URL 302s to `vercel.com/login`, so anything that must *fetch* a
   preview — an OG unfurl debugger, a crawler test, a third party — needs a
   signed-in session or a protection-bypass token. In a browser where you are
   logged in, it just works; from `curl` it does not. Worth knowing before
   §3.4.

   **Severity was testing fidelity, not SEO.** Vercel marks preview deployments
   `noindex`, so nothing was ever wrongly indexed. What was broken was the
   ability to *verify* anything from a preview — `robots.ts` advertised the
   production sitemap and `host`, canonicals and hreflang claimed production,
   and the JSON-LD `@id`s did too. That is fixed.
4. ✅ **Merged `site/v3-redesign` → `main`** (18 Sep). Fast-forward, 25
   commits, no merge commit — the repo has one line of history again.
   Production verified in all three locales: `/en` "The AI that runs the back
   of house, so you can run the front.", `/es` "La IA que lleva la operativa, y
   tú, a los huéspedes.", `/ca` "La IA que porta l'operativa, i tu, els
   hostes." — each with its own canonical, and `/robots.txt` reporting
   `https://fondas.app` for `Host` and `Sitemap`, which is item 3 behaving
   correctly on the production side too.

✅ **Step 1 is closed.** The branch is merged; delete
`site/v3-redesign` locally and on GitHub when convenient.

### Step 2 — One cleanup pass ✅ *(done 18 Sep — four commits, on the branch)*

**What actually happened, and why it differs from the plan below.** The pass was
already finished in the working tree when Step 1 was being closed, so it was
committed on `site/v3-redesign` and arrived with the merge rather than landing
on `main` separately. Four commits, not three: the archive move (2a), the
reference sweep (2b), `APP_UX_PROPOSAL.md` added, and the doc refresh
(`CLAUDE.md`, `README.md`, `FONDA_MARKETING_VOICE.md`). The plan as written is
kept below as the record of what was decided.

**2a · Move the retired documents.** Fifteen `.md` files, one `.docx`, five
research `.html` files and `prompts/` into `docs/archive/` (§8 has the list).
Delete only what is provably redundant: `CLAUDE.md.bak-*`, `_to_delete/`, and
the two `.docx` exports (`FEATURE_GAPS.docx`, `GTM_STRATEGY.docx`) — both
verified byte-for-byte derivable from their `.md` twins, and both a drift hazard
the moment the `.md` changes and the export doesn't.

**2b · Sweep the references that break.** Three source comments cite
`FONDA_REDESIGN_SPEC.md`; `NAV_REORG_SPEC.md` is cited fourteen times across
`lib/roadmap.ts`, `sidebar.tsx`, `layout.tsx` and `brief-summary-card.tsx` and
**stays in the root for exactly that reason**. `.claude/rules/design.md`
hard-references two design docs — both survive, so it is unaffected. Verify with
a grep before and after, not by eye.

**2c · Fix the stale facts.** `README.md` still says Inter and `#1A56DB`, two
design systems out of date. Extract `FONDA_REDESIGN_SPEC.md` §6 (the only
permissions spec that exists) into a short section of this file before archiving
it. Add the retirement header `POSITIONING_V3.md` §6 asked for to
`FONDA_MARKETING_VOICE.md`.

### Step 3 — The release train ◀ **you are here**

§2 below. **Next: W2, prompts 1–4** in `APP_UX_PROMPTS.md` — the two-pillar
rail. §2's "How to run a release week" states the loop.

### Running alongside all of it, from today

- **Log five green mornings in `RELIABILITY.md` — fresh ones, starting now.**
  The five blank rows are dated 28 Jul – 1 Aug and are seven weeks stale.
  Reconstructing them would mean archaeology in `cron_logs` / `sync_logs`, and
  the result would be a worse sentence: *"five green mornings in July"* is not
  what you say to a GM in September. **Replace the five stale rows with five
  fresh dates and fill them as they happen.** Same evidentiary value, no
  archaeology, and the blocker that has sat for seven weeks clears in five days.
  While you're in the file: line 46 still says "Four consecutive green days" —
  the bar is five (§7 #7).
- **Restart outreach: five contacts a day**, using `POSITIONING_V3.md` §5.1.
  This does not wait for any build, any merge or any cleanup. Zero pilots is the
  actual problem.

---

## 2. The release train — next eight weeks

One release a week. Each row is a week's work and ships on its own.

| Wk | Release | Contents | Spec · prompts |
|---|---|---|---|
| **W1** | *Site live* | §1 above | — |
| **W2** ✅ *(18 Sep)* | **Two pillars** | Rail to five icons; two panels; nested Communications group; `canonicalSectionKey` for shared Reputation; 15 stub routes → redirects; `roadmapNavFeatures()`/`inNav`/`dashboardNav` deleted | ph. 1–2 · **prompts 1–4** |
| **W3** ✅ *(18 Sep)* | **Ask + Home v1** | Chat as a rail section; starter questions in the blank state; Home leads with "Needs you today"; existing cards become a widget registry | ph. 3–4 · **prompts 5–7**, 7b optional |
| **W4** ✅ *(19 Sep)* | **Home v2 — customize** | `dashboard_layouts`, pick + reorder, role defaults, locked roadmap tiles | ph. 5 · **prompts 8–9** |
| **W5** ✅ *(19 Sep)* | **Arrivals & departures** | `/dashboard/checkins` → `/dashboard/arrivals`; departures tab; `TodoTarget` renamed | ph. 6 · **prompt 10** |
| **W5.5** ✅ *(19 Sep)* | **The Sana pass (v4)** | Ground inverted — white canvas, warm grey wells; the 64px icon rail becomes a 240px labelled sidebar and the docked panels are deleted | `FONDA_SANA_REDESIGN.md` §0.1 · **prompts D1–D2** |
| **W6** ✅ *(19 Sep)* | **Communications, two windows** | `StayPhase` widened to four; In-house + Upcoming; Concierge absorbed; WhatsApp first-run card | ph. 7 · **prompts 11–12** |
| **W7** | **Billing** | Stripe + trial gating (B20). Blocked on the legal entity — start §4 now, not in week 7 | B20 · Gate 2 · `EXECUTION_PLAYBOOK.md` |
| **W8** | **Reputation** | The first real Commercial surface. Reviews fetched, themed, score movement | §6 · **prompts 13–14**, after decision P-4 |

**Then, in order — ✅ all shipped 19 Sep:** the guest context pane (15) → chat
threads (16, migration 0023) → the Sana chat pass (D3) → Guests v1 (17,
migration 0024) → chat source chips (18) → provenance chips (19) → ⌘K palette
(20) → the post-IA sweep (21) → the v4 sweep and marketing tune (D4).

**⚠️ Migrations 0023 and 0024 are written but NOT APPLIED.** Chat and Guests
both fail without them. Apply before the next deploy.

**Next:** rate cache (B17) → Revenue Management. The four parked house sections
(Housekeeping, F&B, Staff, Procurement) and the three business ones
(Reporting & audit, Chargeback, Team activity) re-enter the nav the week each
one ships, and not before — see §6.

### How to run a release week

The prompt text lives in `APP_UX_PROMPTS.md`; **this table says which prompts and
in what order.** Start here every week, not there. The loop:

1. Read the week's row above. It names the prompts by number.
2. Open `APP_UX_PROMPTS.md`, find that prompt, paste it into a **fresh** Claude
   Code session in the repo. One prompt per session.
3. Review the diff. Click the surface it touched in en/es/ca, desktop and 375px.
4. Commit with the message suggested under the prompt.
5. At the end of the week run the pack's verification prompt (§V) before shipping.

If a prompt asks a question it doesn't answer, the answer is in
`APP_UX_PROPOSAL.md` — point at the section rather than inventing a decision in
chat. If the proposal is silent: stop, decide, write it into `APP_UX_PROPOSAL.md`
§11, continue.

**Two prompt documents, one boundary.** `APP_UX_PROMPTS.md` holds the app IA/UX
prompts (W2–W8, prompts 1–21) **and the v4 design track (§D, prompts D1–D4)**. `EXECUTION_PLAYBOOK.md` holds the B-numbered
build tasks, including B20 (billing, W7) and B15–B22. Neither says *when* —
that is this table. If they ever disagree with it, they are stale.

**Why the prompts are not pasted into this file.** They run to 1,400 lines. This
document is the thing you read to know what matters; burying the priorities
under prompt text would cost you the one job it does. The table above is the
index, and it is always current.

> **Weeks 7–8 are the ones to watch.** Billing is gated on a legal entity that
> takes weeks to incorporate, and Reputation is the first surface with no
> existing precedent in the codebase. If either slips, slip it — do not
> compress the pilot work in §1 to protect a build date.

---

## 3. The backlog

Everything still open, by area. Items are dropped from here only when done.

### 3.1 Before pilots

| | Item | Notes |
|---|---|---|
| 🔴 | **Reliability log backfill — 5 blank rows** | §1. The bar is **five green mornings**, resolved in §7 |
| 🔴 | **Run the full demo twice — laptop, then phone** | dashboard → inbox with a draft → brief → check-ins → chat |
| 🔴 | **Seed the test hotel with realistic Spanish guest names** | sandbox data makes demos feel fake |
| 🟠 | **Brief email still on the v2 palette** | see §3.5 — the most precisely-specified open item in the corpus |
| 🔴 | **Settings is flat (~7 sections) + a separate Admin item** | group into click-in categories, fold Admin in, absorb the mislocated `SyncNowButton` |
| 🟠 | **Disconnect / switch a hotel's data source** | built in the working tree (`pms-disconnect-card`), pending push, deploy and test |
| 🟡 | **"Email me this brief now"** | Refresh only updates the on-screen brief |
| 🟡 | **Friendly error states for known failure modes** | PMS down, email auth expired, API rate limit. From the Dev Roadmap `.docx` §8 — it appears nowhere else and would have been lost |

### 3.2 Live product defects

All from `RUNBOOK.md` §14 unless noted. These are real and a pilot will hit them.

| | Defect | Consequence |
|---|---|---|
| 🔴 | **`arrival_time` is never populated by sync** | *every* upcoming confirmed guest is chase-eligible |
| 🔴 | **Chat "draft an email" produces a draft with no recipient** | it cannot be sent |
| 🟠 | **Room types show the PMS category ID, not a name** | categories/spaces aren't cached |
| 🟠 | **`rates.currentRates` is empty** in briefings and chat | no rate-plan cache — this is B17, and it blocks Revenue Management |
| 🟠 | **Brief email subject and section headings are hardcoded English** | a Spanish pilot gets Spanish body text under English headings. Drive off `briefing_language`. **This had exactly one mention in the whole corpus and was the item closest to being lost** |
| 🟡 | **`supabase/schema.sql` is missing migration 0011** | a rebuilt or staging DB would silently lack the 18-column hotel profile |
| 🟠 | **Nothing in the product is ever deleted.** There is no retention policy, no pruning job and no `delete` outside cascades, anywhere | see below |

**On the log tables specifically.** `sync_logs` takes one row per hotel per sync
and sync runs every 15 minutes — **~35,000 rows per hotel per year**. The emails
cron writes one `cron_logs` row per hotel per run, unconditionally on both the
success and the error branch, on a 5-minute schedule — **~105,000 rows per hotel
per year**. That is ~140,000 rows of pure operational noise annually per hotel,
against which the entire 24-month guest-profile history is ~6,000 rows.

It is not urgent at one hotel and it is unpleasant at fifty. **Recommended: keep
30 days of `cron_logs` and `sync_logs` and prune nightly** — `RELIABILITY.md`'s
morning ritual only ever looks at recent runs, so nothing is lost. Do it at the
same time as the guest-profile retention cron; it is the same job.
| | `emails` has no `draft_edited` | §7.4 wants a "· edited" marker under a draft reply, and `draft_edit_events` has no email id — by design, since it is an analytics table (decision P-8). A boolean written by `sendReply`, which already computes the similarity, is the cheap fix. Same migration as the row below. |
| | `emails` has no `updated_at` | So the moment a message was *ignored* is recorded nowhere, and Communications' "Done today" queue can only count what was *sent* today (decision P-7). Ignored mail falls into no queue at all, which is why the **All** segment is currently load-bearing rather than a convenience. A one-column migration closes both. |

### 3.3 Before charging

Nothing here is optional once money changes hands.

| | Item | Lead time |
|---|---|---|
| 🔴 | **Legal entity — Spanish SL or autónomo** | **weeks.** Book the lawyer the week pilot #2 lands. Everything below blocks on this |
| 🔴 | **One-page pilot agreement** | write it now — data accessed, no model training, encrypted EU-hosted, sub-processor list, deletion on request |
| 🔴 | **Lawyer-drafted DPA** | triggered the day a hotel's DPO asks |
| 🔴 | **Stripe billing + trial gating (B20)** | W7 |
| 🔴 | **Rate limiting + per-hotel AI spend caps (B21)** | required before public signups |
| 🔴 | **Google OAuth verification** | weeks; blocked on the entity; **may require a CASA security assessment and a demo video of the OAuth flow** — that requirement is recorded only in `STAGE0.md` §0.2 |
| 🔴 | **Newsletter unsubscribe flow** | `unsubscribed`/`unsubscribed_at` columns exist, the flow does not. **It is illegal to send a marketing email without it** |
| 🔴 | **`company.ts` real details** | the live site still shows `[Fondas Technologies, S.L.]` placeholders |
| 🟡 | Decide whether a separate cookie notice is needed | |

### 3.4 Site & marketing

| | Item |
|---|---|
| 🔴 | `lib/seo.ts` preview-URL resolution — see §1 step 3. The env var is set; the code change is not made |
| 🟡 | **Real product screenshots in the feature bento** — check-in and chat have no showcase band. Dependency: a nicely-seeded demo hotel |
| 🟡 | **Real Morning-Brief screenshot** replacing the hand-built mockup; optional 2-min demo video |
| 🟡 | Reduced-motion visual check on the parallax hero |
| 🟡 | Hero final QA — one line on desktop, villa ~70vw, navy legible over the pool |
| 🟡 | OG image spot-check on a real Slack/X unfurl, all three locales |
| 🟢 | Review the comparison-table copy — "Late arrivals surface in the brief, not at the door" is the writer's wording, not yours |
| 🟢 | Site IA for SEO: real `/features`, `/customers`, `/resources` pages; FAQPage JSON-LD |
| 🟢 | An **About page** carrying the *fonda* = Spanish inn story — free brand equity in Spain |
| 🟢 | Auth verify-email "Open Gmail / Outlook" shortcuts; secondary "Book a demo" on the final CTA |
| 🟢 | `(auth)` submit buttons are 40px, under the 44px floor — one `size="lg"` per call site |
| — | **Post-launch:** watch scroll depth. If bands 6 and 7 both underperform, band 6 (`comparison`) is the one to cut |

### 3.5 The email / OG palette migration

Singled out because it is the most exactly-specified open item in the repo and
the constraints are easy to get wrong.

Three surfaces are still on the v2 Signal palette: `app/api/cron/briefing/route.ts`
(still `#F6F6F4` ground, `#0A0A0A` ink, navy `#1B3BB3` date eyebrow — **and its
`CARD`/`GROUND` comments have the tokens backwards**), `lib/newsletter.ts`, and
`app/[lang]/opengraph-image.tsx`.

- **Do not migrate by swapping in `var(--fonda-*)`.** Email clients don't
  evaluate CSS custom properties and Satori can't either. Every value stays
  literal hex.
- `app/global-error.tsx` is already on v3 and is the reference implementation.
- **Gate the change** on a real send to Gmail *and* Outlook, mobile and desktop,
  plus an OG spot-check in Slack or X.

### 3.6 Later

Held deliberately. Each has a trigger, not a date.

| Item | Trigger |
|---|---|
| **Outlook / Microsoft 365** | pipeline evidence — "the biggest addressable-market lever", but only if pilots keep asking |
| **Pre-arrival upsell drafting (B15)** | B6 data fields are done; "one late checkout a week pays for Fondas" |
| **Repeat-guest personalization (B18)** | largely absorbed by Guests v1 (`APP_UX_PROPOSAL.md` §5.4) |
| **Graduated autonomy (B19)** | gate on B16 acceptance data proving draft quality |
| **Multi-property owner digest** | unlocks the Group tier |
| **Apaleo multi-property merge** | fine for single-property pilots; matters for the 1–3-property owners in the ICP |
| **3rd PMS — Cloudbeds or Amenitiz** | pilot-pipeline evidence |
| **WhatsApp — brief delivery + urgent flags**, and separately **in-house guest messaging** | the second one is what makes Communications › In-house worth splitting |
| **Automated tests / CI on money paths (B22)** | before, not after, Stripe carries real charges |
| **User permissions (Phase G)** | first multi-staff pilot. The spec was the only copy in the repo and is now preserved in §10 below |
| **ES/CA translation quality sweep** | a native pass over all UI from B1–B12 |
| **Extra brief languages beyond en/es/ca** | an open question since 2 July that has never been answered anywhere. Answer it when a pilot asks |
| **Database-level per-hotel-timezone lock** | duplicate briefs are prevented but not bullet-proof. Deferred, not forgotten |
| **Founder-tune `lib/todo-rules.ts` thresholds** | is 38% occupancy next week really a to-do? Your call, from hospitality experience |
| **Sentry read token (`SENTRY_AUTH_TOKEN`)** | would let Claude Code query issues directly |
| **Quarterly competitive review** | first one **1 October** — the only dated commitment carried over |

---

## 4. Commercial

From `GTM_STRATEGY.md`, which stays the authority on market, positioning,
pricing and the raise. Only the dates and triggers live here.

**The milestones that passed unmet:** 2 pilots live by 4 Sep, 3 pilots by 18 Sep.
Reset honestly rather than re-dated optimistically — the gating activity is
outreach, and outreach stopped.

**Hard triggers, unchanged:**

- Charging anyone → legal entity, invoicing, Stripe
- A hotel's DPO asks for a DPA → lawyer-drafted DPA
- Opening public signups → entity + Google verification + real legal pages + rate limiting
- More than ~3 pilots → entity
- **Book the lawyer conversation the week your second pilot goes live**

**The number that decides everything:** draft acceptance >60%. It is the #1 PMF
signal, `lib/draft-acceptance.ts` already measures it, and the day a pilot says
*"I send about eight in ten as they come"* that sentence becomes the strongest
line on the site. Ask permission to quote **at the pilot agreement stage**, not
after.

**Kill criterion, kept visible on purpose:** if by the end of Q1 2027 there are
fewer than 8 paying hotels despite 100+ qualified contacts and two positioning
iterations, stop and rethink.

---

## 5. Standing constraints

Not tasks. Rules that outlive any sprint, gathered from the docs being retired
so they don't vanish with them.

1. **No fake social proof.** Quotes only from a named hotel that agreed **in
   writing**. No `Review` or `AggregateRating` JSON-LD until the quotes are real.
2. **No invented data.** The occupancy strip's ADR row stays a placeholder until
   there is a rate cache. Inventing an ADR is the fastest way to lose a GM.
3. **No unearned trust badges.** `/trust` states out loud that there is no
   ISO 27001 and no SOC 2. No seal, badge or "compliant with" line until a
   certificate exists.
4. **No price figure on the marketing surface** (`SITE_REDESIGN_V3.md` §9.1 #5).
   Keep `COMPANY.priceMonthly`, the Stripe price and the `COMPANY.price` prose in
   step — they are hand-synced.
5. **`lib/roadmap.ts` governs what the landing page may claim.** Anything
   `coming-soon` there cannot be claimed above the `comingSoon` band.
6. **`lib/sample-hotel.ts` is the only definition of the sample hotel.** Never
   hardcode a hotel name, room count or date again.
7. **Guest PII is sensitive.** Never logged in plaintext, never returned to the
   client, never bypassed with the service-role key. `lib/briefing.ts`
   pseudonymises surnames before sending to Claude; anything new that ships guest
   data to a model does the same.
8. **`FONDA_SANA_REDESIGN.md` wins on any visual question.** Read it before
   touching UI. Colorless chrome, one accent, light only, WCAG AA.
9. **A deviation that isn't written down will be silently reverted by the next
   session.** Write decisions into the doc that owns them.

---

## 6. The parked sections

Removed from the navigation on 18 September (`APP_UX_PROPOSAL.md` §2.4). Not
cancelled — waiting, and now tracked here rather than as eight empty pages.

Housekeeping & maintenance · F&B · Staff · Procurement · Reporting & audit ·
Chargeback · AI management · Team activity

Their rows stay in `lib/roadmap.ts` and their copy stays in
`COMINGSOON_CONTENT.md`. Both now feed the **locked tiles in the Home customize
panel**, which is where the roadmap is sold from here on — and clicks on those
tiles are the signal for which one to build. Log them via `lib/analytics.ts`.

Each returns to the rail the week it ships. **Finance** is the most likely to
come back as its own pillar rather than a row under Operation; decide when
there's something to put in it.

---

## 7. Contradictions, resolved

The audit of the retired documents found fourteen places where two docs
disagreed. Recording the resolutions so they don't get re-litigated.

| # | The disagreement | Resolution |
|---|---|---|
| 1 | Is `EXECUTION_PLAYBOOK.md` superseded? | **No, and it is no longer alone.** It holds the only B15–B22 ID map and stays authority for the B-numbered build prompts; `APP_UX_PROMPTS.md` (18 Sep) holds the app IA/UX prompts 1–21 for W2–W8. Neither has any say on priority — §2 does |
| 2 | One inbox or two? | **Two windows**, In-house + Upcoming, with Concierge absorbed. Settled 18 Sep |
| 3 | Phase G (permissions) priority | **Deferred to the first multi-staff pilot.** It had silently fallen off every list despite a 34-line spec — §3.6 now holds it |
| 4 | Analytics — defer, repurpose, or delete? | **Delete.** `/dashboard/analytics` → `/dashboard` |
| 5 | The six per-section "Dashboard" pages | **Deleted.** A customizable Home makes them a worse version of a preset |
| 6 | URL harmonization | **Two renames only** (`checkins` → `arrivals`, `communications` → scoped children). The rest is moot |
| 7 | Reliability bar: 4 days or 5? | **Five green mornings.** Four docs said four, three said five. Five, logged honestly |
| 8 | B11 (ETA-from-reply) priority | **Droppable.** Deferred four times across four docs; that is itself the answer. The PMS can supply ETAs — fixing `arrival_time` (§3.2) matters more |
| 9 | The timezone bug | **Fixed 27 July.** `BUILD_PLAN_JULY31.md` §5's "known unfixed bug" was never updated |
| 10 | Migration 0016 | **Applied.** `LAUNCH_PUNCHLIST.md`'s warning was wrong and sent readers to do unnecessary work |
| 11 | `FONDA_MARKETING_VOICE.md` authority | **§2 (the voice) survives; §1 and §3–4 are retired.** Needs the header `POSITIONING_V3.md` §6 asked for — §8 |
| 12 | `FONDA_SANA_PROMPT_PACK.md` Phase 7.5 | **Retired.** The pack still ships it; archive the pack |
| 13 | `STAGE0.md` and the Dev Roadmap `.docx` | **Both spent.** Archive. The `.docx` is a live hazard — it contains a prompt that would restore the retired v1 terracotta palette |
| 14 | Three docs each called "the single list" | **This one.** The other three are archived |

---

## 8. Where the retired documents went

Proposed: move to `docs/archive/` rather than delete — the history is worth
keeping and nothing breaks. See the archive plan for the code-comment sweep
this requires.

| Document | Disposition |
|---|---|
| `PATH_TO_MVP.md`, `WHATS_LEFT.md`, `LAUNCH_PUNCHLIST.md`, `FEATURE_GAPS.md` (+`.docx`) | archive — every open item is in §3 |
| `BUILD_PLAN_JULY31.md` | archive — **but §11's non-technical glossary is the only one of its kind**; keep it findable |
| `STAGE0.md`, `F1_FOUNDER_CHECKLIST.md` | archive — the env-var table survives in `RUNBOOK.md` §9 |
| `TUESDAY_28_START_HERE.md`, `WEDNESDAY_29_START_HERE.md` | archive — the three test-email scripts are worth keeping as demo-seed fixtures |
| `Fonda_MVP_Dev_Roadmap.docx` | archive, and **remove from `CLAUDE.md`** — it would restore a retired palette |
| the previous `ROADMAP.md` | replaced by this file |
| `FONDA_CLAUDE_CODE_BRIEF.md`, `FONDAS_DESIGN_POLISH.md`, `FONDA_SANA_PROMPT_PACK.md`, `NAV_REORG_PROMPTS.md`, `FONDA_REDESIGN_SPEC.md` | archive — all executed. `FONDA_REDESIGN_SPEC.md` §6 (permissions) is the exception worth extracting first |
| `FONDA_MARKETING_VOICE.md` | **keep**, with the retirement header it was supposed to get in §6 of `POSITIONING_V3.md` |
| `CLAUDE.md.bak-*`, `_to_delete/` | delete |

**Surviving set — seventeen documents.** `CLAUDE.md` + `AGENTS.md` (the contract) ·
`README.md` (needs a refresh; it still claims Inter and `#1A56DB`) ·
`ROADMAP.md` (this) · `GTM_STRATEGY.md` + `POSITIONING_V3.md` (commercial) ·
`FONDA_SANA_REDESIGN.md` + `FONDA_DESIGN_IDENTITY.md` (design) ·
`SITE_REDESIGN_V3.md` + `APP_UX_PROPOSAL.md` (the two live specs) ·
`RUNBOOK.md` + `RELIABILITY.md` + `B1_VERIFY_RUNBOOK.md` (ops) ·
`EXECUTION_PLAYBOOK.md` + `APP_UX_PROMPTS.md` (prompts — B-numbers and W2–W8
respectively) · `COMINGSOON_CONTENT.md` + `NAV_REORG_SPEC.md` (content and the
rail spec the code still cites).

---

## 9. Decisions owed

Short on purpose, and shorter than it was.

**Settled 18 September**

- **The guest-data position.** 24-month retention on `guest_profiles`, surname
  pseudonymisation of chat transcripts at rest but not in the live context
  window, both stated on `/trust`. Capacity checked: 24 months of guest profiles
  is ~6,000 rows per hotel, about the same storage as ten days of cron logs.
  Full reasoning in `APP_UX_PROPOSAL.md` §11.

- **Log retention: 30 days** for `cron_logs` and `sync_logs`, pruned nightly by
  the same job as the guest-profile cron.
- **DNS lives at Namecheap** — to be confirmed against the live nameservers
  before anyone touches a record.
- **`COMINGSOON_CONTENT.md` re-check: done, and it is clean.** There is no
  Fondas pricing, plan, tier, trial or offer language anywhere in the file — zero
  hits for `199`, "per month", "subscription", "billing" or "trial". Every
  occurrence of "pricing" refers to *hotel room rates* as a product capability
  (Revenue Management "reprices continuously", Room Upgrade AI "priced to what
  each guest will pay"), which is the subject matter, not a commercial claim.
  The adjacent constraint still stands and is already a locked decision:
  `SITE_REDESIGN_V3.md` §9.1 #8 — `lib/roadmap.ts` governs the landing page, and
  nothing `coming-soon` there may be claimed above the `comingSoon` band.
  Keeping the eight parked sections' rows in `lib/roadmap.ts` (§6) keeps that
  band unchanged.
- **Finance stays out of the nav** and returns in a later update. Whether it
  comes back as its own pillar or a row under Operation is decided then.

**Still open — one.**

- **Where Reputation's reviews come from** (decision P-4 in `APP_UX_PROMPTS.md`
  §W8). Due **before prompt 13**, i.e. before W8 starts — not on the day. Three
  options are written up in the pack: Google Business Profile API (official,
  structured, the score a GM actually watches, but OAuth + business verification
  per hotel), manual/CSV import (ships in the week, weakest weekly number), or a
  hospitality review aggregator (multi-source, new vendor and cost). The prompts
  are written for Google with manual import as a fallback inside the same data
  model, so choosing Google costs nothing extra and choosing otherwise means
  editing step 2 of prompt 13. Write the answer into `APP_UX_PROPOSAL.md` §11 as
  decision 7.

Everything else was settled on 18 September.

---

## 10. Preserved: user permissions (Phase G)

Rescued from `FONDA_REDESIGN_SPEC.md` §6 before archiving — it was the only copy
of this spec anywhere, it had silently fallen off every roadmap despite being
fully designed, and it is triggered by the first multi-staff pilot. Nav page keys
below predate the two-pillar IA and need remapping when it is built.

**Model**

- `users.role` — `manager` | `staff` | `custom`
- `users.page_access text[]` — allowed page keys
- `manager` ⇒ implicit access to everything, array ignored
- Presets fill the array; toggling an individual page flips the user to `custom`

**Presets**

| Preset | Gets |
|---|---|
| Manager (GM) | Everything, incl. Settings & Users |
| Reception | Dashboard, Check-ins, Concierge, Communications, Chat |
| Concierge / guest relations | Concierge, Communications, Chat, Check-ins |
| Read-only owner | Dashboard, Analytics, Morning Brief |

**Enforcement — two layers, both required**

- **UI:** the rail renders only permitted items; direct navigation to a blocked
  route redirects to the user's first allowed page.
- **Server:** each route segment checks `page_access` in its layout — defence in
  depth, like today's auth guard. Data stays hotel-scoped by RLS; sensitive
  surfaces get a server check, not just hidden nav.

**Invites:** admin adds a user by email; provisioning stays server-side via the
service role, consistent with the no-client-INSERT rule.

> Note: `users.role` today is `owner | manager` and **nothing in the UI reads
> it**. The Home dashboard's role-based default layout
> (`APP_UX_PROPOSAL.md` §3.5) will be the first consumer — worth keeping this
> spec in view when that lands, so the two don't diverge.
