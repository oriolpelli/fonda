# F1 — Founder checklist (execution guide)

Work top to bottom; the order respects dependencies. Items marked **YOU** are
purchases / credentials / account actions only you can do — Claude guides but
can't perform them. Items marked **CLAUDE** are prepped below or Claude can do.

Tick each in EXECUTION_PLAYBOOK.md as you finish.

---

## 0. GitHub token — DONE ✅
Revoked on GitHub (confirmed). Remote is clean. Nothing to do.

---

## 1. Buy `fondas.app` → add to Vercel  **(YOU)**

Everything below depends on this. Buy the domain (Vercel Domains auto-configures
DNS; any registrar works too). Then Vercel → Project → Settings → Domains → add
`fondas.app` **and** `www.fondas.app` (apex + www).

**When done, tell Claude** — it will verify the domain resolves.

---

## 2. Resend — verify the sending domain  **(YOU click; CLAUDE checks records)**

1. Resend → Domains → Add Domain → `fondas.app`.
2. Resend shows **SPF / DKIM / DMARC** DNS records. Add them at your registrar
   (or Vercel DNS if the domain is on Vercel).
3. Wait for status **Verified** (can take minutes–hours for DNS to propagate).
4. Set `RESEND_FROM=Fondas <briefings@fondas.app>` in both `.env.local` and Vercel.
5. Send a test brief to a personal **Gmail** — confirm it lands in **inbox, not
   spam** (that's what SPF/DKIM/DMARC buy you).

**Paste the Resend DNS-records screen to Claude** and it will sanity-check each
record and tell you exactly where it goes.

---

## 3. Vercel Pro + env vars + crons  **(YOU click; CLAUDE prepped the list)**

Upgrade to **Vercel Pro** (cron reliability needs it). Then Project → Settings →
Environment Variables → add every var below for **Production + Preview**.

**The complete env-var list (from your `.env.local`) — copy each key, paste its
real value from `.env.local`:**

| Key | Notes |
|---|---|
| `MEWS_API_URL` | prod value (`https://api.mews.com`) for real hotels, demo for testing |
| `NEXT_PUBLIC_SUPABASE_URL` | same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — server only |
| `MEWS_TOKEN_ENCRYPTION_KEY` | **secret** — must match local or encrypted tokens won't decrypt |
| `CRON_SECRET` | **critical** — Vercel Cron sends this; without it crons 401 |
| `ANTHROPIC_API_KEY` | **secret** |
| `RESEND_API_KEY` | **secret** |
| `RESEND_FROM` | `Fondas <briefings@fondas.app>` (after step 2) |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | **secret** |
| `GOOGLE_REDIRECT_URI` | `https://fondas.app/connect/gmail/callback` (see §5) |
| `APALEO_CLIENT_ID` | from apaleo.dev |
| `APALEO_CLIENT_SECRET` | **secret** |
| `APALEO_REDIRECT_URI` | `https://fondas.app/connect/apaleo/callback` (see §5) |
| `APALEO_SCOPES` | leave blank to use the code default |
| `SENTRY_DSN` | optional |
| `NEXT_PUBLIC_SENTRY_DSN` | optional |

**Then confirm all 4 crons return 200.** The cron routes are:
`/api/cron/briefing`, `/api/cron/emails`, `/api/cron/checkin`, `/api/sync`.
After deploy, in Vercel → your project → Cron Jobs (or trigger manually), a
healthy run returns HTTP 200.

> This step directly unblocks **B5** (reliability run).

---

## 4. Quick one-offs — do anytime, ~2 min each  **(YOU)**

- **Anthropic spend cap:** console.anthropic.com → Settings → Limits → set a
  monthly cap (protects against a runaway loop).
- **Supabase daily backups:** Supabase → Project → Settings → Database →
  Backups → ensure daily backups are ON.
- **Password manager:** save `MEWS_TOKEN_ENCRYPTION_KEY` (and ideally all
  secrets) to your password manager. If this key is lost, stored PMS tokens
  become undecryptable.

---

## 5. OAuth redirect URIs + Google verification  **(YOU click; CLAUDE prepped URIs)**

Register these **exact** production redirect URIs (Claude derived them from the
code — they must match exactly):

- **Google** (Cloud Console → APIs & Services → Credentials → your OAuth client
  → Authorized redirect URIs):
  `https://fondas.app/connect/gmail/callback`
- **Apaleo** (apaleo.dev → your app → Redirect URIs):
  `https://fondas.app/connect/apaleo/callback`

Then **submit Google OAuth verification** (consent screen per STAGE0 §0.2). This
needs the domain + legal pages live first, and has **weeks of lead time** —
submit as early as possible.

---

## 6. Outreach day 1  **(CLAUDE can help build)**

Build a 30-hotel list (Apaleo Community, Design Hotels / SLH directories,
LinkedIn `"General Manager" boutique Barcelona/Madrid`). Send 5 connection
requests/day using `PILOT_OUTREACH.md` §4 copy; track in the §8 spreadsheet.

> Claude can generate the tracking spreadsheet and adapt the outreach copy —
> ask when you're ready.
