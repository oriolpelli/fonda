# W10 — The AI trust pack: build record

**Date:** 2 October 2026 · **Branch:** `w10/ai-trust-pack`, on top of `b17/rate-cache` (B17), which sits on `main` at `b9f7dd6`
**Scope:** `AI_ACT_PROMPTS.md` W10 — prompts **A5–A8** · **Status:** built, gated and independently reviewed. **Not merged.** **Two migrations: 0031, 0032** (additive, apply by hand).
**Why now:** Oriol's call on 2 Oct: B17, then W10, during the pilot sprint (`ROADMAP.md` §1 Step 3a, exception 3). W10's own deadline is the first invoices, around 1 Dec.

---

## 1. Ship it — in this order

1. **B17 first.** This branch contains it, so merging W10 merges B17 too. Apply `APPLY_0030.sql` and run B17's record §4 on the same preview.
2. **Apply `supabase/APPLY_0031.sql`** (the AI literacy record), **then `APPLY_0032.sql`** (AI problem reports). Both are safe to run twice, and each has its check query in its header. Until they are applied:
   - the literacy cards aren't shown and the record says "not available";
   - "Report a problem" says the report couldn't be sent.
   Nothing else is affected.
3. **Create the `ai@fondas.app` alias** at the mail provider. Problem reports are emailed there (`COMPANY.aiContact`). Without the alias they still land in `ai_feedback`. The email goes through Resend, like the brief, so `RESEND_API_KEY` and a verified `RESEND_FROM` must already be set.
4. **Push `w10/ai-trust-pack`.** Then run the clicks in §4 on the preview, in en/es/ca, on desktop and at 375 px.
5. **Merge.**

## 2. Commits

| Commit | Prompt | What |
|---|---|---|
| `0ca1738` | **A5** | "How Fondas uses AI" on `/trust#ai`: two sentences (provider of a limited-risk system; the high-risk rules don't apply, transparency does), then one quiet well per feature. Each well gives the model (read from `AI_MODELS`), what it reads and writes, who sees it, what happens before anything leaves, where it can be wrong, how long it is kept, and the AI Act duty. `lib/ai-features.ts` holds keys and the model only, and fails to compile if a feature in `AI_MODELS` has no card. "Reviewed by" renders only when `COMPANY.aiAssessment` is set (null). The privacy policy's AI section links to the page |
| `c62f4e9` | **A6** | "Working with Fondas AI": five cards of ≤ 60 words, shown once to each person after sign-in, skippable, and reopenable from **Settings → AI at Fondas** (new group). Migration 0031 adds `ai_literacy_acks`. Owner and managers see who completed which version and when, and download the CSV. A printable guide sits at `/dashboard/settings/ai/guide`. Printing any dashboard page drops the chrome |
| `19bc6c9` | **A7** | "Wording for your privacy notice": one paragraph per language, each with a copy button, marked as a template for the hotel's notice owner to review |
| `b5e658f` | **A8** | **AI activity** at `/dashboard/oversight/ai`: three numbers and the items, newest first, paged. "Report a problem" sits under every draft reply (and its sent state), every arrival-time request, every Ask answer and every activity item. Migration 0032 adds `ai_feedback`. Each report is emailed to `ai@fondas.app` without guest data. AI management is un-parked as a row under Operation |
| `434a7aa` | — | Drops one unused dictionary key |
| `16a569a` | review | The independent review's fixes (§5) |

**Gate:**
- `npm run lint`, `npx tsc --noEmit` and `npm run check:client-dict` pass.
- `npm run analytics-pii-audit` passes: 10/10 events, 0 leaks. Analytics weren't touched.
- The production build passes, with `/trust` prerendered in all three locales. As in B17, the build ran offline with fonts mocked under webpack (B17 record §3). **Vercel's Turbopack build on the preview is the real check.**
- I screenshotted the `/trust` section from the prerendered HTML (desktop en, 390 px es) and the literacy dialog (en, ca).

**The forbidden-words grep (A5 step 3).** I searched every `trustPage` string in en/es/ca for certif*, complian*, conform*, cumpl*, compleix*, badge, seal, sello, segell, insignia and distintiu. The only hit is the existing "We hold no ISO 27001 and no SOC 2 … those certifications come with size" in `honestBody`: a statement that we have none, which is the point.

## 3. Decisions taken while building (written down so they aren't reverted)

1. **AI activity sits under Operation**, after Guests (`APP_UX_PROPOSAL.md` §11 decision 12). There's no Oversight pillar any more, and the nav stays at five sections.
2. **`ai_literacy_acks` has a `status` column** (`completed` | `skipped`), which the prompt's column list doesn't. Without it, a skip either can't be remembered (the cards would be forced on people again) or gets recorded as a completion (false evidence). Only `completed` counts as the Art. 4 record.
3. **Skips count only on the first-run cards.** Opened again from Settings, closing early records nothing.
4. **A leaver's literacy rows go with their user** (`on delete cascade`). The record covers the team as it is, and no training record is kept about people who have left. If a lawyer wants leavers' records kept, change this to `set null` with an email snapshot.
5. **Ask reports point at the conversation** (`chat_threads.id`). Ask's turns carry no id on the client.
6. **The report email carries no note.** A note can quote a guest, so the email gives only its length; the text is in the database.
7. **There was no locked Home tile for AI management** to unlock. It was never in `HOME_LOCKED_WIDGETS`.
8. **The guest notice uses the formal register in es/ca** (usted / vostè), as guest-facing privacy text usually does. The rest of the product speaks tú. Flagged for the native read.
9. **AI activity's numbers are not `draft_edit_events'`** (§5 finding 4). The prompt asked them to match. They do for drafted replies, but the events table also counts replies typed from scratch as "major" edits.

## 4. Clicks to run on the preview

1. **/trust** (en, es, ca):
   - "How Fondas uses AI" has seven cards, each with a readable model name and its id;
   - there is no "reviewed by" line;
   - the page reads plainly, with no marketing adjectives;
   - at 375 px the cards stack and the model id wraps cleanly.
2. **/privacy:** "AI processing" ends in a link to `/trust#ai` that lands on the section.
3. **First sign-in after deploy** (0031 applied):
   - The cards appear over Home, five steps. Back is disabled on the first.
   - Esc skips. Refresh: they don't come back.
   - Sign in as a second user on the same browser: they do appear for them.
4. **Settings → AI at Fondas:**
   - "Open the five cards", go to the end, Done: the record shows *Completed* with today's date.
   - Open them again and close early: nothing new is recorded.
   - Download the CSV and open it in Excel: the accents are right and one row per completion or skip.
   - "Printable version", then ⌘P: one A4 page in each language, with no sidebar or Ask bar.
5. **Wording for your privacy notice:** copy each paragraph and paste it into a note. The text is identical to what's shown.
6. **Operation → AI activity:**
   - the three numbers add up to no more than "Drafts written";
   - items show a guest as first name + initial;
   - "Open" goes to the email, Arrivals or the Morning Brief;
   - there is **no staff name anywhere**.
7. **Report a problem** from:
   - a draft;
   - a sent reply;
   - an arrival-time request;
   - an Ask answer (in the full page and in the docked panel — Esc closes only the form);
   - an activity item.
   For each, check that a row lands in `ai_feedback` and that an email arrives at ai@fondas.app with ids and codes only: **no guest name, email, message text or note**.
8. **Speed (`PERF_LOG=1`):** after the first page the layout logs no extra read. The literacy cookie answers.

## 5. The independent review

A separate agent read the whole diff against `AI_ACT_PROMPTS.md`. No high-severity code defect stood. What it found, and what was done:

| # | Finding | Resolution |
|---|---|---|
| 1 | The Ask card said Ask reads bookings "with surnames cut to an initial", but the live request keeps real names | Half right. The hotel snapshot really does use initials (`lib/hotel-context.ts`), but what the GM *types* goes as typed. The card now says "your question as you type it" |
| 2 | The literacy cookie was written before the row, so a failed write hid the cards for a year | Cookie only after `{ ok: true }` |
| 3 | Timestamps in the Art. 4 record could be backdated through the API | BEFORE INSERT triggers set `created_at` / `completed_at` (and `ai_feedback.created_at`) |
| 4 | "Edited" counted replies typed from scratch (draft_edit_events records them as "major"); bases differed | All numbers now share one base: the drafts Fondas wrote in the period |
| 5 | Chaser names might never resolve (`reservation_id` vs `mews_id`) | Checked: chasers store the PMS id (`lib/checkin-chaser.ts`), so the join is right |
| 6 | "Reported" carried over to the next email | The button is keyed by email |
| 7 | The CSV under-reported after a version bump | Everyone without a completion of the current version is listed as "not yet" |
| 8 | Previewing the cards from Settings logged a "skipped"; the copy said nothing but completion is tracked | Settings records completion only; the copy now says skips are recorded |
| 9 | The Settings trigger was disabled while saving, so focus was lost | Never disabled |
| 10 | Card 1 claimed "everything it writes is labelled"; the bulk line said "replies"; an unknown edit read "as drafted" | Copy fixed; new outcome "Sent" |
| 11 | The guest notice covered replies only | Now covers arrival-time requests and booking data too |
| 12 | `modelName` misread a dated id with no minor version | Fixed |
| 13 | 8 px radii on small controls; one serial read | 8 px is the system's `sm` control radius (FONDA_SANA_REDESIGN §9), so kept. The Settings read is now parallel |
| 14 | The report dialog inside a transformed panel could be clipped, and Esc could close the panel | Portalled to `<body>`; Esc is captured |

## 6. Not done here

- **`APP_UX_PROMPTS.md` §V** (the week's verification prompt) is meant for a fresh session. Run it with `Scope: W10 (AI_ACT_PROMPTS.md A5–A8)` before merging.
- **§L, Oriol's:**
  - The lawyer review of the classification memo. When it's signed off, set `COMPANY.aiAssessment = { firm, date }` and the "reviewed by" line appears.
  - A native es/ca read of A6 and A7 (and of A3's labels, still owed from W9).
- **§P, the compliance pack PDF**, can now be assembled from what is live: `/trust#ai`, A4, A6, A7, A8.
- **A brief's own "Report a problem"** is on AI activity, not on the Morning Brief page. The prompt asked for drafts and Ask answers.
