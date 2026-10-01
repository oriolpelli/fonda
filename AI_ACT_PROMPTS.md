# Fondas — EU AI Act: Claude Code Prompt Pack

Build prompts that bring Fondas in line with the EU AI Act's transparency rules
and turn that into something a hotel's DPO can check. Run them **in order**, one
at a time, each in a **fresh Claude Code session** inside the repo. Each prompt
ends with a gate (`npm run lint` + `npx tsc --noEmit`, and `npm run build` at
every week gate).

**Owner:** Oriol · **Written:** 2026-10-01 · **Status:** not started.
**Sequencing:** `ROADMAP.md` §2 says *when* (W9, then W10). This pack only says
*how to ask for it*. The audit behind it — what applies, why, and the sources —
is the "Fondas — EU AI Act Readiness Audit" doc (1 Oct 2026).

**The hard date.** Art. 50(2) requires AI-generated text to be marked in a
machine-readable way. Fondas was on the market before 2 Aug 2026, so the
Digital Omnibus (Reg. (EU) 2026/1744) gives us until **2 December 2026**. W9
exists for that date; everything else here is trust and sales.

---

## 0. What the pack is built on

**Classification (to be confirmed by a lawyer — §L).** Fondas is the *provider*
of a limited-risk AI system built on Anthropic's models; each hotel is a
*deployer*. No live feature is in Annex III, so the high-risk regime (from
2 Dec 2027) does not apply. What does apply:

| Duty | Article | Where this pack meets it |
|---|---|---|
| Mark AI-generated text machine-readably | 50(2) | A1, A2 |
| Tell people when they are interacting with an AI | 50(1) | A3 (staff), §R (any future guest-facing bot) |
| Support staff AI literacy (us and our hotels) | 4, as amended 27 Jul 2026 | A6 |
| Transparency a DPO can read | good practice; GDPR 13/14 for the hotel | A5, A7 |
| Human oversight that holds up in a demo | our own claim | A4, A8 |

**Why we mark even reviewed drafts.** The "a person reviewed it, so no label"
exception is in Art. 50(4), which covers text published on matters of public
interest — not guest correspondence. 50(2)'s own exceptions are for "standard
editing" and for not substantially altering the input, and drafting a whole
reply from a guest's email is hard to fit there. The marker is an email header
the guest never sees, so the cost of being safe is about a day. **No visible
"written by AI" line is added to guest emails.**

### Before the first prompt

- [ ] The pilot sprint is over (`ROADMAP.md` Step 3a) and the release train has
      resumed.
- [ ] `git status` is clean, you are on `main` or a branch cut from it today,
      and `npm run build` is green.
- [ ] Migrations are applied through `0024`. **The next number is 0025.**
      `APP_UX_PROMPTS.md` P-2 used to reserve 0025 for Reputation's `reviews`;
      that moved to **0026** on 1 Oct 2026 so this pack could take 0025.

### Guardrails to repeat (all in `CLAUDE.md`; repeated because they bite here)

- **No guest PII in any header, log line, analytics event or provenance field.**
  Not names, not emails, not booking references. Provenance is model, prompt
  version, timestamps, a hash and an edit bucket — nothing else. Run
  `npm run analytics-pii-audit` after any prompt that touches `lib/analytics.ts`.
- **Read `FONDA_SANA_REDESIGN.md` (§0.1 first) before any UI change.** Labels
  are quiet: mono, `--fonda-text-3`, no new colour, no badge, no pill.
- **Copy lives in `dictionaries/{en,es,ca}.json`** — all three, same keys, same
  order.
- **RLS, not service-role**, for anything read from page code. New tables are
  hotel-scoped.
- **No new dependencies.** Hashing is `node:crypto`; email headers are strings.
- **Words we never ship in UI, emails or the site:** "certified", "AI Act
  certified", "officially compliant", any seal or badge. `ROADMAP.md` §5 #3.

---

## W9 — AI transparency (P0, must ship before 2 Dec 2026)

### Prompt A1 — Provenance: one source for models, a record on every output

```
Read CLAUDE.md, ROADMAP.md §3.2 (the two `emails` rows: no `draft_edited`, no
`updated_at`), lib/email-processor.ts, lib/checkin-chaser.ts, lib/briefing.ts,
lib/guest-inference.ts, app/api/chat/route.ts, the summarizeReviews action in
app/[lang]/dashboard/settings/actions.ts, lib/draft-edit.ts,
lib/draft-acceptance.ts, and supabase/migrations/0001_init.sql, 0009, 0010,
0019 and 0024 before changing anything.

Goal: every piece of text a model writes in Fondas can later answer "which
model wrote this, from which prompt version, when" — without storing any guest
data that isn't already stored.

1. lib/ai-provenance.ts (server-only, new). The ONE place model IDs live:
     export const AI_MODELS = { emailClassify, emailDraft, chaser, briefing,
       chat, guestInference, reviewSummary } — move the existing constants
       here verbatim (EMAIL_CLASSIFY_MODEL, EMAIL_DRAFT_MODEL, CHASER_MODEL,
       BRIEFING_MODEL, CHAT_MODEL, INFERENCE_MODEL and the inline Haiku string
       in settings/actions.ts) and import them back where they were used.
       Keep the existing comments about which models reject `effort`.
     export const PROMPT_VERSIONS = { same keys } — a short dated string per
       feature, e.g. "email-draft@2026-10-07". Add a comment: bump the version
       in the same commit as any change to that feature's system prompt.
     export function sha256(text: string): string — node:crypto, hex.
     export function provenance(feature): { model, promptVersion, generatedAt }.
   No behaviour change in any feature from this step alone.

2. supabase/migrations/0025_ai_provenance.sql (additive only, nullable columns,
   no backfill):
     emails:           draft_model text, draft_prompt_version text,
                       draft_generated_at timestamptz, draft_sha256 text,
                       draft_edited boolean, sent_via text check (sent_via in
                       ('single','bulk')), updated_at timestamptz default now()
                       (+ the usual updated_at trigger if the repo has one;
                       follow the existing pattern, don't invent one)
     checkin_chasers:  draft_model, draft_prompt_version, draft_generated_at,
                       draft_sha256, draft_edited, sent_via (same types)
     briefings:        model text, prompt_version text
     guest_profiles:   inference_model text, inference_prompt_version text
     chat_logs:        model text  (assistant rows only)
   Comment the migration header the way 0019 is commented: what the columns are
   for (Art. 50(2) evidence), and that none of them may ever hold guest text.
   RLS is unchanged — these are columns on tables that already have policies.
   Update types/database.ts to match.

3. Write the record wherever a draft/brief/answer/inference/summary is created:
   model + prompt version + generated_at, and draft_sha256 = sha256 of the
   draft text exactly as stored.

4. In sendReply and sendOne (communications and arrivals actions): set
   draft_edited from the edit bucket lib/draft-edit.ts already computes (true
   unless the bucket is "none"), sent_via 'single' or 'bulk', and updated_at.
   This closes the two ROADMAP §3.2 `emails` rows — tick them in ROADMAP.md in
   the same commit.

Do not touch any UI in this prompt. Run `npm run lint` and `npx tsc --noEmit`.
Show me the migration and the diff.
```

**Look for**

- Every model string in the repo now appears once, in `lib/ai-provenance.ts`. `grep -rn "claude-" lib app` finds nothing else.
- The migration is additive and nullable. Old rows read fine.
- Generate one draft, one chaser and one brief locally: the new columns are filled. The hash is of the stored draft, not the sent text.
- No column added holds guest text, a name or an address.

**Commit:** `feat(ai): one source for model IDs; provenance on every generated output (migration 0025)`

Apply `0025` before Prompt A2.

---

### Prompt A2 — Machine-readable marking on everything we send

```
Read lib/gmail.ts (sendEmail builds a raw RFC 2822 message by hand),
app/[lang]/dashboard/communications/actions.ts, app/[lang]/dashboard/arrivals/
actions.ts, app/api/cron/briefing/route.ts (Resend), lib/draft-edit.ts and the
new lib/ai-provenance.ts before changing anything.

Art. 50(2) of the AI Act: outputs of an AI system that generates text must be
"marked in a machine-readable format and detectable as artificially generated".
We do it with email headers. The guest never sees them; nothing visible changes
in a guest email.

1. lib/ai-disclosure.ts (server-only, new):
     export function aiHeaders(input: {
       origin: "drafted" | "written";      // drafted = started as a Fondas draft
       model: string; promptVersion: string;
       edit: "none" | "minor" | "major";    // from lib/draft-edit.ts
       review: "single" | "bulk";
       draftSha256: string;
     }): Record<string, string>
   returning exactly:
     "X-AI-Generated": "true"
     "X-Fondas-AI": "origin=drafted; edit=minor; review=single; model=<id>;
                     prompt=<version>; ref=<first 16 hex of draftSha256>"
   Values are ASCII, single-line. Throw if any value contains CR or LF.
   Return {} when origin is "written" (the GM wrote it from scratch, no draft).
   A comment block above the function explains why (Art. 50(2), deadline
   2 Dec 2026, no PII by construction) and that these header names are ours —
   there is no standard for text yet; revisit if the Code of Practice on
   AI-generated content or the Commission's guidelines name one.

2. lib/gmail.ts: sendEmail takes an optional `headers?: Record<string,string>`.
   Only names matching /^X-[A-Za-z0-9-]+$/ are accepted; reject CR/LF in names
   and values (header injection). Insert them before the blank line.

3. Communications and arrivals: compute the edit bucket BEFORE sending (the
   measurement is pure — today it runs after the send for the acceptance
   metric; keep that recording as is, just compute the bucket earlier too),
   build the headers from the row's provenance columns, pass them to sendEmail.
   Bulk sends pass review "bulk" and edit "none".

4. Brief email (Resend): pass headers { "X-AI-Generated": "true",
   "X-Fondas-AI": "origin=drafted; edit=none; review=none; model=…; prompt=…" }.
   (review=none is allowed for the brief only — it goes to staff, not guests.)

5. scripts/verify-ai-mark.ts + an npm script "verify-ai-mark": given a pasted
   email body on stdin, compute sha256 and look up emails.draft_sha256 /
   checkin_chasers.draft_sha256 via the admin client. Print only: found or not,
   table, generated_at, model, edited. Never print the body, the guest or the
   address. This is how we answer "did Fondas write this?" for a DPO.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for**

- Send a reply from a test hotel to your own Gmail. In Gmail, "Show original": both headers are there, on one line each, and nothing in them identifies the guest.
- Edit a draft before sending: `edit=minor` or `edit=major`. Send one untouched: `edit=none`. "Approve all": `review=bulk`.
- A reply the GM typed with no draft carries no AI headers.
- The visible email is byte-for-byte what it was before this prompt.
- `npm run verify-ai-mark < body.txt` finds a draft that was sent unedited, and correctly says "not found" for an edited one (the hash is of the draft).

**Commit:** `feat(ai): machine-readable AI marking on outbound guest mail and the brief (Art. 50(2))`

---

### Prompt A3 — Say it's AI, quietly, everywhere staff see AI output

```
Read FONDA_SANA_REDESIGN.md §0.1 and the type/colour sections, APP_UX_PROPOSAL.md
§7.4 (provenance — restraint), components/dashboard/email-inbox.tsx (the
"Drafted from this thread and your house tone" line from Prompt 19),
components/dashboard/checkin-chasers.tsx, components/dashboard/briefing-article.tsx,
the chat message rendering and source chip (components/dashboard/source-chip.tsx
and the chat components), the guest record's inferred tags, and
app/api/cron/briefing/route.ts (briefingEmailHtml).

Art. 50(1): people interacting with an AI system are told so. Staff using Ask
know, but we make it explicit everywhere, in the quietest possible way.

1. Draft replies: the existing provenance line becomes
   "Drafted by Fondas AI from this thread and your house tone — check before
   sending" (+ "· edited" as today). Same treatment under each chaser draft.
2. Ask: one mono line under each assistant answer, beside the existing source
   chip: "Fondas AI · can be wrong — check figures that matter".
3. Morning brief page: one line at the foot of the article:
   "Written by Fondas AI from your PMS and inbox. Check anything you act on."
   Brief email: the same sentence in the footer (literal hex colours only —
   email clients don't read CSS variables; see ROADMAP.md §3.5).
4. Guest record: confirm inferred tags are visibly distinct from staff-entered
   ones and carry "inferred by Fondas AI" on hover/focus. If they already are,
   change nothing and say so.
5. Dictionaries en/es/ca for every string. No new colour, no badge, no chip —
   mono, --fonda-text-3, as Prompt 19.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff and a screenshot
list of every surface touched.
```

**Look for** — restraint, again. If a page starts to rattle, it's overdone.

- One line per draft, one line per answer, one line per brief. No icons, no chips, no colour.
- es and ca read naturally (not "Redactado por IA de Fondas" calqued word for word — have a native eye check it).
- The brief email footer renders in Gmail and Outlook.

**Commit:** `feat(ai): label AI output on drafts, chasers, answers and the brief (Art. 50(1))`

---

### Prompt A4 — "Approve all" that a DPO would accept

```
Read approveAllStandard in app/[lang]/dashboard/communications/actions.ts,
approveAllChasers in app/[lang]/dashboard/arrivals/actions.ts, the buttons that
call them in components/dashboard/email-inbox.tsx and
components/dashboard/checkin-chasers.tsx, and the existing dialog/popover
patterns in the codebase (reuse one; do not add a dependency).

Our claim is "a person on your team sends every message". Bulk approval is
where that claim is weakest, so make the person's decision explicit and recorded.

1. Before a bulk send, a confirmation dialog: "Send N replies exactly as
   drafted?" with the list of what's going (guest first name + first line of
   each draft, scrollable), and two buttons: "Send N" and "Review one by one".
   Default focus on "Review one by one". Esc cancels.
2. Keep the narrow filter that limits bulk approval to the categories it
   already uses. Do not widen it. Add a comment that widening it needs a
   decision in APP_UX_PROPOSAL.md §11 first.
3. Server side: the action re-checks the filter (never trust the client list)
   and sets sent_via = 'bulk' on every row (column from A1).
4. Dictionaries en/es/ca.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for**

- Keyboard only: open, Tab, Esc — focus returns to the button that opened it.
- Cancelling sends nothing. Confirming sends exactly the listed rows.
- `sent_via` is `bulk` on those rows, `single` on one-by-one sends.

**Commit:** `feat(ai): explicit, recorded confirmation for bulk sends`

---

### Week gate — W9

Run `APP_UX_PROMPTS.md` §V with `Scope: W9 (AI_ACT_PROMPTS.md A1–A4)`, then
these four checks, which are what "done" means for the 2 December deadline:

- [ ] A sent reply, a sent chaser and a brief email all show `X-AI-Generated`
      and `X-Fondas-AI` in "Show original". None contains guest data.
- [ ] `grep -rn "claude-" lib app` finds model IDs only in `lib/ai-provenance.ts`.
- [ ] Every AI surface staff see carries its one quiet line, in all three locales.
- [ ] The two `emails` rows in `ROADMAP.md` §3.2 are ticked.

---

## W10 — The AI trust pack (P1, before the first invoices ~1 Dec)

### Prompt A5 — "How Fondas uses AI" on /trust, generated from code

```
Read app/[lang]/(legal)/trust/page.tsx and its `trustPage` dictionary
namespace, the "AI processing" and "Sub-processors" sections of
app/[lang]/(legal)/privacy/page.tsx, Terms §5, lib/ai-provenance.ts, and
ROADMAP.md §5 #3 (no unearned trust claims).

Add a section to /trust: "How Fondas uses AI". One short card per feature, so a
hotel's DPO can read the whole thing in ten minutes.

1. lib/ai-features.ts — the data, one entry per feature: email classification,
   email reply drafts, check-in chasers, morning brief, Ask, guest-preference
   inference, review summary. Fields: key, model (imported from AI_MODELS — so
   the page cannot drift from the code), inputs, output, who sees it, who
   reviews it before anything leaves the hotel, known limits, retention, and the
   AI Act duty it falls under (e.g. "Art. 50(2) — marked"). Copy lives in the
   dictionaries; the data file holds keys and the model reference only.
2. Render it on /trust after the existing "what we store" section: a quiet
   definition-list layout per card, Sana wells, no icons. Above the cards, two
   sentences: Fondas is the provider of a limited-risk AI system under the EU AI
   Act; the high-risk rules don't apply to anything it does, and here is what
   does. Below them, one line: "Our assessment was reviewed by <firm> on
   <date>." — rendered ONLY when COMPANY.aiAssessment (new, in
   app/[lang]/(legal)/company.ts, default null) is set. Until the lawyer has
   signed off, the line does not exist.
3. Nowhere on the page, in any language: "certified", "compliant", a badge or a
   seal. Grep for it and show me the result.
4. Update the privacy policy's "AI processing" paragraph to link to this
   section. Dictionaries en/es/ca.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for**

- Change a model in `AI_MODELS` locally: the card changes with it.
- The page reads as plain and specific — models named, reviewers named, limits stated. No marketing adjectives.
- The "reviewed by" line is absent.

**Commit:** `feat(trust): "How Fondas uses AI" — per-feature cards from lib/ai-features.ts`

---

### Prompt A6 — AI literacy: a five-minute onboarding and a record of it

```
Read the onboarding flow (app/[lang]/onboarding and lib/onboarding.ts), the
Settings groups (lib/settings-groups.ts), FirstRunState vs EmptyState (never add
a third), FONDA_SANA_REDESIGN.md §0.1, and lib/ai-features.ts from A5.

Art. 4 of the AI Act (as amended 27 Jul 2026): providers AND deployers must
"take measures to support" AI literacy among staff who use AI systems. Hotels
are deployers — we give them the measure and the evidence.

1. "Working with Fondas AI" — five short cards (one screen each, ≤ 60 words):
   what Fondas does with AI; where it can be wrong (dates, prices, policies it
   wasn't given); what to check before sending; what Fondas never does on its
   own (send to a guest); how to report a bad output (A8). Content from the
   dictionaries; en/es/ca.
2. Shown once to each user after their first login (not during hotel setup),
   skippable, and re-openable from Settings → "AI at Fondas".
3. A migration, ai_literacy_acks. Number: the next free one when you run
   this — check supabase/migrations/ and APP_UX_PROMPTS.md P-2 (0026 is
   reserved for Reputation's `reviews`); if you take a reserved number, update
   P-2 in the same commit. Table ai_literacy_acks (id, hotel_id, user_id, version
   text, completed_at timestamptz). RLS: a user inserts/reads their own row;
   owner/manager reads their hotel's rows. No updates, no deletes from clients.
4. Settings → "AI at Fondas" shows, for owner/manager, who has completed which
   version and when, plus a "Download record (CSV)" — that CSV is the hotel's
   Art. 4 evidence. Completion only: no scores, no time-on-card, no ranking.
5. A printable one-page version of the five cards at
   /dashboard/settings/ai/guide (print stylesheet, no chrome).

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff and the migration.
```

**Look for**

- New user: sees it once, can skip, can reopen. Existing user after deploy: sees it once.
- The manager view shows completion and dates only.
- The printed page fits one A4 sheet in all three languages.

**Commit:** `feat(ai): AI literacy onboarding with a per-hotel completion record (Art. 4)`

---

### Prompt A7 — The guest-notice kit

```
Read the privacy policy (app/[lang]/(legal)/privacy/page.tsx), lib/guest-inference.ts
(what is inferred and why), GUEST_EXPERIENCE_SPEC.md (the stay plan), and
lib/settings-groups.ts.

The hotel is the GDPR controller and must tell guests how their data is used
(Art. 13/14). Hotels won't write this themselves; we hand them the paragraph.

1. Settings → "AI at Fondas" gets a "Wording for your privacy notice" block:
   a copy-ready paragraph in en/es/ca covering (a) replies to guest emails may
   be drafted with AI and are reviewed by our staff before sending, (b) we
   note stay preferences from your messages and bookings to prepare your stay,
   kept for 24 months after your last stay, (c) Fondas (and its AI
   sub-processor, Anthropic) process this on the hotel's behalf. A copy button
   per language. Plain words, no legalese, ≤ 120 words each.
2. Mark it clearly as a template the hotel's own notice owner should review.
3. Dictionaries hold the paragraphs; the copy is identical to what's shown.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for** — the three paragraphs say the same thing (have a native speaker check es/ca), and every factual claim matches the code: 24 months is the retention cron's number.

**Commit:** `feat(ai): guest privacy-notice wording for hotels, en/es/ca`

---

### Prompt A8 — The AI activity log (un-parks "AI management")

```
Read ROADMAP.md §6 (parked sections return to the nav the week they ship),
app/[lang]/dashboard/oversight/ai/page.tsx (currently a redirect),
lib/roadmap.ts (the "aiManagement" row), components/dashboard/sidebar.tsx
(data-driven nav — icons by string key), COMINGSOON_CONTENT.md, and the
provenance columns from A1.

Build /dashboard/oversight/ai — "AI activity": what Fondas generated for this
hotel in the last 30 days and what happened to it. This is human oversight made
visible, and the strongest thing to show a group owner.

1. Top row, three numbers for the period: drafts generated · sent as drafted ·
   edited before sending (bulk sends counted separately, as the acceptance
   rollup already does).
2. A list, newest first: date, type (reply, chaser, brief), outcome (sent as
   drafted / edited / sent in bulk / not sent), model, and a link to the item.
   Guest shown by first name + initial only (lib/pseudonymise.ts). Paged.
3. Per-hotel only. No per-staff counts, no ranking, no "who sent most" —
   ROADMAP.md §5 #10 (worker monitoring is Annex III high-risk).
4. A "Report a problem with an AI output" action on each item and under every
   draft and Ask answer: a short form (what was wrong: wrong fact / wrong tone /
   shouldn't have drafted / other + free text) writing to ai_feedback
   (id, hotel_id, user_id, item_type, item_id, reason, note, created_at;
   RLS hotel-scoped; next free migration number). Also email the details,
   minus any guest data, to the address in COMPANY.aiContact (new in
   company.ts). This is the AI incident channel.
5. Un-park: the nav row returns, the lib/roadmap.ts row flips from
   coming-soon, the Home customize panel's locked tile unlocks. Dictionaries
   en/es/ca.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for**

- The numbers match `draft_edit_events` for the same period.
- No staff names or per-person counts anywhere on the page.
- A report lands in `ai_feedback` and in the inbox with no guest name, email or message text in it.

**Commit:** `feat(oversight): AI activity log and AI problem reports; un-park AI management`

---

### Week gate — W10

Run `APP_UX_PROMPTS.md` §V with `Scope: W10 (AI_ACT_PROMPTS.md A5–A8)`, then:

- [ ] `/trust` "How Fondas uses AI" lists every feature in `AI_MODELS`, in all three locales, with no "certified/compliant" wording.
- [ ] A new staff user sees the literacy cards once; the manager can download the record.
- [ ] AI activity shows last month's real numbers and no per-person data.
- [ ] The compliance pack (§P) can be assembled from what's live.

---

## R — Rules for features that haven't been built yet

These are the lines that keep Fondas out of the high-risk regime and inside
Art. 50. **Any prompt that builds one of these features must quote its rule.**
They are also `ROADMAP.md` §5 #10.

| Feature | Rule |
|---|---|
| **Team activity** (parked) | Workload per hotel or per role only. Never score, rank or compare individual staff, and never let it allocate tasks or shifts. Evaluating or monitoring individual workers is Annex III point 4 — high-risk from 2 Dec 2027. |
| **Graduated autonomy (B19)** — any auto-send | The moment a guest can receive a reply no person reviewed, the guest is interacting with an AI: add a visible line to those messages ("This reply was written by our AI assistant — reply 'staff' for a person") and keep the A2 headers. |
| **WhatsApp in-house guest messaging** | A chatbot under 50(1): the first message says it is the hotel's AI assistant; a human is one tap away; the A2 marking equivalent goes in message metadata where the API allows it. |
| **Guest stay plan** (`GUEST_EXPERIENCE_SPEC.md`) | Provenance from A1; a visible line on the printed sheet: "Prepared for you with our AI assistant and checked by our team." |
| **Reputation — public review replies** | Always human-approved before publishing. Keeps 50(4) (public-interest text) out of play. |
| **Revenue management, upsells** | Not Annex III (only credit and life/health insurance pricing are). Never price on inferred personal traits. |
| **Anything new that sends text out of Fondas** | Provenance (A1) + marking (A2) from day one, and a card in `lib/ai-features.ts` (A5). |
| **Complaint / urgency detection** | Text only. Never infer emotions from voice, face or other biometrics — that is emotion recognition under the Act. |

---

## L — Not code: what Oriol does

| Item | When | Notes |
|---|---|---|
| **Lawyer review of the classification memo** | before W10 ships; ideally before 2 Dec | One page per feature: purpose, why not Annex III, which Art. 50 duties apply and how A1–A4 meet them, the 50(2) "reviewed drafts" question. Skeleton below. A tech lawyer can review it in a few hours. When signed off, set `COMPANY.aiAssessment` (A5). |
| **Our own Art. 4 record** | now | You are a provider's staff too: note what you did to understand the system (this audit counts) with a date. |
| **Native es/ca read** of A3, A6, A7 copy | at each gate | |
| **Legal entity + DPA** | already `ROADMAP.md` §3.3 | Gates every group or chain contract, AI Act or not. |
| **ISO/IEC 42001** | trigger: a chain or 10+ property group in the pipeline | After ISO 27001 or SOC 2. The only AI certificate procurement can tick. |

**Classification memo skeleton** (give the lawyer this, filled in):

1. Provider identity; the upstream model provider (Anthropic, GPAI Code of Practice signatory); deployers (hotels).
2. Per feature (from `lib/ai-features.ts`): intended purpose, inputs, outputs, who acts on them, human review step.
3. Art. 5 — none of the prohibited practices; one line each on why.
4. Art. 6 / Annex III — not used for any listed purpose; specifically not employment (no evaluation or allocation of staff).
5. Art. 50 — 50(1) how staff are informed; 50(2) the marking (A2) and the question whether GM-reviewed drafts fall under the "standard editing" exception (our position: we mark regardless); 50(4) not applicable.
6. Art. 4 — the literacy measure (A6) and its record.
7. Open questions for counsel; review date.

## P — The compliance pack (what a DPO gets)

One PDF + `/trust`, dated, assembled after W10: the reviewed memo · "How Fondas uses AI" · the marking statement (A2's header spec, two paragraphs) · the human-oversight description (A4 + A8) · the literacy material and how to export the record (A6) · the guest-notice wording (A7) · Anthropic's GPAI Code of Practice signature and no-training terms · sub-processor list · retention and pseudonymisation · the DPA (when it exists).

**How to describe it on the site and in sales** (the reasoning is in the audit):
"Built for the EU AI Act — assessed, documented and reviewed by <firm>", linked
to `/trust`. Not "certified", not a bare "compliant", no badge. Never imply the
hotel has no duties of its own — A6 and A7 exist because it does.

---

## Suggested commit sequence

```
W9   feat(ai): one source for model IDs; provenance on every generated output (migration 0025)
     feat(ai): machine-readable AI marking on outbound guest mail and the brief (Art. 50(2))
     feat(ai): label AI output on drafts, chasers, answers and the brief (Art. 50(1))
     feat(ai): explicit, recorded confirmation for bulk sends
W10  feat(trust): "How Fondas uses AI" — per-feature cards from lib/ai-features.ts
     feat(ai): AI literacy onboarding with a per-hotel completion record (Art. 4)
     feat(ai): guest privacy-notice wording for hotels, en/es/ca
     feat(oversight): AI activity log and AI problem reports; un-park AI management
```

**If you only ship two:** A1 and A2. That is the 2 December obligation.
