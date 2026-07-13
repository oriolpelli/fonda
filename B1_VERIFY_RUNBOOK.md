# B1 — Brief delivery: verification runbook

Everything Claude Code asked for, turned into a checklist you can run top to
bottom. **Deploy order is migration-first, then code** — do the steps in order.

Files referenced live in `supabase/`:
- `APPLY_0012.sql` — the migration, made idempotent, + verify query
- `E2E_BRIEF_SETUP.sql` — configures the dev hotel for the test
- `E2E_BRIEF_ASSERT.sql` — the acceptance assertion

---

## Step 1 — Apply migration 0012 to the DEV Supabase

The Brief page's Save action writes `brief_recipients` / `brief_send_hour`, and
the cron reads them. Until the columns exist, Save errors ("column doesn't
exist") and B1 can't pass.

1. Open the Supabase dashboard for the **dev** project (`efrkzjcntrwfuceqshph`).
2. SQL Editor → New query → paste the whole of `supabase/APPLY_0012.sql` → Run.
3. Confirm the verify query at the bottom returns **two rows**
   (`brief_recipients` jsonb, `brief_send_hour` smallint default 7).

> It's idempotent (`add column if not exists`, constraint guarded), so re-running
> is safe if you're unsure it applied.

---

## Step 2 — Put real secrets in `.env.local`

`.env.local` currently has placeholders. The admin client throws if the
service-role key is missing, so **cron and provisioning can't run locally at
all** until it's real. Where to get each value:

| Key | Where to get it | Needed for the E2E? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard (dev project) → **Project Settings → API → Project API keys → `service_role` (reveal + copy)**. Server-only secret — never ship to client. | **Yes** — cron won't run without it |
| `ANTHROPIC_API_KEY` | console.anthropic.com → **API Keys**. `generateBriefing()` calls Claude to write the brief body. | **Yes** — needed to generate content |
| `RESEND_API_KEY` | resend.com → **API Keys**. Without it the cron returns `"generated"` instead of `"emailed"` and nothing is marked delivered. | **Yes** — the acceptance check wants `"emailed"` |
| `RESEND_FROM` | A sender on a **verified domain** in Resend, e.g. `Fonda <briefings@yourverifieddomain.com>`. For a quick local test you may use Resend's sandbox sender `onboarding@resend.dev` (only delivers to your own Resend account email). | Yes (a valid value) |
| `CRON_SECRET` | Already set to a real hex value in `.env.local` — reuse it. | Already good |
| `MEWS_TOKEN_ENCRYPTION_KEY` | Already set. | Already good |

Leave `GOOGLE_*` / `APALEO_*` / `SENTRY_*` as-is — not needed for B1.

> Restart `npm run dev` after editing `.env.local` — Next.js only reads env at
> boot.

---

## Step 3 — Configure the dev hotel for the test

The cron only fires a hotel when `localHour(timezone, now) == brief_send_hour`,
so the send hour must match the hotel's current local hour.

1. SQL Editor → paste `supabase/E2E_BRIEF_SETUP.sql`.
2. It sets `briefing_language='es'`, `brief_recipients=[your email]`, and
   `brief_send_hour = current Madrid hour`. **Edit the two marked values**
   (your email; and the send hour if your dev hotel's timezone isn't
   Europe/Madrid).
3. Run it. The final SELECT prints `brief_send_hour` next to
   `hotel_local_hour` — **they must be equal** or the cron will skip.

---

## Step 4 — Run the E2E

```bash
# from the repo root, with .env.local filled in:
npm run dev
# in a second terminal — source CRON_SECRET from the env file:
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)

# First call — should EMAIL and mark delivered:
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/briefing | jq

# Second call — should SKIP (idempotency):
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/briefing | jq
```

**Expected:**
- 1st response: an outcome with `"status": "emailed"` for the dev hotel.
- 2nd response: `"status": "skipped"` for the dev hotel.
- (If a hotel shows `"generated"` not `"emailed"`, `RESEND_API_KEY` is unset or
  `recipients` came out empty — recheck Steps 2–3.)
- (If the hotel is absent from `outcomes` / `considered: 0`, the send hour
  didn't match the local hour — recheck Step 3.)

---

## Step 5 — Assert acceptance

SQL Editor → paste `supabase/E2E_BRIEF_ASSERT.sql` → Run.

**Expected:** `delivered_today = 1` and `error_rows = 0`. Exactly one
`delivered_at` row in `briefings` for the dev hotel today. ✅ B1 passes.

You should also receive the email at the recipient address (in `es`).

---

## Notes / gotchas

- **Madrid hour drifts.** If you set the send hour, then the clock ticks over to
  the next hour before you curl, the cron will skip. Re-run Step 3 to bump
  `brief_send_hour` to the new current hour, and re-run the E2E.
- **`.env.local` restart.** Editing env vars requires a dev-server restart.
- **Sandbox sender.** `onboarding@resend.dev` only delivers to your own Resend
  account email — fine for confirming `"emailed"`, but use a verified domain to
  send to arbitrary recipients.
