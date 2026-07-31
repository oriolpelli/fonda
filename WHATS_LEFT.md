# Fondas — What's Left to a Market-Ready MVP

_Created 31 July 2026, from a full audit of every task in `PATH_TO_MVP.md`,
`BUILD_PLAN_JULY31.md` and `LAUNCH_PUNCHLIST.md` against the actual codebase._

**The build is finished.** B5, B6, B7.1, B8, B9 and B10 are all shipped in code. What's
left is saving it, shipping it, proving it, and a short polish tail. This is the single
list — work it top to bottom.

Two finish lines:

- **When §1–§2 are green, you can demo** to a GM without hitting anything fake or broken.
- **When §3 is green too, you can go to market** — point real hotels at the site and start
  onboarding.

Same rule as always: tick a box because you *used the thing and it worked*, not because a
tool said so.

---

## Confirmed done (so you know the floor)

Build: B5 reliability harness · B6 hotel profile & tone · B7.1 guest inbox · B8 dashboard ·
B9 mobile pass (code) · B10 onboarding wizard (code). Redesign: fake social proof removed ·
newsletter with double opt-in + privacy line (table live, 0 rows) · SEO/OG/sitemap ·
split-screen auth + onboarding. Infra: Sentry on · backups on · all 12 tables have RLS ·
no client-side service-role usage · no secrets ever committed · all three dictionaries in
exact parity (583 keys). The audit found the codebase clean — no design-token or CLAUDE.md
drift in ordinary components.

---

## New issues the audit surfaced (these were on no list)

Four things nobody was tracking. Two touch the demo.

1. **The morning-brief email is still the old design.** The website is the new "Signal"
   look, but the daily brief email template still uses the pre-redesign font (Inter) and
   the old slate/blue-grey palette. It's the one thing a GM sees *every morning* — and it's
   in your demo. Cosmetic, but visible. (Literal hex is unavoidable in email; these are just
   the wrong literal values.)
2. **Analytics and Chat are empty "coming soon" pages still sitting in the sidebar.** A GM
   will click them mid-demo and hit a blank. Either hide them from the nav until they're
   real, or give them a presentable "coming soon" state.
3. **`schema.sql` is missing migration 0011** (the whole 18-column hotel profile). Production
   is fine — the columns are in the live database. The risk is future-only: `schema.sql`
   claims to rebuild a full database from scratch and would silently produce one with no
   hotel profile, breaking Settings and tone-aware drafts. Bites the day you spin up a
   staging DB or restore from scratch.
4. **A stale note to clean up:** the punchlist warns "migration 0016 is NOT applied" — it
   *is* applied (table exists, 0 rows). Fix the note so it doesn't mislead later.

---

## §1 · Do this now — save and ship (highest risk)

**54 files across three finished tasks are sitting uncommitted** (newsletter, B9, B10, plus
shared files and docs). None of it is deployed. This is the exact failure mode the plan
flagged for 29–30 July, now three tasks deep — if this tree is lost, three sessions go with
it. Everything below waits on this.

- [ ] **Commit the uncommitted work** in three labelled groups (newsletter · B9 · B10). Have
  Claude Code do it — it knows the grouping — or I can do it from here.
- [ ] **Decide the `90s` stat.** "90 seconds to review a reply" is a performance claim in the
  ROI band. If you haven't timed it, it's the same unverified-number problem you already
  removed from the testimonials. Time it and keep it, or soften it — but settle it before it
  goes live.
- [ ] **Deploy the redesign** (push). This is the end-of-Block-B release. Do it after the two
  boxes above.
- [ ] **Eyeball `/en`, `/es`, `/ca` on the live site** end to end after deploy — hero,
  illustration, comparison, footer, mobile menu, pricing.

---

## §2 · Before you can demo (blocks a GM demo)

- [ ] **Tidy the sidebar.** Hide Analytics and Chat from the nav until they're real, or give
  each a clean "coming soon" state — so nothing a GM clicks lands on a blank page.
- [ ] **Redesign the morning-brief email** to match Signal (Geist + the Signal palette,
  literal hex is fine here). It's in your demo and in the GM's inbox daily. *Cosmetic —
  do it if time allows before demos, but don't let it block a same-day demo.*
- [ ] **Backfill `RELIABILITY.md`.** Today's check passes (PASS, 1/1 hotels, 7,045 bookings /
  5,659 guests, brief emailed 05:00, mailbox reachable) — but the daily table has five blank
  rows. Fill 28 Jul–1 Aug honestly. Four real logged mornings is the "you can depend on it"
  story; it's the single most important non-feature you're selling.
- [ ] **Run the full demo twice — laptop, then phone.** dashboard → guest inbox with a draft
  → brief → check-ins → chat. Write down anything that would embarrass you and fix it.

**Your verifications** (Claude Code has no Supabase login, so only you can close these):

- [ ] **B9 on a real phone** — read a full brief, reply to one email start to finish, open/close the menu.
- [ ] **B10 as a brand-new hotel** — sign up with a fresh email, reach a real preview brief without ever opening Settings; check the reservation count matches your property. Test the "skip" path too.
- [ ] **The Spanish brief** — confirm it arrives in Spanish, in an inbox that isn't yours, and not in spam.

---

## §3 · Before you go to market (blocks launch, not the demo)

- [ ] **Give `hello@fondas.app` a real inbox.** The site tells visitors to email it; it has
  no inbox behind it yet (the domain can send, not receive). Free forwarding to your iCloud
  is ~10 min — I need to know where `fondas.app`'s DNS is managed (Cloudflare / Vercel /
  registrar) to walk you through it. Full detail in `PATH_TO_MVP.md` final step.
- [ ] **Confirm `NEXT_PUBLIC_SITE_URL` is set on Vercel Preview.** The code falls back to
  production if it's unset, so unset previews leak production URLs into SEO. It's a Vercel
  dashboard setting only you can see.
- [ ] **Wire the 9 dead footer links** (Integrations, About, Careers, Contact, Press, Help
  centre, Changelog, Cookies, Security) — currently `href="#"` with a `°` marker. A simple
  `/contact` page also gives the pricing CTA a real home.
- [ ] **Build the newsletter unsubscribe flow** *before you send your first newsletter* — a
  working unsubscribe link is a legal requirement. Nothing sends today, so it's not urgent,
  but it's illegal to send without it.

---

## §4 · Polish — do before real demos (🟡)

- [ ] Real product screenshots in the feature bento (especially check-in and chat, which have no showcase band).
- [ ] Real Morning-Brief screenshot in the showcase, replacing the hand-built mockup (+ optional 2-min demo video).
- [ ] Reduced-motion visual check on the parallax hero (the code gate exists; watch it with the OS setting on).
- [ ] Hero final QA — headline holds one line on desktop, villa ~70vw, navy line legible over the pool.
- [ ] OG image spot-check — paste a link into Slack/X and confirm the card renders in Geist in all three locales.

---

## §5 · Later / deferred (🟢 and August)

- [ ] Auth verify-email "Open Gmail / Outlook" shortcuts.
- [ ] Review the comparison-table copy ("Late arrivals surface in the brief, not at the door") — make it your wording.
- [ ] Site IA for SEO: real `/features`, `/customers`, `/resources` pages.
- [ ] B11 (read arrival times from email replies) — explicitly droppable.
- [ ] B12 / B13 (analytics page, extra polish) — deferred to August. (Analytics also drives the §2 sidebar tidy above.)

---

## §6 · Housekeeping / tech-debt (not blocking — fix when convenient)

- [ ] Add migration 0011 to `supabase/schema.sql` so a from-scratch rebuild includes the hotel profile. Matters the day you create a staging DB or restore.
- [ ] Correct the stale "migration 0016 is NOT applied" note in `LAUNCH_PUNCHLIST.md` — it is applied.
- [ ] Keep the price in step: `COMPANY.priceMonthly` feeds the site, but Stripe and the `COMPANY.price` prose are hand-synced — update all three together when the price changes.

---

## Decisions you owe (small, but they gate the work above)

1. **The `90s` stat** — keep (after timing it) or soften? Gates the §1 deploy.
2. **Analytics & Chat in the sidebar** — hide them for now, or build "coming soon" states? Gates the §2 demo tidy.
3. **Where `fondas.app`'s DNS lives** — so I can guide the `hello@` inbox setup in §3.

---

## The short version

Commit → decide the `90s` stat → deploy → tidy the sidebar → backfill the log → do your
three phone/signup/inbox checks → run the demo twice. That's the demo-ready line. Then the
`hello@` inbox, the preview env var, the footer links and the unsubscribe flow, and you're
market-ready. Everything in §4–§6 is polish and can trail behind your first conversations.
