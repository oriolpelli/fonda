# Fonda — Go-Live Runbook

Everything needed to take Fonda from a fresh repo to a working pilot. Work top
to bottom. Items marked **(required)** must be done for the core product
(onboarding → PMS sync → morning briefing) to work; **(optional)** can wait.

---

## 0. What you're standing up

| Feature | Needs |
|---|---|
| Auth, onboarding, dashboard | Supabase |
| PMS sync (reservations/guests) | Supabase + MEWS **or** Apaleo |
| Morning briefing | Supabase + Anthropic (+ Resend to email it) |
| Email assistant | Supabase + Anthropic + Gmail (Google OAuth) |
| Check-in chasing | Supabase + Anthropic + Gmail |
| Ask Your Hotel chat | Supabase + Anthropic |
| Error monitoring | Sentry (optional) |
| Scheduled jobs | Vercel Cron + `CRON_SECRET` |

---

## 1. Accounts to create

- [ ] **Supabase** project — https://supabase.com (required)
- [ ] **Anthropic** API key — https://console.anthropic.com (required for any AI feature)
- [ ] **Vercel** account, repo connected — https://vercel.com (required to deploy + run crons)
- [ ] **Google Cloud** project — https://console.cloud.google.com (required for the email assistant)
- [ ] **Resend** — https://resend.com (required to *email* briefings; the app works without it, just won't send mail)
- [ ] **MEWS** Connector integration (from your pilot hotel) and/or **Apaleo** dev app — https://apaleo.dev
- [ ] **Sentry** project — https://sentry.io (optional)
- [ ] A **domain** (e.g. fonda.app) (optional but recommended)

---

## 2. Generate the secrets you control

```bash
# Token-encryption key (encrypts MEWS, Apaleo, and Gmail tokens at rest)
openssl rand -base64 32      # -> MEWS_TOKEN_ENCRYPTION_KEY

# Shared secret for the cron endpoints
openssl rand -hex 32         # -> CRON_SECRET
```

> Despite its name, `MEWS_TOKEN_ENCRYPTION_KEY` encrypts **all** PMS/mailbox
> tokens (see `lib/encryption.ts`). Keep it stable — rotating it makes every
> stored token undecryptable, forcing each hotel to reconnect.

---

## 3. Supabase (required)

1. Create a project. From **Project Settings → API** copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, secret**)
2. **Apply the schema.** SQL Editor → New query → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → Run. (Or `supabase db push` if
   you use the CLI — it applies `supabase/migrations/*` in order.)
3. **Verify.** Run [`supabase/verify_schema.sql`](supabase/verify_schema.sql) —
   every row should read `ok`. (Anything `MISSING` means the schema didn't fully
   apply.)
4. **Auth.** Email/password is on by default. For frictionless pilot testing,
   Authentication → Providers → Email → turn **off** "Confirm email" (re-enable
   for production).
5. **Backups.** Pro plan → Database → Backups: confirm daily backups are on.

---

## 4. Anthropic (required for AI features)

- Create an API key → `ANTHROPIC_API_KEY`.
- The app uses `claude-opus-4-8` for briefings, email classification/drafts,
  chasers, and chat. Set a usage limit; the email poller fans out one call per
  new email.

---

## 5. Resend (required to email briefings)

1. Create an API key → `RESEND_API_KEY`.
2. **Verify a sending domain** (Domains → Add). Then set
   `RESEND_FROM="Fonda <briefings@yourdomain.com>"`.
3. Without a verified domain the default sender only delivers to your own Resend
   account — fine for a smoke test, not for real GMs.

---

## 6. Google / Gmail OAuth (required for email assistant)

1. Google Cloud Console → **APIs & Services**:
   - **Enable the Gmail API.**
   - **OAuth consent screen**: External. Add scopes
     `.../auth/gmail.readonly` and `.../auth/gmail.send`. While the app is in
     **Testing**, add each pilot's Google account under **Test users**.
   - **Credentials → Create OAuth client ID → Web application.**
     Authorized redirect URI: `https://YOUR_DOMAIN/connect/gmail/callback`
     (and `http://localhost:3000/connect/gmail/callback` for local dev).
2. Copy client id/secret → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. **Heads-up:** `gmail.*` are *restricted* scopes. Pilots work fine as Test
   users, but **public launch requires Google's app verification / security
   assessment** — start that early, it takes weeks.

---

## 7. Apaleo (optional — second PMS)

1. https://apaleo.dev → create an OAuth app (authorization-code flow).
2. Redirect URI: `https://YOUR_DOMAIN/connect/apaleo/callback`.
3. `APALEO_CLIENT_ID`, `APALEO_CLIENT_SECRET`. Leave `APALEO_REDIRECT_URI` /
   `APALEO_SCOPES` blank to use the defaults.

> MEWS needs no app registration — the pilot hotel generates Client + Access
> tokens in their MEWS dashboard (Settings → Integrations → add a **Connector**),
> which the GM pastes into Fonda's Settings page.

---

## 8. Sentry (optional)

- Create a project → copy the **DSN** → set **both** `SENTRY_DSN` and
  `NEXT_PUBLIC_SENTRY_DSN` to it. Leave unset to keep monitoring disabled.
- Source-map upload (the build plugin) is intentionally not wired; runtime
  capture works via `instrumentation*.ts`.

---

## 9. Environment variables (complete list)

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local dev).

| Variable | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase API settings (secret) |
| `MEWS_TOKEN_ENCRYPTION_KEY` | ✅ | `openssl rand -base64 32` |
| `CRON_SECRET` | ✅ (for crons) | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | ✅ (AI) | Anthropic console |
| `RESEND_API_KEY` | ✅ (email) | Resend |
| `RESEND_FROM` | ✅ (email) | your verified domain |
| `MEWS_API_URL` | ⛅ | defaults to `https://api.mews.com` (use `…mews-demo.com` for demo) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ (email assistant) | Google Cloud |
| `GOOGLE_REDIRECT_URI` | optional | defaults to `{origin}/connect/gmail/callback` |
| `APALEO_CLIENT_ID` / `APALEO_CLIENT_SECRET` | optional | apaleo.dev |
| `APALEO_REDIRECT_URI` / `APALEO_SCOPES` | optional | defaults are fine |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional | Sentry |

---

## 10. Deploy to Vercel

1. Import the repo. Framework auto-detects Next.js.
2. Add all env vars from §9 (Production + Preview).
3. Deploy. Note your production URL.
4. **Register the real redirect URIs** now that you know the domain:
   - Google: `https://YOUR_DOMAIN/connect/gmail/callback`
   - Apaleo: `https://YOUR_DOMAIN/connect/apaleo/callback`
5. **Crons** ([`vercel.json`](vercel.json)) deploy automatically. Vercel adds
   `Authorization: Bearer $CRON_SECRET` to each cron call when `CRON_SECRET` is
   set — that's how the routes authenticate.
   - ⚠️ **Plan note:** the schedules below are sub-daily and there are four of
     them. Vercel **Hobby** only allows daily crons / a small quota — you need
     **Pro** for these. On Hobby, change them to daily or trigger manually.

| Cron | Schedule | Does |
|---|---|---|
| `/api/sync` | `*/15 * * * *` | Pull PMS reservations/guests into Supabase |
| `/api/cron/briefing` | `*/15 * * * *` | Generate + email briefings at each hotel's local `briefing_time` |
| `/api/cron/emails` | `*/5 * * * *` | Ingest new Gmail + classify/draft |
| `/api/cron/checkin` | `0 9 * * *` | Daily check-in chaser drafts |

6. **Custom domain** (optional): Vercel → Domains → add `fonda.app`, set the DNS
   records at your registrar. Re-check the OAuth redirect URIs use the final domain.

---

## 11. End-to-end smoke test (manual)

Do this on the deployed URL (or `npm run dev` locally with `.env.local`).

1. **Sign up** at `/signup` → you should be redirected to `/onboarding`.
2. **Onboard**: enter hotel name, rooms, timezone, PMS = MEWS → land on
   `/dashboard` (it'll say "Generating your briefing…" then show an empty-ish
   briefing since there's no data yet).
   - *If you see "Could not find the function provision_hotel…"* → the schema
     didn't apply; re-run `supabase/schema.sql` (§3).
3. **Connect MEWS**: Settings → paste the hotel's Client + Access tokens →
   "Connect MEWS". It validates against MEWS and shows **Connected to MEWS**.
4. **Sync**: Admin (top-right, owner only) → **Sync now**. The page should show
   a sync run with reservation/guest counts and the header dot turns green.
   - *"interval must not exceed 100:00:00"* should not occur — the client chunks
     the window. If counts are 0, check the hotel actually has upcoming bookings.
5. **Briefing settings**: Settings → set GM name, briefing time, language → Save.
6. **Briefing**: Dashboard → **Refresh**. A prose briefing should render with
   arrivals/departures/occupancy. (To test email delivery, hit the cron — see §12.)
7. **Connect Gmail**: Settings → **Connect Gmail** → Google consent → back to a
   "Connected to {address}. We found X emails…" banner.
8. **Email assistant**: wait ≤5 min for the poller (or call the cron, §12) →
   **Emails** tab shows classified emails with draft replies; complaints flagged
   red. Edit a draft → **Send** (goes out via the hotel's Gmail).
9. **Check-in chasing**: **Check-in** tab → **Generate now** → cards appear for
   upcoming guests → **Send** or **Approve all**.
10. **Ask Your Hotel**: header → **Ask your hotel** → click a suggested chip →
    answer streams in. Try "draft an email to a guest…" → a draft card links to
    the inbox.

---

## 12. Triggering crons manually (for testing)

```bash
curl -i https://YOUR_DOMAIN/api/cron/briefing \
  -H "Authorization: Bearer $CRON_SECRET"
# also: /api/sync , /api/cron/emails , /api/cron/checkin
```
A `401` means `CRON_SECRET` isn't set or doesn't match. A `200` with a JSON
summary means it ran. (The briefing cron only generates for hotels whose local
`briefing_time` falls in the current 15-min window — pass nothing special, just
set a `briefing_time` a few minutes ahead and re-run within that window, or test
generation directly via the dashboard **Refresh**.)

---

## 13. Non-negotiables before charging (from the roadmap)

These can't be proven from a build — verify on a real/dummy hotel over a few days:

- [ ] **Briefing generates reliably every morning** (watch the cron for a few days; check the `briefings` table fills daily and emails arrive).
- [ ] **Email drafts are good enough to send unedited** (review a real inbox's worth; tune `tone_guidelines` in Settings).
- [ ] **No crashes on a normal workday** (error boundaries + Sentry are in place; watch Sentry for recurring issues).

Fine to be imperfect at launch: UI polish, mobile layout, AI edge cases.

---

## 14. Known gaps to be aware of

- **`arrival_time` is never populated by sync**, so *every* upcoming confirmed
  guest is eligible for check-in chasing (the 7-day dedupe prevents re-spam).
  Populate it from the PMS (or from guest replies) to target only unknown ETAs.
- **Room types show the PMS category ID**, not a friendly name (we don't cache
  the spaces/categories list).
- **`rates.currentRates` is empty** in briefings/chat — rate plans aren't cached;
  occupancy is the only rate signal.
- **Chat "draft an email"** creates an inbox draft with no recipient — handy as a
  link, but it can't be *sent* until a recipient is added.
- **Stripe billing is not built** (you skipped it) — there's no payment/gating yet.
- **Google app verification** is required before non-test users can connect Gmail.

---

## 15. Quick troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find the function … in the schema cache` | Schema not applied — run `supabase/schema.sql`; it ends with `notify pgrst, 'reload schema'`. |
| `select *` on hotels errors for a user | Expected — token columns are revoked from clients; select explicit columns. |
| Gmail connect succeeds but no refresh token | Ensure consent uses `access_type=offline` + `prompt=consent` (it does) and you didn't previously grant without revoking; revoke at myaccount.google.com and reconnect. |
| Cron returns 401 | `CRON_SECRET` missing/mismatched in Vercel env. |
| Briefing/chat answers look empty | No synced data yet — connect a PMS and Sync now first. |
| Outbound email not delivered | `RESEND_FROM` domain not verified, or Gmail not connected for replies/chasers. |
```
