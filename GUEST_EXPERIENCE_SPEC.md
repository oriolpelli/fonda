# Fondas — Guest Experience: the tailored stay plan

**Status:** Spec (what, not when — `ROADMAP.md` decides when).
**Owner:** Oriol · **Written:** 2026-09-20
**Reads with:** `APP_UX_PROPOSAL.md` §5.4 (Guests v1, the record this builds on),
`FONDA_SANA_REDESIGN.md` §0.1 (the design system), `gtm/GTM_STRATEGY.md` §3 (why a
pilot lands on this and not on the brief).
**Preview:** `design/guest-plan-print-preview.html` — the printed sheet, A4,
rendered with sample data. Open it in a browser and print it; that is the target.

---

## 0. The pitch, and why it sells a pilot

A guest arrives at a 45-room hotel in Gràcia on a Friday afternoon. The
receptionist says their names, says the child's name, and hands them one sheet
of paper: *Welcome to Barcelona, Marta, Jordi & Lía.* Three days planned around
a seven-year-old, a restaurant the hotel likes with a table already held, the
family concert that happens to be on this Saturday, the museum that is free
because Sunday is the first of the month. Walk times from *this* door. The
reception phone at the bottom.

Nothing else in the product does that in front of the guest. The brief, the
inbox and the chasers save the GM time — a GM buys them after a demo and a
think. The stay plan is the thing the GM can *picture their own guests holding*,
and it is the thing a receptionist shows the owner unprompted. It is also the
one surface a PMS copilot cannot copy from inside the PMS, because it needs
what the hotel knows about its street and what the city is doing this week.

Three things have to be true for it to land, and this document is built
around them:

1. **It must be tailored, visibly.** The names, the party shape, the dates, and
   the neighbourhood. A generic "top ten Barcelona" list is worse than nothing —
   it tells the guest the hotel did not look.
2. **It must be true.** A printed opening hour that is wrong, a phone number
   that rings dead, a "free on Sunday" that isn't — one of those and the desk
   stops printing. §5.4 is the rule that keeps it true.
3. **It must be beautiful on a €120 laser printer.** Single side, black toner,
   no bleed, no special paper. §7.

---

## 1. What it is, in one flow

```
  T-5 days   Fondas generates the plan for every arrival five days out.
             (party shape + guest profile + hotel picks + this week's events)
                   │
  T-1 / day  Receptionist opens Arrivals → row shows  ● Plan ready
             Opens it, reads it, edits a line or two, prints it.
                   │
  Check-in   Hands the sheet over with the key. Says the names.
                   │
  In stay    Guest comes back to the desk: "the concert — can you book it?"
             Receptionist opens the reservation's plan: phone, link, hours,
             all on one screen. Calls, or turns the screen round.
```

Everything above is one nav row, one editor for the hotel's own picks, one
weekly cron, one print route.

---

## 2. Where it lands in the product

### 2.1 The nav

One new row under **OPERATION**, between Guests and Reputation:

```
◷  OPERATION
     Morning brief                      → /dashboard/brief
     Arrivals & departures              → /dashboard/arrivals
     Communications ▾
     Guests                             → /dashboard/guests
     Guest experience         ✦ new     → /dashboard/experience
     Reputation                         → /dashboard/reputation
```

`/dashboard/experience` has two tabs, in the pattern Arrivals already uses:

- **Plans** — arrivals for the next 14 days, one row each, with plan status.
- **Around the hotel** — the hotel's own recommendations and this week's
  discovered events. This is the customisation page.

### 2.2 Routes

| Route | What | Renders |
|---|---|---|
| `/dashboard/experience` | Plans tab (default) | RSC list |
| `/dashboard/experience/around` | Around the hotel: places + events | RSC + client editors |
| `/dashboard/experience/[reservationId]` | The plan for one stay — read, edit, print, book | RSC + client editor |
| `/dashboard/experience/[reservationId]/print` | The print sheet. Print stylesheet, no chrome, `window.print()` on load when `?auto=1` | RSC |
| `/dashboard/settings/experience` | Location, sources, reception contacts, defaults | Settings group |

`reservationId` is our `reservations.id` (uuid), not the PMS id — the URL must
not leak a MEWS identifier, and it must stay stable across PMS re-syncs.

### 2.3 Entry points — the same plan from four places

The plan has one canonical page (`/dashboard/experience/[reservationId]`).
Everything else links to it:

1. **Arrivals row** — a status cell: `Plan ready` / `Printed 09:12` /
   `No plan` (with a `Generate` action). Click → the plan. This is the entry
   the receptionist uses every morning, so it is the one that matters.
2. **Guest record** (`/dashboard/guests/[id]`) — a **Plan** section under the
   Facts column for the current or next stay, and prior plans in the timeline
   ("2 Oct · Plan printed"). The record is where a returning guest's history
   lives; the plan is part of that history.
3. **⌘K** — "Plan for Okonjo" resolves to the current stay's plan.
4. **Home widget** — *Plans to print today*: count + names for today's
   arrivals with a ready plan. Registered in the existing widget registry
   (`lib/home-widgets.ts`); default-on for the Reception role.

### 2.4 What this does *not* add

No guest-facing web page, no email delivery, no QR code in v1. Those are the
obvious next steps (§11) and each one opens a public route or a mail path with
its own privacy work. v1 is a sheet of paper handed across a desk and a screen
the receptionist turns around. That is the whole feature, and it is enough.

---

## 3. The Plans tab

```
┌─ Guest experience ─────────────────────────────────────────────────────┐
│  Plans   Around the hotel                                              │
│                                                                        │
│  TODAY · FRI 2 OCT                                                     │
│  ● Marta Okonjo         2 ad · 1 ch (7)   3 n   Family     Plan ready  │
│  ● Thomas Lindqvist     1 ad              2 n   Business   Printed 08:40│
│  ○ Walk-in / no profile 2 ad              1 n   —          Generate     │
│                                                                        │
│  TOMORROW · SAT 3 OCT                                                  │
│  ● Ana & Pau Ferrer     2 ad              1 n   Romantic   Plan ready  │
│  …                                                                     │
│  NEXT 14 DAYS                                                          │
│  ○ Wu family            2 ad · 2 ch       5 n   Family     Generates Mon│
└────────────────────────────────────────────────────────────────────────┘
```

Grouped by arrival day, the queue framing Communications uses (§7.3 of the UX
proposal): the receptionist's question is "what do I print this morning", not
"show me all plans". Row: guest name · party · nights · trip purpose (from
`guest_profiles`, editable inline exactly as `guest-tags.tsx` does) · status.

Status is a `guest_plans.status` value, and the mono chip discipline from the
sidebar applies — no colour, weight and darkness only:

| Status | Shown as | Meaning |
|---|---|---|
| `pending` | *Generates Mon* | Inside 14 days, outside 5 — cron will pick it up |
| `generating` | shimmer | In flight |
| `ready` | **Plan ready** | Generated, not yet printed |
| `edited` | **Plan ready · edited** | A human changed a line since generation |
| `printed` | Printed 08:40 | `printed_at` set by the print route |
| `failed` | Couldn't generate · Retry | Model or fetch failure; never silent |
| `skipped` | — | Stay under the threshold (§5.1), or hotel opted out |

A bulk action at the top: **Print today's** — opens each ready plan's print
route in turn. Receptionists batch this at 08:00.

---

## 4. The plan page — the screen the receptionist turns around

```
┌──────────────────────────────────────────┬─────────────────────────────┐
│ ← Arrivals                               │  Marta Okonjo               │
│                                          │  Fri 2 – Mon 5 Oct · 3 n    │
│  Welcome to Barcelona, Marta, Jordi & Lía│  2 adults · 1 child (7)     │
│  ─────────────────────────────────────   │  Family · EN                │
│  [intro paragraph — editable]            │  Room 204                   │
│                                          │  ─────────────────────────  │
│  FRIDAY 2 OCT                            │  Print        Regenerate    │
│  17:30 Plaça de la Vila de Gràcia        │  ─────────────────────────  │
│        5 min walk · free                 │  WORTH BOOKING              │
│  20:00 Dinner at Can Roure   OUR PICK    │  Can Roure, Fri 20:00       │
│        4 min · Verdi 12 · ~€28 pp        │   📞 +34 932 000 412  Copy  │
│        [Call] [Copy number]              │   ○ Booked                  │
│                                          │  CosmoCaixa, Sat            │
│  SATURDAY 3 OCT                          │   ↗ cosmocaixa.org    Copy  │
│  10:00 CosmoCaixa                        │   ○ Booked                  │
│        [Open site] [Copy link]           │  Cable car, Sun             │
│  12:30 Concerts en família  THIS WEEKEND │   ↗ telefericdemontjuic.cat │
│  …                                       │   ○ Booked                  │
│                                          │  ─────────────────────────  │
│  [+ Add a line]                          │  SOURCES                    │
│                                          │  Hotel picks 1 · Events 1   │
│                                          │  City 5 · Generated Thu 1   │
└──────────────────────────────────────────┴─────────────────────────────┘
```

**Left** is the plan as it will print, in the same order and the same words,
inline-editable: click a blurb to edit, drag to reorder, `×` to drop a line,
`+ Add a line` to write one by hand (typed lines get `source: 'staff'`). This is
not a form with fields; it is the sheet, on screen. What you see is what prints.

**Right** is what the receptionist needs *while the guest is standing there*:

- **Worth booking** — every item with a `booking` on it, as a phone number with
  **Call** (`tel:`) and **Copy**, or a link with **Open** and **Copy**. A
  **Booked** toggle per item, staff-set, so a colleague on the next shift knows.
  When it is toggled, the print's "Worth booking" well says *Booked for you —
  Fri 20:00* instead of the number. This is the in-stay screen the brief asked
  for: the guest points at a line, the receptionist has the number in hand.
- **Print** — opens `/print?auto=1` in a new tab. **Regenerate** — a confirm
  ("This replaces the plan. Lines you wrote are kept.") then a fresh run.
  Staff-authored lines survive a regenerate, exactly as staff preferences
  survive inference in `guest_profiles` (§5.5).
- **Sources** — how many lines came from hotel picks, discovered events, and
  the model's own city knowledge; when it was generated. Same provenance
  discipline as the chat's source chips (`APP_UX_PROPOSAL.md` §7.4).

The guest context pane (`guest-context-panel.tsx`) does not appear here; the
right column *is* the context for this page.

---

## 5. How the plan is made

### 5.1 When

- **Cron, nightly 05:00 hotel-local**, `/api/cron/plans`: for every hotel with
  `experience_enabled` and a location set, every reservation with
  `start_utc` in **[T+4, T+5)** days and no plan → generate. Same auth pattern
  and `cron_logs` writes as `app/api/cron/checkin/route.ts`. Vercel cron entry
  `0 4 * * *` UTC, hotel-timezone gating inside, as the briefing does.
- **On demand** from the plan page for anything inside five days (walk-ins,
  late bookings), and **Regenerate**.
- **Skip** when nights = 0 (day use), when `state` is cancelled, or when the
  hotel has turned plans off for a rate/channel (v1: an all-or-nothing toggle;
  per-channel is §11).

Five days is the sweet spot: close enough that the week's events are known and
the weather line is a forecast, far enough that a receptionist can look at it
the day before without pressure.

### 5.2 Inputs

| Input | From | Note |
|---|---|---|
| Party: adults, children, nights, weekday pattern, arrival time | `reservations` (+ `checkin_chasers` for ETA) | Children's ages only if the PMS carries them (`raw`); otherwise "a child" |
| First names of the party | `customers` + PMS companions in `raw` | **Surnames never go to the model.** Companions are often absent; then the plan says "you" and the receptionist can add names in review |
| Language | `customers.language_code`, else hotel default | en / es / ca in v1; other codes fall back to hotel default |
| Trip purpose, occasion, preferences | `guest_profiles` | The inference already runs on record open; the plan cron calls the same `inferGuestProfile` if `inferred_at` is null or stale. **`notes` is not an input** — it is staff-private and could contain anything |
| Prior stays | `reservations` by `customer_mews_id` | A returning guest gets *"Welcome back"* and the model is told not to repeat the obvious |
| Hotel picks | `hotel_places` (§6.1) | Filtered by audience tags; `is_pick` rows are always offered to the model first |
| Events in the stay window | `area_events` (§6.2) | Status `candidate` or `approved`, dates overlapping the stay |
| Hotel facts | `hotel_settings` | Address, geo, neighbourhood, reception phone/WhatsApp/email, check-in/out times, `local_recommendations` (the existing free-text field — kept as a fallback input until `hotel_places` has rows) |
| Weather | Open-Meteo, free, no key | Daily high/low + precipitation probability for the stay dates; cached per hotel per day |

### 5.3 The call

One structured **Sonnet** call per plan (the brief's model class, not Haiku —
this is guest-facing prose, and the tone is the product). `output_config` with
the JSON schema for `PlanDocument` (§6.3). System prompt states the hotel, the
neighbourhood, the party, the language, and three rules:

1. *Plan from the door.* Every item states how to get there from the hotel, in
   minutes, walking or one transit line. The model has the hotel's coordinates
   and the place's, and a walking-minutes helper is computed server-side and
   injected — the model does not estimate distances.
2. *Two to three lines a day, never more than seven in total.* An arrival day
   gets an evening; a departure day gets nothing unless check-out is late. A
   one-night stay is "Tonight" and "Tomorrow morning". Stays over five nights
   get the first three days planned and a "Later in the week" list of four.
3. *Prefer the hotel's picks, then this week's events, then the city.* A hotel
   pick with a matching audience tag beats anything the model knows. An event
   in the window beats an evergreen sight. The model's own knowledge fills the
   rest — and is marked `source: 'model'` so §5.4 can check it.

Tone is the brief's: a trusted night manager who knows the street. Warm,
specific, no exclamation marks, no "vibrant", no "nestled". The intro paragraph
says *why this plan is shaped the way it is* ("three nights with a
seven-year-old, so we planned around the mornings") — that sentence is what
makes it read as tailored rather than assembled.

### 5.4 The truth rule

**No fact prints unless it came from a source Fondas fetched or the hotel
typed.** Concretely, every `PlanItem.meta` field (hours, price, phone, URL,
"free today") carries a `verified` flag:

- Items from `hotel_places` — verified by construction; the hotel wrote them.
- Items from `area_events` — verified; they were extracted from a fetched page,
  and carry `source_url`.
- Items with `source: 'model'` — the model proposes the place and *may*
  propose hours/price/phone, but they are stored `verified: false` and a
  second step tries to confirm them: a fetch of the place's official page
  (the model supplies the URL it believes; the fetch must succeed and the page
  must contain the hour/price string) or a match against a `hotel_places` row
  by name. Unconfirmed facts **are dropped from the print** — the item still
  appears, with its blurb and the walk time, and the meta line says
  *check hours at reception* instead. Unverified phone numbers never print.

This costs one or two fetches per model-sourced item and it is the whole
difference between a sheet the desk trusts and one it stops printing. The
sample preview in `design/` shows what a fully-verified sheet looks like; a
real first-week sheet will have more "check hours" lines, and that is fine —
the hotel closes those gaps by adding picks, which is exactly the loop we want.

### 5.5 Edits survive

`PlanItem.source: 'staff'` rows and any item whose `edited_at` is set are
carried into a regenerate unchanged and pinned to their day; the model is
asked to plan *around* them. The intro paragraph, if edited, is kept. Same rule
as `guest_profiles` rule 3, for the same reason: the moment a regenerate can
eat the receptionist's line about the bakery, nobody edits.

### 5.6 Cost

Roughly one Sonnet call (~4k in / 1.5k out) plus 0–4 small fetches and one
Haiku verification pass per plan. Order of €0.05–0.08 per arrival. A 45-room
hotel at 12 arrivals a day is under €30/month — inside the €199 flat price with
room to spare, but it is the first per-guest AI spend in the product, so it
goes through the per-hotel spend cap when B-rate-limiting lands
(`ROADMAP.md` §3.3). Until then: a hard ceiling of 60 plans/hotel/day.

---

## 6. Around the hotel — the hotel's page

### 6.1 Places (the hotel's own recommendations)

```
┌─ Around the hotel ─────────────────────────────────────────────────────┐
│  Plans   Around the hotel                                              │
│                                                                        │
│  YOUR PICKS                                              + Add a place │
│  ★ Can Roure           Restaurant · 4 min · families, couples          │
│  ★ Forn Roca           Bakery · 2 min · everyone                       │
│    Farmàcia Torrent    Pharmacy 24h · 4 min · everyone                 │
│    Bar Bodega Quimet   Bar · 6 min · couples, no children              │
│                                                                        │
│  THIS WEEK'S EVENTS                          Checked Mon 28 Sep, 04:10 │
│  Concerts en família · L'Auditori     Sat 3 Oct 12:00   family   Hide  │
│  Mercat de la Terra · Gràcia          Sat 3 Oct 10–15   everyone Hide  │
│  Open House Barcelona                 24–25 Oct         everyone Hide  │
│  (hidden: 2)                                                           │
│                                                                        │
│  SOURCES WE CHECK WEEKLY                                        Edit   │
│  barcelona.cat/agenda · auditori.cat · timeout.com/barcelona/kids      │
└────────────────────────────────────────────────────────────────────────┘
```

A **place** is one row in `hotel_places`: name, category (restaurant · café ·
bar · bakery · shop · pharmacy · playground · park · beach · museum · sight ·
transport · other), address, coordinates (geocoded on save from the address —
Nominatim, cached; or pasted), phone, URL, booking URL, price hint, hours (free
text, one line), a one-line note in the hotel's words, **audience tags**
(`families` · `couples` · `business` · `groups` · `everyone` · `no-children`),
`is_pick` (the star: always offered first, prints with the **OUR PICK** chip),
`active`.

Ten good rows is enough to change every plan the hotel prints. The empty state
says so: *"Add the five places you already send guests to. The plan will use
them before anything else."* — and offers to seed from the existing
`hotel_settings.local_recommendations` text with one Haiku extraction (each
extracted row shown for confirmation, nothing saved silently).

### 6.2 Events (the weekly scan)

`/api/cron/area-scan`, **Monday 04:00 UTC**, for every hotel with
`experience_enabled`. For each URL in `hotel_settings.area_sources`:

1. Fetch the page (server-side, 10s timeout, 300KB cap, HTML stripped to
   text before it reaches the model — the first outbound page fetch in the
   product, so it gets its own `lib/fetch-page.ts` with those limits baked in).
2. Haiku extraction into `AreaEventCandidate[]` — title, start, end, venue,
   address, price, URL, audience tags — restricted to the next 21 days.
3. Upsert into `area_events` on `(hotel_id, dedup_hash)` where the hash is
   `normalise(title) + start_date + normalise(venue)`. New rows are
   `status: 'candidate'`; a row the hotel hid stays hidden across re-scans.
4. Rows whose `ends_at` passed are deleted in the same run. Events are
   ephemeral by nature; there is nothing to retain.

**Candidates are used by default.** A pilot hotel will not curate a list every
Monday, and an unused feature is worse than an occasionally imperfect line.
The hotel's control is **Hide** (and it is one click), plus the truth rule:
an event prints only with the facts the extraction actually found on the page.

**Sources ship with defaults per city.** `lib/area-sources.ts` carries a
starter list for Barcelona (city agenda, L'Auditori, Palau de la Música, the
kids' agenda on Time Out, Barcelona Turisme's events feed) and Madrid; a hotel
in another city starts with the city's `.cat`/`.es` agenda page guessed from its
address and is told to add more. The founder maintains these lists — it is
part of the "local depth" moat (`gtm/GTM_STRATEGY.md` §2.4), and it is twenty
minutes a city.

### 6.3 Data

```sql
-- migration 0025_guest_experience.sql

alter table public.hotel_settings
  add column experience_enabled  boolean not null default false,
  add column address_line        text,
  add column neighbourhood       text,
  add column city                text,
  add column country_code        text,
  add column lat                 double precision,
  add column lng                 double precision,
  add column reception_phone     text,
  add column reception_whatsapp  text,
  add column reception_email     text,
  add column plan_language       text not null default 'en',   -- fallback when the guest's isn't en/es/ca
  add column plan_print_room     boolean not null default false, -- print the room number on the sheet
  add column area_sources        jsonb not null default '[]'::jsonb; -- [{ url, label, added_by }]

create table public.hotel_places (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels (id) on delete cascade,
  name          text not null,
  category      text not null,
  address       text,
  lat           double precision,
  lng           double precision,
  walk_minutes  integer,                 -- computed from the hotel's geo on save; null if ungeocoded
  phone         text,
  url           text,
  booking_url   text,
  price_hint    text,                    -- "~€28 pp", "free", "€6 / 30 min"
  hours         text,                    -- one line, the hotel's words
  note          text,                    -- one line, the hotel's words — this is what prints
  audience      text[] not null default '{everyone}',
  is_pick       boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.area_events (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels (id) on delete cascade,
  dedup_hash    text not null,
  title         text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  venue         text,
  address       text,
  lat           double precision,
  lng           double precision,
  price         text,
  url           text,
  audience      text[] not null default '{everyone}',
  source_url    text not null,
  status        text not null default 'candidate'
                check (status in ('candidate', 'approved', 'hidden')),
  fetched_at    timestamptz not null default now(),
  unique (hotel_id, dedup_hash)
);
create index area_events_hotel_window_idx on public.area_events (hotel_id, starts_at);

create table public.guest_plans (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','generating','ready','edited','printed','failed','skipped')),
  language       text not null,
  document       jsonb,                  -- PlanDocument (below)
  sources        jsonb,                  -- { picks: n, events: n, model: n, verified: n, unverified: n }
  model          text,
  generated_at   timestamptz,
  edited_at      timestamptz,
  edited_by      uuid references public.users (id),
  printed_at     timestamptz,
  error          text,
  updated_at     timestamptz not null default now(),
  unique (hotel_id, reservation_id)
);

-- RLS: hotel-scoped, all three tables, select/insert/update for authenticated
-- members via current_hotel_id(); the crons write with the admin client.
-- Same policy shape as 0024_guest_profiles.sql.
```

`PlanDocument`, the JSON the model returns and the print renders:

```ts
interface PlanDocument {
  greeting: string;            // "Welcome to Barcelona, Marta, Jordi & Lía."
  intro: string;               // ≤ 55 words — the "why this shape" paragraph
  stay: { from: string; to: string; nights: number; roomLine?: string; checkoutLine: string };
  days: PlanDay[];             // 1–4 in print; the rest under `later`
  later?: PlanItem[];          // stays > 5 nights only
  aside: {
    nearby: { name: string; note: string; walk: string }[];   // 3–5 rows
    gettingAround?: string;    // ≤ 40 words
    weather?: string;          // ≤ 40 words, from Open-Meteo, dated
  };
  preparedBy?: string;         // receptionist's first name, set at print time
}
interface PlanDay { date: string; title: string; subtitle?: string; items: PlanItem[] }  // 1–3 items
interface PlanItem {
  id: string;
  time?: string;               // "17:30"
  title: string;
  blurb: string;               // ≤ 32 words
  chip?: 'pick' | 'event';     // prints OUR PICK / THIS WEEKEND
  meta: { walk?: string; transit?: string; hours?: string; price?: string; note?: string };
  booking?: { kind: 'phone' | 'url' | 'desk'; value: string; label?: string; booked?: boolean };
  source: 'pick' | 'event' | 'model' | 'staff';
  ref?: { table: 'hotel_places' | 'area_events'; id: string };
  verified: boolean;           // §5.4 — false ⇒ meta hours/price/phone are dropped at print
  editedAt?: string;
}
```

### 6.4 Retention and PII

- `guest_plans` holds first names and a room number in prose. It is deleted by
  the existing retention cron **90 days after `reservations.end_utc`** — the
  guest record's 24 months does not apply; a plan has no value once the stay
  is a memory, and it is the most guest-shaped text we store.
- `hotel_places` and `area_events` hold no guest data.
- The model receives first names only, pseudonymised the way the brief's
  input is (`lib/pseudonymise.ts` — extend `reduceSurnames` to companions).
  No email, no phone, no PMS ids.
- Nothing from a plan is logged in plaintext; `lib/analytics.ts` events are
  `plan_generated`, `plan_printed`, `plan_edited`, `booking_marked` with
  hotel id and counts only — its no-guest-PII enforcement covers them.
- The print route is server-rendered behind the dashboard auth and printed
  from the browser. No PDF service, no file stored, nothing leaves the
  session.
- **Room number on the print is off by default** (`plan_print_room`). A sheet
  gets left on café tables. The hotel can turn it on; the sample preview
  shows it on so the layout is proven.
- `/trust` gains one line: *"Stay plans are generated from your booking and
  deleted 90 days after check-out."*

---

## 7. The printed sheet

`design/guest-plan-print-preview.html` is the reference — open it, print it.
The rules below are what it encodes, so the implementation can be checked
against them rather than against a picture.

### 7.1 Format

- **A4 portrait, single side, one page. Always.** `@page { size: A4; margin: 0 }`,
  a `210 × 297mm` sheet with `12mm 14mm 10mm` padding. Never two pages: the
  generator's item limits (§5.3) and copy limits (§7.4) exist so the layout
  can be fixed. If content still overflows — long names, a long language — the
  print route trims `aside.weather` first, then the last item of the last day,
  and logs it. It never paginates.
- **Monochrome-safe.** Every distinction survives a black-and-white laser: the
  hero is a *sand* gradient (light enough to be a tint of grey), chips are
  filled ink or inset grey, wells are `--fonda-surface` with radius. No
  meaning is carried by hue. `print-color-adjust: exact` so the wells print
  at all.
- **Self-contained.** Fonts are Geist + Geist Mono, served from the app as now;
  the preview file embeds them as data URIs so it renders anywhere.

### 7.2 Anatomy, top to bottom

```
 masthead    Hotel name · address                      YOUR PLAN · PREPARED THU 1 OCT
 hero        ┌ sand gradient, r16 ──────────────────────────────────────────────┐
             │ Welcome to Barcelona,                                             │
             │ Marta, Jordi & Lía.                       Fri 2 – Mon 5 October   │
             │ intro paragraph (≤55 words)               3 nights · room type    │
             │                                           Check-out Monday, 12:00 │
             └───────────────────────────────────────────────────────────────────┘
 body        ┌ days (1fr) ─────────────────────────┐  ┌ rail (58mm) ───────────┐
             │ FRIDAY 2 OCTOBER   subtitle           │  │ AROUND THE CORNER  well │
             │ 17:30  Title                          │  │ 3–5 rows, walk minutes │
             │        blurb ≤32 words                │  ├────────────────────────┤
             │        meta line, mono, one line      │  │ GETTING AROUND     well │
             │ - - - - - - - - - - - - - - - - - -   │  ├────────────────────────┤
             │ 20:00  Title  ⬤ OUR PICK              │  │ WORTH BOOKING      well │
             │ …                                     │  │ item · phone / url      │
             │ SATURDAY …                            │  ├────────────────────────┤
             │ SUNDAY …                              │  │ THE WEEKEND        well │
             │                                       │  ├────────────────────────┤
             │                                       │  │ Ask us anything. well-2│
             │                                       │  │ phone · WhatsApp · mail│
             └───────────────────────────────────────┘  └────────────────────────┘
 footer      PREPARED FOR YOU BY NÚRIA · CHECKED THU 1 OCT        Hotel Pati Blau · with Fondas
```

The **hero is the one colour moment** (one gradient per screen, §7.2 of the
design spec — the rule holds on paper). Everything below it is ink on white
with warm grey wells. Only the **"Ask us anything"** well steps to
`--fonda-surface-2` so the eye lands there last.

### 7.3 Type

| Element | Face | Size | Weight | Notes |
|---|---|---|---|---|
| Greeting | Geist | 23pt | 600 | `letter-spacing -0.03em`, line-height 1.04, two lines max |
| Intro | Geist | 9.3pt | 400 | line-height 1.42, `--fonda-text` on the gradient |
| Day heading | Geist | 11.5pt | 600 | hairline rule beneath, subtitle in `--fonda-text-3` 8pt |
| Item title | Geist | 9.8pt | 600 | chip inline after it |
| Blurb | Geist | 8.7pt | 400 | `--fonda-text-2`, line-height 1.36 |
| Meta line | Geist Mono | 6.8pt | 400/500 | `--fonda-text-3`; the booking fact in `--fonda-text-2` 500 |
| Time | Geist Mono | 7.4pt | 400 | 14mm column |
| Eyebrows | Geist Mono | 6.6pt | 500 | uppercase, `0.14em` tracking, `--fonda-text-3` |
| Rail rows | Geist | 8pt | 500/400 | value column mono 7.2pt right-aligned |
| Chips | Geist Mono | 6.2pt | 500 | uppercase, `0.1em`, pill — the one place pills are allowed |

Radii: hero 16px, wells 12px, chips full. No shadows anywhere on the sheet
(shadows are for overlays; paper has none). Hairline `--fonda-border` under
day headings; dashed hairline between items.

### 7.4 Copy limits (enforced in the schema, not hoped for)

- Greeting ≤ 8 words after "Welcome to". Intro ≤ 55 words. Blurb ≤ 32 words.
  Meta ≤ 1 line at 6.8pt mono in a 1fr column ≈ 70 characters — the generator
  gets a character budget, not a wish. Rail paragraphs ≤ 40 words.
- ≤ 7 items on the sheet; ≤ 3 per day; ≤ 5 nearby rows; ≤ 4 worth-booking rows.
- Names: first names only, joined with "&" before the last. Party of more than
  four → "Welcome to Barcelona, Marta & family."

### 7.5 Languages

The sheet renders in `guest_plans.language` (en/es/ca). Day names, dates, and
the fixed strings (eyebrows, "Ask us anything", footer) come from the
dictionaries; the prose comes from the model in that language. Catalan and
Spanish run ~15% longer than English — the copy limits above are set for
Catalan, so English sheets have a little air.

### 7.6 Variants the layout must handle

| Stay | Days column |
|---|---|
| 1 night | "Tonight" (1–2 items) · "Tomorrow morning" (1 item). Rail unchanged |
| 2–4 nights | one heading per day, arrival day gets an evening, departure day omitted |
| 5+ nights | first three days as above, then "Later in the week" — titles and one meta each, no blurbs |
| Business, solo | shorter: 4 items, a "Working" well replaces "The weekend" (a café with plugs, the nearest print shop, a quiet dinner). Room line off |
| No profile / walk-in | a plain "everyone" plan from picks + events — still printed, still with the name |

---

## 8. Settings

`/dashboard/settings/experience`, one settings group in the existing pattern
(`settings-groups.ts`):

- **Turn on stay plans** — the `experience_enabled` toggle, with the cost line
  from §5.6 next to it.
- **Where you are** — address line, neighbourhood, city; a *Locate* action that
  geocodes and shows the coordinates. Plans cannot generate without this and
  the Plans tab says so.
- **How guests reach you** — reception phone, WhatsApp, email. These print on
  every sheet.
- **Language** — fallback plan language.
- **Print the room number** — off by default (§6.4).
- **Sources we check weekly** — lives on the Around the hotel tab too; this is
  the same list.

The onboarding flow gains nothing in v1; a pilot turns this on in Settings on
day two, after the brief is running.

---

## 9. Design-system notes

Everything is inside the v4 system without new tokens. Specifics:

- The Plans tab reuses the Arrivals list primitives; the status cell is the
  mono chip from `sidebar.tsx`'s `SoonChip` family, no colour.
- The plan page's left column is a **canvas** (white, editorial title at the
  Morning Brief scale), the right column a **well**. No shadow between them.
- **OUR PICK** is filled ink; **THIS WEEKEND** is `--fonda-inset`. Same on
  screen and on paper.
- The print route ships its own stylesheet and *no* dashboard chrome; it is
  the only route in the app that sets `@page`.
- No new icons beyond what `lucide-react` has (phone, external-link, copy,
  printer, check).

---

## 10. Phase plan

Three release weeks. `ROADMAP.md` decides which weeks; the suggestion is to
take W7's slot, since Billing is blocked on the legal entity and this is the
feature the pilot demos are missing.

| Phase | Ships | Contents |
|---|---|---|
| **E1 — the plan** | one week | Migration 0025 · Settings group · `hotel_places` editor with the seed-from-text action · `lib/plan-generate.ts` (Sonnet call, walk-minutes helper, verify pass) · `/api/cron/plans` · Plans tab · plan page (read + Print + Regenerate, no inline edit yet) · print route · Arrivals status cell |
| **E2 — the week** | one week | `/api/cron/area-scan` · `area_events` + Hide · default sources per city · events in the generator · weather line · guest-record Plan section · ⌘K · Home widget |
| **E3 — the desk** | one week | Inline edit, reorder, add-a-line, staff lines surviving regenerate · Booked toggles · Print today's · `/trust` line · retention rule · analytics events · ES/CA copy pass on the sheet |

E1 alone is demoable: a hotel with five picks and a location prints a real
sheet for a real arrival. That is the state to reach before the next demo.

### 10.1 Prompts for Claude Code (outline — write the full pack in `APP_UX_PROMPTS.md` §E when scheduling)

- **E1.1** Migration 0025 + types + RLS, mirroring 0024. Apply, verify with
  `verify_schema.sql`.
- **E1.2** Settings › Guest experience group; geocode action; `experience_enabled`.
- **E1.3** `hotel_places` editor on `/dashboard/experience/around` (list, add,
  edit, star, deactivate; seed-from-`local_recommendations` with confirmation).
- **E1.4** `lib/plan-generate.ts` + `lib/plan-verify.ts` + `lib/walk-minutes.ts`;
  the `PlanDocument` schema; pseudonymised input; the truth rule.
- **E1.5** `/api/cron/plans` in the checkin cron's shape; `vercel.json` entry.
- **E1.6** Plans tab + plan page + print route; Arrivals status cell.
- **E2.x / E3.x** as the table above.

Each prompt ends with `npm run lint` and a check of the sheet against
`design/guest-plan-print-preview.html` at 100% in Chrome's print preview.

---

## 11. Decisions owed

| # | Question | Recommendation |
|---|---|---|
| E-1 | Name of the row: **Guest experience** or **Stay plans**? | *Guest experience* in the nav (it is the pillar name we use in pitches), *plan* everywhere inside. |
| E-2 | Events used by default (`candidate`) or approval-first? | Default-on with Hide (§6.2). Revisit if a pilot hides more than it keeps. |
| E-3 | Room number on the print? | Off by default, hotel toggle (§6.4). |
| E-4 | Generate at T-5 or T-2? | T-5. Receptionists want it the day before; events are known by then. |
| E-5 | Sonnet or Haiku for the plan? | Sonnet. The prose *is* the product; Haiku for extraction and verification only. |
| E-6 | Staff `notes` as an input? | No. It is staff-private by contract; a note like "complained last time" must never shape guest-facing text. Preferences (sourced, editable) are enough. |
| E-7 | Languages beyond en/es/ca? | Fallback to the hotel's language; add fr/de/it when a pilot asks (same open question as the brief's). |
| E-8 | A public copy of the plan (QR on the sheet → a hosted page in the guest's phone)? | Not v1. It needs a public unauthenticated route with a guest token, its own expiry, and a decision on whether the hotel's picks become public data. Park in `ROADMAP.md` §3.6 with the trigger "a pilot's guests ask for it". |
| E-9 | Email the plan pre-arrival (it is a natural pre-arrival upsell carrier, B15)? | Not v1 — but design `PlanDocument` so an email renderer can consume it unchanged, which it already can. |
| E-10 | A `/sample-plan` page on the marketing site, like `/sample-brief`? | Yes, cheap, after E1 — the preview is already built from `SAMPLE_HOTEL`. Add to `SITE_REDESIGN_V3.md`'s backlog. |
| E-11 | Per-channel opt-out (no plans for OTA one-nighters)? | Later; v1 is all-or-nothing plus the `skipped` status for day-use and cancellations. |

---

## 12. What I'd protect

If the build has to shrink, keep these three, in this order: the **truth rule**
(§5.4), the **single-page A4 with fixed copy limits** (§7), and **staff lines
surviving a regenerate** (§5.5). Cut the weekly scan before any of them — a
hotel with ten good picks and no events still prints a sheet a guest keeps.
