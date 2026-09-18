# Fonda — Interface Redesign & Product Spec (v1)

_Draft 1 July 2026. This is the build reference for the navigation redesign and the
page/feature expansion Oriol scoped. It is grounded in the current codebase — each
page notes what already exists vs. what's new. Read `FONDA_DESIGN_IDENTITY.md`
(v2 "Signal", light) before implementing any UI; this spec follows it._

---

## 1. Goals

1. Replace the current dashboard layout with a **persistent left sidebar** that
   navigates between full-page surfaces (the reference Oriol shared), in the
   **light** Signal theme.
2. Reorganize the product around the GM's real workflow: a snapshot **Dashboard**,
   the **Morning Brief**, **Check-ins**, in-house **Concierge**, pre-arrival
   **Communications**, **Analytics**, and **Chat**.
3. Add a rich **Hotel Profile & Tone** settings area so the AI adapts to each
   hotel's style — the highest-leverage change here for output quality.
4. Support **multiple users per hotel with granular per-page access**.
5. Make **language** correct everywhere: auto-detect guest language in/out (mostly
   built), and give the GM clear control over the **morning-brief language and
   recipients** (partly built, not surfaced).

**Design language (unchanged):** Geist + Geist Mono, white/near-black ground, one
navy signal (`#1B3BB3`) used sparingly, flat cards, hairline borders, 10px
controls, light only. The sidebar is the one new structural element.

---

## 2. Navigation & layout

Left sidebar, fixed, full height. Icon **+ label** (unlike today's icon-only
concept — labels help multi-user staff). Active item marked with the navy signal
(left border or tinted background), everything else quiet. Main content fills the
right, `1120px`-ish max content width, generous padding, section rules — same as
the marketing site.

**Primary group (top):**

| Order | Item | Route | Icon (Lucide) | Maps to today |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | `layout-dashboard` | exists (overview) — new content |
| 2 | Morning Brief | `/dashboard/brief` | `sunrise` | exists (`/briefing`) — move up, add settings |
| 3 | Check-ins | `/dashboard/checkins` | `door-open` | exists (`/checkin`) — reframe |
| 4 | Concierge | `/dashboard/concierge` | `concierge-bell` | new (split from emails) |
| 5 | Communications | `/dashboard/communications` | `send` | exists (`/emails`) — reframe |
| 6 | Analytics | `/dashboard/analytics` | `bar-chart-3` | new |
| 7 | Chat | `/dashboard/chat` | `message-square` | exists (widget) — make a page |

**Bottom group:**

| Item | Route | Notes |
|---|---|---|
| Settings | `/dashboard/settings` | Greatly expanded (§5) |
| User selection | account menu | Current user + switch/sign-out; admin sees user management |

**Concierge vs Communications — the boundary rule.** Both are guest messaging; the
split is by **stay phase**, derived from the guest's reservation dates (we already
match emails to reservations in `lib/email-processor.ts`):

- **Concierge = in-house.** Sender has a reservation where `arrival ≤ today ≤ departure`. In-stay requests: late checkout, restaurant, extra towels.
- **Communications = pre-arrival & general.** Future reservations, or no matched reservation. Booking questions, arrival info, pre-stay upsell.

One inbox, one classifier, routed to two views by stay phase. Keep the label copy
explicit ("In-house guests" / "Before arrival") so staff never guess.

---

## 3. Page specs

For each: **purpose · contents · data · permissions · states · notes**. "Data:
new" flags something not yet captured (see §6 for the migrations).

### 3.1 Dashboard
- **Purpose:** the 10-second "how's the hotel right now" snapshot + what to act on.
- **Contents:**
  - Occupancy today (%) and **free rooms** count.
  - **Check-ins / check-outs** counts for today.
  - **14-day view** of occupancy and **ADR** (average daily rate).
  - **Concierge summary** — the few most relevant in-house items right now.
  - **Priority to-do list** — ranked actions (unanswered VIP, unconfirmed ETAs,
    complaints, low-occupancy days) + optional suggestions.
- **Data:** occupancy/rooms/arrivals/departures from `reservations` (have). **ADR
  is new** — rates aren't cached yet (known gap); stub the ADR line until §6 rate
  cache lands. To-do list is derived (see notes).
- **Permissions:** Manager + anyone granted `dashboard`.
- **States:** pre-sync empty state ("Connect your PMS to see today"); loading
  skeletons; error boundary.
- **Notes:** the to-do list is the most valuable and least trivial piece — it's a
  small rules engine (rank by impact) that can later be AI-assisted. Start with
  rules, don't over-build.

### 3.2 Morning Brief
- **Purpose:** read today's brief; configure how it's delivered.
- **Contents:** the brief (editorial prose, as today) + a **Settings** panel:
  - **Recipients:** up to **3 email addresses** (independent of user accounts).
  - **Send time** (per hotel timezone).
  - **Language** (en / es / ca) — surfaced clearly here.
  - Brief history (last 30 days).
- **Data:** `briefings` (have). Brief generation already honors
  `hotel_settings.briefing_language`. **Recipients is new** — today the cron emails
  *all* hotel users; change it to the configured list (§6).
- **Permissions:** Manager + `morning_brief`.
- **Notes / the "stuck in English" fix:** the capability exists (en/es/ca) but the
  control isn't where you look and delivery ignores per-recipient choice. This page
  fixes both: expose the language selector, make recipients explicit, and verify
  end-to-end that a Spanish setting produces a Spanish email.

### 3.3 Check-ins
- **Purpose:** today's (and near-term) arrivals at a glance, to prep the desk.
- **Contents:** per arriving guest — name, room/room-type, **ETA**, **party size
  (pax)**, **online check-in done? (yes/no)**, booking notes, and the existing
  check-in-time chaser action (draft/send to ask unknown ETAs).
- **Data:** `reservations` + `customers` (have) **+ new fields**: `arrival_time`
  (ETA — currently never populated, known gap), `party_size`, `online_checkin`.
  Room-type currently shows the raw PMS id — map to a friendly name (§6).
- **Permissions:** Manager + Staff/Reception + `checkins`.
- **Notes:** ETA/pax/online-checkin depend on pulling those fields from the PMS (or
  capturing ETA from guest replies). Until then, show "ETA unknown → chase."

### 3.4 Concierge (in-house)
- **Purpose:** handle requests from guests currently staying.
- **Contents:** incoming in-house messages, each with an AI **draft reply** to
  review/edit/send; classification + urgency (complaints flagged); guest + booking
  context inline.
- **Data:** `emails` filtered to in-house stay phase (§2). Drafts already generated
  by `lib/email-processor.ts` (now on Sonnet).
- **Permissions:** Manager + Staff + `concierge`.

### 3.5 Communications (pre-arrival / out-house)
- **Purpose:** pre-arrival and general guest messaging + proactive outreach.
- **Contents:** same review/draft/send flow as Concierge, filtered to pre-arrival &
  general; room for **proactive** templates later (pre-arrival welcome, upsell).
- **Data:** `emails` filtered to pre-arrival/general.
- **Permissions:** Manager + Staff + `communications`.

### 3.6 Analytics
- **Purpose:** trends over time (vs. Dashboard's "right now").
- **Contents:** occupancy & ADR trends, RevPAR, pickup/pace, arrivals mix,
  response times / messages handled, brief open rate. Start with occupancy +
  messaging metrics we have; add rate metrics once cached.
- **Data:** `reservations`, `emails`, `briefings`, `chat_logs` (have) **+ rate
  cache (new)** for ADR/RevPAR.
- **Permissions:** Manager only by default (Reception typically excluded).

### 3.7 Chat
- **Purpose:** ask anything about the hotel; promote today's widget to a page.
- **Contents:** the existing streaming "Ask Fonda" over live hotel context, with
  suggested prompts and session history; keep the "draft an email" hand-off.
- **Data:** `lib/hotel-context.ts` + `chat_logs` (have). Now on Sonnet.
- **Permissions:** Manager + anyone granted `chat`.
- **Note:** consider *also* keeping a global command-bar entry to Chat later; not
  required for v1.

---

## 4. Hotel Profile & Tone (the AI-quality lever)

A dedicated Settings section that feeds a compact **hotel profile block** into the
system prompts for Concierge, Communications, Morning Brief, and Chat (extend
`lib/hotel-context.ts`). This is the change most likely to make owners feel the
answers "sound like us."

**Fields**

| Group | Fields |
|---|---|
| Identity | Star rating; property type; check-in / check-out times; policies (cancellation, pets, children) |
| Rooms | Room **types** with count + category per type (e.g. "Deluxe Double ×12"), total rooms |
| Positioning | The "vibe" (free text); target guest / who it's for; neighborhood & signature local recommendations |
| Voice | Tone guidelines (exists: `tone_guidelines`); preferred greeting & sign-off; languages the hotel speaks; do/don't phrases |
| Reputation | TripAdvisor URL; Google/Booking URL; a stored **review summary** we generate once from what you paste |
| Ops | Arrival instructions (exists: `arrival_instructions`); parking/transport; wifi; breakfast details |

**How it's used:** on each AI call we inject a short, structured profile summary
(not the raw fields) so drafts respect star level, name real room types, match the
voice, and can answer concierge questions ("nearest good dinner?") from the
hotel's own recommendations.

**Product note on TripAdvisor:** store the link, but **don't rely on live
scraping** — it's brittle and against most sites' terms. Better flow: you paste the
link (and optionally a few review highlights), we summarize once into the stored
profile, and refresh on demand. The free-text positioning/voice fields carry most
of the value even with no scraping at all.

---

## 5. Settings — full structure

1. **Hotel profile & tone** (§4) — the big new area.
2. **Morning brief** — recipients (≤3), send time, language (§3.2).
3. **Integrations** — PMS (MEWS/Apaleo) connection, Gmail connection, sync status
   (existing components, regrouped here).
4. **Users & roles** (§6) — invite users, set per-page access.
5. **Account** — hotel name, rooms, timezone (existing).

Admin/owner-only items (integrations, users, billing later) are gated.

---

## 6. Users, roles & permissions (granular per-page)

Per Oriol's choice: **per-page access per user**, with role **presets** so it's
fast to administer and doesn't become a chore.

**Model**
- `users.role` — `manager` | `staff` | `custom`.
- `users.page_access text[]` — list of allowed page keys:
  `dashboard, morning_brief, checkins, concierge, communications, analytics, chat, settings, users`.
- `manager` ⇒ implicit access to everything (ignore the array).
- Presets fill the array; the admin can then toggle individual pages (that flips
  the user to `custom`).

**Suggested presets**

| Preset | Gets |
|---|---|
| Manager (GM) | Everything, incl. Settings & Users |
| Reception | Dashboard, Check-ins, Concierge, Communications, Chat |
| Concierge/guest-relations | Concierge, Communications, Chat, Check-ins |
| Read-only owner | Dashboard, Analytics, Morning Brief |

**Enforcement (two layers):**
- **UI:** sidebar only renders permitted items; direct navigation to a blocked
  route redirects to the user's first allowed page.
- **Server:** each route/segment checks `page_access` in the layout (defense in
  depth, like today's auth guard). Data stays hotel-scoped by existing RLS; for
  sensitive pages (Analytics, Settings) add a server check, not just hidden nav.

**Invites:** admin adds a user by email; provisioning stays server-side via the
service role (consistent with today's no-client-INSERT rule).

---

## 7. Language handling

**Guest messages (in/out) — mostly built.** `lib/email-processor.ts` already
detects each email's language and drafts the reply in that same language. Add:
persist a **preferred language per guest** (`customers.preferred_language`) so
repeat/future stays default to it, and use it for proactive pre-arrival messages
where there's no inbound to detect from.

**Morning brief — surface + fix delivery.** `briefing_language` (en/es/ca) exists
and generation honors it. Work: expose the selector in Morning Brief settings,
switch the cron to email the **configured recipients** in that language, and verify
end-to-end. (This is the concrete fix for "I only get it in English.")

**App UI — built.** i18n en/es/ca with a language switcher already exists.

**Open question:** brief/UI currently support en/es/ca only. If pilots need more
guest languages, note that guest-message detection/drafting is model-driven and
already language-agnostic; only the brief + app chrome are limited to the three.

---

## 8. Data-model changes (summary of migrations)

Grouped; each becomes a numbered migration under `supabase/migrations/`.

- **Hotel profile:** extend `hotel_settings` (or a new `hotel_profile` table) with
  star rating, check-in/out times, policies, positioning/vibe, target guest, local
  recs, greeting/sign-off, languages spoken, tripadvisor_url, review_summary,
  amenities. Room types as `room_types jsonb` (or a `room_types` table).
- **Brief delivery:** `brief_recipients` (≤3) — a `jsonb`/text[] on
  `hotel_settings` or a small table.
- **Users/roles:** `users.role`, `users.page_access text[]`.
- **Check-ins:** `reservations.arrival_time` (populate from PMS/guest replies),
  `reservations.party_size`, `reservations.online_checkin bool`; room-type name
  cache (map PMS category id → friendly name).
- **Guest language:** `customers.preferred_language`.
- **Rates (for ADR/Analytics):** a rate cache keyed by hotel + date (unblocks
  Dashboard ADR and Analytics rate metrics).

All new tables/columns inherit the existing per-hotel RLS pattern.

---

## 9. Build sequencing

Ordered to ship value early and keep each step reviewable. Dependencies noted.

| Phase | Deliverable | Depends on |
|---|---|---|
| **A** | Sidebar shell + routing; move existing pages under the new IA; light Signal styling. Non-destructive — reuse current page components. | — |
| **B** | **Hotel Profile & Tone** settings + wire into `hotel-context`. Immediate AI-quality win. | — |
| **C** | Morning Brief page: recipients (≤3), time, **language surfaced**; cron emails configured recipients. Fixes the English-only issue. | — |
| **D** | Dashboard content (occupancy, free rooms, check-ins/outs, concierge summary, to-do list). ADR line stubbed. | rate cache for ADR |
| **E** | Concierge / Communications split by stay phase over the existing inbox. | — |
| **F** | Check-ins enrichment (ETA, pax, online check-in, friendly room types). | PMS fields / arrival_time |
| **G** | Users & roles (granular per-page) + Users admin. | — |
| **H** | Rate cache → real ADR/RevPAR in Dashboard + Analytics page. | rate cache |
| **I** | Chat as a full page (promote the widget). | — |

Recommended real-build order: **A → B → C** first (structure + the two biggest,
lowest-risk wins), then D/E, then G, then H/I.

---

## 10. Open decisions

1. **Room types source:** capture manually in Settings now, or wait to pull from
   the PMS category list? (Manual is faster and always works; PMS sync is nicer but
   depends on caching categories.)
2. **To-do list:** rules-only for v1, or AI-ranked from the start? (Recommend
   rules-first.)
3. **Analytics depth for v1:** occupancy + messaging metrics now, rate metrics
   after the cache — acceptable?
4. **Concierge/Communications:** is stay-phase the right split, or would you rather
   split by message type (request vs. booking)? (Stay-phase matches your framing.)
5. **Extra brief languages** beyond en/es/ca for pilots — needed, or fine for now?
6. **TripAdvisor:** confirm the "paste link → summarize once" approach vs. any
   expectation of live data.
