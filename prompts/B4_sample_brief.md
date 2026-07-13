# B4 — Sample briefing asset (the lead magnet)

Paste the **Session kickoff prompt** (from EXECUTION_PLAYBOOK.md) first, then this.

---

Task B4 — create the "sample briefing" outreach asset per `ROADMAP.md` 1.10.

**Brand name is "Fondas"** (design system is separately "Signal"). No "AI" in the
copy; editorial voice throughout.

Build a **public, static, no-auth** page at `/[lang]/sample-brief` rendering one
beautiful, fully fictional morning brief for an invented 42-room Barcelona
boutique hotel — **"Hotel Miravent"** (invent all details; no real guest data,
no real hotel names).

## Reuse what exists (don't rebuild the brief renderer)

- **`components/dashboard/briefing-article.tsx`** — `BriefingArticle({ content, dict })`
  already renders a brief exactly as the product does (summary + Arrivals /
  Overnight email / Rate alert sections). Use it so the sample looks identical
  to the real thing.
- **`BriefingContent`** shape (from `lib/briefing.ts`) is
  `{ summary: string; arrivals: string; emails: string; rate_alert: string }` —
  all prose, blank-line-separated paragraphs. Build one hardcoded **localized**
  content object per language (en/es/ca) — it's content, not chrome.
- Marketing nav/footer: mirror the landing page (`app/[lang]/page.tsx`) —
  `Wordmark`, `LanguageSwitcher`, footer with privacy/terms.
- Dictionary loading: `loadDictionary` / `dict.*`, same as other `[lang]` pages.

## Content (fictional, editorial — a great night manager's handover note)

Date line + greeting; **arrivals** (2 VIP notes, one late arrival); departures;
an **unconfirmed-ETA** list; one flagged **guest email** with the drafted reply
excerpt; an **occupancy** line with a soft-date signal; and a short "what Fondas
did overnight" footer. Prose, not bullets-and-bold dashboard tone.

## Steps

1. Reuse the brief rendering components/styles from the dashboard so it looks
   exactly like the product. Add marketing nav + footer, plus a single CTA band:
   **"Want this for your hotel tomorrow morning? — hello@fondas.app"**.
2. Provide it in **en/es/ca** via the normal dictionary route pattern (the brief
   body itself can be one hardcoded localized object per language).
3. Add a **print stylesheet** so browser "Save as PDF" produces a clean **A4
   one-pager** (hide nav/CTA on print; `@media print`).
4. Add a link from the **landing page footer**: "See a sample brief" →
   `/[lang]/sample-brief`.

Run `npm run lint`.

## Acceptance check

`/es/sample-brief` renders, reads like a real hotelier's brief, and prints to
one clean A4 page. Save that PDF — it's the attachment for outreach touch 3.

Then tick B4 `- [x] Done` in EXECUTION_PLAYBOOK.md.
