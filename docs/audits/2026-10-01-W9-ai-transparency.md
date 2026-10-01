# W9 — AI transparency: build audit

**Date:** 1 October 2026 · **Branch:** `w9/ai-transparency` (cut from `main` at `72b7213`)
**Scope:** `AI_ACT_PROMPTS.md` A1–A4 · **Status:** built and gated, **not merged** — migration 0025 is applied and verified; the manual tests below are what remains.
**Why now:** a recorded exception to the pilot sprint (`ROADMAP.md` Step 3a), Oriol's call on 1 Oct. Production is untouched until the merge.

This is the record of what was changed, why, how each step was checked, and what is still owed. One commit per step so any one can be reverted on its own.

---

## 1. Before you deploy anything from this branch

1. **Apply `supabase/APPLY_0025.sql`** in the Supabase SQL editor (re-runnable; needs 0024, which is applied). From A1 on, the app writes these columns.
2. From your own terminal: `npm run verify-migrations` → expect PASS, including the new "migration 0025" block.
3. Push the branch. Vercel builds a **preview**; production stays on `main`.
4. Run the tests in §3 on the preview, then merge to `main`.

**Done 1 Oct:** 0025 applied to production Supabase by Oriol. `npm run
verify-migrations` → PASS (all 23 columns of 0025, plus 0023/0024 and the
retention boundary). `information_schema.triggers` shows
`briefings_`, `checkin_chasers_` and `emails_guard_ai_provenance`.

If the branch is ever deployed against a database without 0025: inbox reads, briefs, chasers and new drafts fail (missing columns), but **sends no longer double-send** — the status write is separate from the provenance write (commit `95a1e7f`).

## 2. Commits, in order

| # | Commit | What | Gate |
|---|---|---|---|
| — | `25ab455` … `72b7213` (on `main`) | Your pending working tree, audited and split: docs reorg into `gtm/` + AI Act pack + Guest Experience spec; accent-insensitive sheet headers + demo sheet; brand signature/LinkedIn; APPLY_0023/0024 scripts; ROADMAP note | lint, tsc, build |
| A1 | `07e63f6` | `lib/ai-provenance.ts` (the only place model IDs live), migration 0025, provenance written on every generated output, `draft_edited` / `sent_via` / `updated_at` on send | lint, tsc, build |
| fix | `15c04e0` | Review summary in Settings sent `effort` to Haiku 4.5, which rejects it — the feature has always errored. Found while doing A1 | lint, tsc |
| A2 | `a1d7ab2` | `X-AI-Generated` + `X-Fondas-AI` headers on replies, chasers and the brief; `sendEmail` custom headers with injection guard; `npm run verify-ai-mark` | lint, tsc, build, mocked-Gmail test |
| A3 | `8af07da` | One quiet "Fondas AI" line on drafts, sent replies (the P-8 "· edited" marker), chasers, Ask answers, the brief page and brief email; inferred guest preferences marked | lint, tsc, build, headless screenshots en/es/ca × 1280/375 |
| A4 | `b48dc4c` | Bulk-send confirmation dialog; actions send exactly the confirmed ids, re-checked server-side | lint, tsc, build, keyboard test in headless browser |
| fix | `0b4bfdf` | Shorter chaser label (wrapped to 3 lines at 375px in Spanish) | tsc |
| review | `95a1e7f` | Send paths: status written before provenance (no double-send); CR/LF guard on To/Subject/In-Reply-To; `;`/`=` refused in header values; legacy-draft refs stored | lint, tsc, mocked-Gmail test |
| review | `dffb2cd` | Bulk: Ask drafts with no recipient excluded; "Sent X of N" when fewer go; dialog focus holds after clicks and after Send | lint, tsc, build, headless keyboard test |
| review | `1c0f219` | Guest tags: per-field source (`staff`/`inferred`), so a GM's own pick is never labelled as AI | lint, tsc |
| review | `a055fcc` | 0025 trigger: provenance columns writable by the server only | Postgres 16 run of 0001–0025 + role tests |

Every step: `npm run lint` clean, `npx tsc --noEmit` clean, and `next build` (Turbopack) green in a clean Linux checkout. The build sandbox can't reach Google Fonts, so that copy — never the repo — stubs `next/font/google`.

## 3. What to test on the preview (≈20 minutes)

- **A1** — Generate one draft (wait for the email cron or forward yourself a guest-style email), one chaser ("Generate" in Arrivals), and one brief ("Refresh" in Brief). In Supabase, those rows have `draft_model` / `model`, a prompt version, `draft_generated_at`, and a 64-hex `draft_sha256`. Nothing in those columns is guest text.
- **A2** — Send a reply from the test hotel to your own Gmail. Gmail → ⋮ → *Show original*: `X-AI-Generated: true` and `X-Fondas-AI: origin=drafted; edit=…; review=single; model=…; prompt=…; ref=…`, nothing identifying the guest. Then:
  - edit a draft before sending → `edit=minor` or `edit=major`; send one untouched → `edit=none`;
  - "Approve all" → `review=bulk`;
  - type a reply to a complaint (no draft) → **no** AI headers;
  - the visible email looks exactly as before;
  - save an untouched sent body to `body.txt` → `npm run verify-ai-mark < body.txt` says FOUND; an edited one says NOT FOUND, and `npm run verify-ai-mark -- --ref <ref from the header>` finds it.
  - Also check the brief email in Gmail and Outlook: headers present, footer sentence renders.
- **A3** — Click each surface in en / es / ca, desktop and phone: inbox draft line; a sent reply shows "· edited before sending" or "· sent as drafted"; chaser cards; an Ask answer (line appears when the answer finishes); Brief (today and history) foot line; a guest record with inferred preferences ("· Fondas AI") and tags ("Inferred by Fondas AI, 1 Oct" vs "Added by staff").
- **A4** — "Approve all" with the keyboard only: focus lands on *Review one by one*, Tab stays in the dialog, Esc closes and focus returns to the button. Confirm sends exactly the listed rows. In Supabase, `sent_via = 'bulk'` on those rows and `'single'` on one-by-one sends.

## 4. Decisions taken during the build (deviations from the prompt text)

1. **`hotel_settings` gets review-summary provenance** (A1 listed five tables, not this one). The summary is stored model text that feeds every draft's house profile; the prompt's goal ("every piece of text a model writes") covers it.
2. **`draft_edited` is NULL, not true, when there was no draft.** A reply written from scratch wasn't edited; A2 marks those `origin=written` (no headers).
3. **`emails.updated_at` has no backfill.** Added without a default, then given one, so old rows stay NULL instead of all claiming the migration's timestamp.
4. **Pre-0025 drafts are still marked** (model/prompt `unknown`, ref from the stored draft): they are AI output.
5. **A heavily rewritten draft is still marked `edit=major`.** Over-marking a reviewed reply is invisible; under-marking is the Art. 50(2) failure. Whether a near-total rewrite should count as "written" is a question for the lawyer memo (§6).
6. **The P-8 "· edited" marker now exists**, on the *sent* state (it is only knowable after sending). Written into `APP_UX_PROPOSAL.md` §11 #10.
7. **/sample-brief is unchanged** (no AI foot line): hand-written sample, A4 print rules tuned to one sheet.
8. **Bulk actions take the confirmed ids.** Before, "approve all" sent every eligible row in the hotel — including the other Communications window's, and anything that arrived after the click.
9. **0025 gained** per-field guest-tag sources and a write-guard trigger after the review (it was still unapplied, so it was extended rather than adding 0026, which stays reserved for Reputation).

## 5. Independent review

A separate reviewer read the full diff, ran 0025 on Postgres 16 twice and re-ran tsc. Findings and outcome:

| Finding | Severity | Outcome |
|---|---|---|
| Send wrote status + new columns in one unchecked update → double-send without 0025 | should-fix (blocker if deployed before 0025) | Fixed `95a1e7f` |
| "Send N" could send fewer silently (Ask drafts with no recipient; id cap) | should-fix | Fixed `dffb2cd` |
| Guest-controlled `Subject:` / `To:` could break the header block | should-fix (pre-existing) | Fixed `95a1e7f` |
| Staff-set guest tags labelled "Inferred by Fondas AI" | should-fix | Fixed `1c0f219` |
| Dialog: Esc/Tab dead after clicking text; focus lost after Send | should-fix | Fixed `dffb2cd` |
| Provenance editable by any hotel user via the API; `;` could add header fields | should-fix | Fixed `a055fcc`, `95a1e7f` |
| Legacy drafts' `ref` not findable | nit | Fixed `95a1e7f` |
| Full rewrite still marked as AI | nit | Kept by decision (§4.5) |
| `aria-describedby`, unused id | nit | Fixed `dffb2cd` |
| `verify-ai-mark --ref` uses LIKE (no index) | nit | Left: fine at current table sizes |

Areas the reviewer found clean: PII (nothing about a guest reaches headers, provenance, logs or analytics; `npm run analytics-pii-audit` PASS), the migration's SQL and idempotency, and model IDs living only in `lib/ai-provenance.ts`.

## 6. Still open — not code

- **Native es/ca read** of the new strings (`ai.*`, `bulkSend.*`, `guests.source*`) — `AI_ACT_PROMPTS.md` §L.
- **Lawyer memo** — add the question in §4.5 (rewrite threshold) to the "open questions for counsel".
- **Your own Art. 4 record** (§L) — this build and its audit count; note the date.

## 7. Known limitations left as they are

- The brief email is still English-only (ROADMAP §3.2 defect); its new footer sentence is English too.
- Non-ASCII subjects are sent as raw UTF-8, not RFC 2047-encoded (pre-existing; Gmail copes).
- `guest_profiles` and `hotel_settings` provenance is written by the signed-in user's client by design, so it is not covered by the write-guard.
- A GM can still edit `draft_reply` through the API (the triage policy); the stored hash then describes the original draft, which is the intent.
