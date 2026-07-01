# Stage 0 — Unblock & de-risk (action guide)

Companion to `LAUNCH_PLAN.md`. This is the "do this week" list. Items marked
**✅ done by Claude** are already handled in the repo; the rest need your logins,
payment, or a decision. Check each box as you go.

---

## 0.1 — Leaked GitHub token

**✅ done by Claude:** the token was stripped from the local git remote. It is now
`https://github.com/oriolpelli/fonda.git` (no credentials embedded).

**⚠️ you must still do this — resetting the remote does NOT revoke the token:**

- [ ] Revoke the old token at **github.com → Settings → Developer settings →
      Personal access tokens** → find the leaked `ghp_…` token → **Delete/Revoke**.
- [ ] Set up authentication for `git push` again (no helper is currently
      configured). Easiest option — GitHub CLI:

  ```bash
  brew install gh        # if you don't have it
  gh auth login          # choose HTTPS, authenticate in browser
  ```

  Or use SSH instead:

  ```bash
  git remote set-url origin git@github.com:oriolpelli/fonda.git
  # then add your SSH key at github.com → Settings → SSH and GPG keys
  ```

- [ ] Confirm the string is gone from history: `git log -p | grep ghp_` should
      return nothing. (It lived only in the remote URL, not commits, so this
      should already be clean — but verify.)
- [ ] **Rotate any other secret that may have been exposed alongside it.** If this
      repo was ever pushed with secrets, treat the Supabase service-role key,
      `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, and Google client secret as suspect
      and regenerate them. (Your `.env*` is correctly gitignored, so likely fine.)

---

## 0.2 — Start Google app verification (long lead time — start now)

Gmail's `gmail.readonly` and `gmail.send` are **restricted scopes**. Pilots work
as "Test users" without verification, but public signups need Google to verify
the app. It takes weeks, so submit early.

**In Google Cloud Console → APIs & Services → OAuth consent screen:**

- [ ] User type: **External**. Publishing status: start in **Testing** (add each
      pilot's Google account under *Test users*), submit for verification in
      parallel.
- [ ] App name: **Fonda**. User support email: `hello@fonda.app`.
- [ ] App logo: upload the Fonda mark (required for verification).
- [ ] App domain / homepage: `https://fonda.app`
- [ ] Privacy policy URL: `https://fonda.app/en/privacy`
- [ ] Terms of service URL: `https://fonda.app/en/terms`
- [ ] Authorised domain: `fonda.app`
- [ ] Developer contact: your email.

**Scopes — request the minimum and be ready to justify each:**

| Scope | Why Fonda needs it (paste into the justification box) |
|---|---|
| `.../auth/gmail.readonly` | "Read incoming guest emails to classify them and draft context-aware replies for the hotel to review." |
| `.../auth/gmail.send` | "Send the reply the hotel has reviewed and approved, from the hotel's own mailbox." |

- [ ] Because restricted scopes are involved, Google may require a **security
      assessment / CASA** and a short **demo video** showing the OAuth flow and
      how the data is used. Record it once the flow is live on `fonda.app`.
- [ ] Keep scopes exactly to the two above — do not add broader Gmail scopes, or
      verification gets slower and harder.

---

## 0.3 — Domain + email deliverability + redirect URIs

### Domain

- [ ] Buy / confirm **fonda.app** (it's a Google-run `.app` TLD — HTTPS is
      enforced, which is fine for us).
- [ ] In **Vercel → Project → Settings → Domains**, add `fonda.app` and
      `www.fonda.app`. Vercel will show the exact DNS records — typically:
  - `A` record for the apex `@` → `76.76.21.21`, **or** follow Vercel's
    "nameservers" option to delegate DNS to Vercel (simplest).
  - `CNAME` for `www` → `cname.vercel-dns.com`.
- [ ] After the domain is live, set the production env var so OAuth/redirects use
      the real origin.

### Resend (so briefings actually deliver)

Without a verified sending domain, briefing emails only reach your own Resend
account — not real GMs.

- [ ] In **Resend → Domains → Add domain**, add `fonda.app` (or a subdomain like
      `send.fonda.app`).
- [ ] Add the DNS records Resend generates. You will get:
  - an **SPF** record (`TXT` on the sending domain),
  - **DKIM** records (usually `CNAME` or `TXT` — copy the exact values Resend
    shows),
  - a recommended **DMARC** record (`TXT` at `_dmarc.fonda.app`, e.g.
    `v=DMARC1; p=none; rua=mailto:dmarc@fonda.app`).
- [ ] Wait for Resend to show the domain **Verified**, then set:
      `RESEND_FROM="Fonda <briefings@fonda.app>"`.
- [ ] Send a test briefing to a non-Resend inbox (e.g. a Gmail address) and
      confirm it lands and isn't flagged as spam.

### Register production OAuth redirect URIs (once the domain is final)

- [ ] Google OAuth client → Authorised redirect URI:
      `https://fonda.app/connect/gmail/callback`
      (keep `http://localhost:3000/connect/gmail/callback` for local dev).
- [ ] Apaleo app → Redirect URI: `https://fonda.app/connect/apaleo/callback`.

---

## 0.4 — Legal pages

**✅ done by Claude:** the placeholder Privacy Policy and Terms of Service have
been replaced with real, GDPR-aware documents:

- `app/[lang]/(legal)/privacy/page.tsx`
- `app/[lang]/(legal)/terms/page.tsx`
- `app/[lang]/(legal)/company.ts` ← **edit this first**

**⚠️ you must still do this:**

- [ ] Open `company.ts` and replace every `[BRACKETED]` placeholder with your real
      SL details: legal name, CIF, registered office, commercial-registry entry,
      contact emails, and the courts city for jurisdiction.
- [ ] Confirm the email addresses (`hello@fonda.app`, `privacy@fonda.app`) exist
      and are monitored.
- [ ] **Have a Spanish lawyer review both documents and produce a Data Processing
      Agreement (DPA)** — hotels will ask for one, and Google's review expects a
      real privacy policy. These pages are a solid, honest starting point, not
      legal advice.
- [ ] Decide whether you also need a short cookie notice (currently the policy
      states only strictly-necessary cookies are used — true today; revisit if you
      add analytics, see decision #5 in the launch plan).

---

## 0.5 — Config audit (crons / env / Sentry)

Result of reviewing the repo. **Good news: the code side is in good shape.**

**✅ Verified healthy:**

- All four cron routes (`/api/sync`, `/api/cron/briefing`, `/api/cron/emails`,
  `/api/cron/checkin`) require `CRON_SECRET` and check it with a **timing-safe
  comparison** — not spoofable.
- Sentry is wired via `instrumentation*.ts` with **`sendDefaultPii: false`** — guest
  data won't leak into error reports. Good default.
- `.env.local` has all required keys set locally (Supabase, MEWS, Anthropic,
  Resend, Google, Apaleo, Sentry, `CRON_SECRET`, encryption key).

**⚠️ Punch-list for you (mostly in the Vercel dashboard):**

- [ ] **Vercel plan = Pro.** `vercel.json` schedules four sub-daily crons
      (`*/15`, `*/15`, `*/5`, daily). Vercel **Hobby only allows daily crons** —
      on Hobby, three of these won't run. Upgrade to Pro, or temporarily change
      them to daily.
- [ ] **Copy every env var into Vercel** (Production + Preview), not just
      `.env.local`. Especially `CRON_SECRET` — without it in Vercel, crons return
      401 and nothing runs.
- [ ] **Keep `MEWS_TOKEN_ENCRYPTION_KEY` stable and backed up.** Rotating it makes
      every stored PMS/Gmail token undecryptable and forces each hotel to
      reconnect. Store a copy in a password manager.
- [ ] **Turn on Supabase daily backups** (Pro plan → Database → Backups).
- [ ] **Add failure alerting.** After deploy, watch that each cron returns `200`
      for a couple of days (Vercel → Deployments → Cron logs), and confirm Sentry
      is receiving events (set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in Vercel).
- [ ] Optionally set an **Anthropic spend limit** in the Anthropic console now as a
      cheap safety net (proper per-hotel rate limiting is Stage 2, task 2.2).

---

## Stage 0 "done" definition

- [ ] Old GitHub token revoked; `git push` works via gh/SSH.
- [ ] Google verification **submitted** (status: in review).
- [ ] `fonda.app` live on Vercel; Resend domain **Verified**; test briefing email
      lands in a real inbox; OAuth redirect URIs registered.
- [ ] `company.ts` filled in; legal pages live at `/en/privacy` and `/en/terms`;
      lawyer review booked or done.
- [ ] Vercel Pro on; all env vars in Vercel; all four crons returning 200;
      Supabase backups on.
