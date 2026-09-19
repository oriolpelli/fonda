# Fondas — App UX & IA Proposal (v4, "Two Pillars")

**Status:** **Built through phase 12** (19 Sep 2026). Phases 1–12 are shipped
except W7 billing (blocked on the legal entity) and W8 Reputation (blocked on
decision P-4, the review source). Decisions of 18 Sep in §11, plus P-6, P-7 and
P-8 taken during the build and recorded there.
**Owner:** Oriol
**Date:** 2026-09-18
**Scope:** the product (`app/[lang]/dashboard/*`), not the marketing site
**Companion:** a prompt pack (`APP_UX_PROMPTS.md`) once the build order is confirmed
**Sequencing:** this doc says *what*; `ROADMAP.md` says *when*, and wins on priority

---

## 0. How this sits with the other docs

| Doc | Relationship |
|---|---|
| `FONDA_SANA_REDESIGN.md` | **Still the design authority.** Nothing here changes a token, a radius, or the colorless-chrome rule. This proposal is IA + interaction; the material stays exactly as shipped. |
| `NAV_REORG_SPEC.md` | **Superseded on structure** (§3 the tree, §4 what-moves-where). Its §2 rail pattern and §9 Customer.io panel spec **survive intact** — we keep the rail and the panel, we change what they contain. |
| `SITE_REDESIGN_V3.md` / B3 | Untouched. That's the marketing front; this is behind the login. |
| `lib/roadmap.ts` | Stays the single source of coming-soon copy, and gets a **second job** (§3.4). |

One-line summary of the change: **eight flat sections become two pillars and a chat that is a place you go — and the Home page stops being a fixed stats page and becomes the thing each user builds for themselves.**

---

## 1. What the reference set actually does

I went through the Mobbin library for the patterns this app needs, plus otelai.com. Five findings that drive the rest of the document.

### 1.1 otelai.com — the closest competitor read

Their product IA is **Chat · Inbox · Flows · Dashboards · Library · Integrations · Memory · Confidence**, and the site sells by **persona** (Owner/MD, GM, Revenue, Finance) rather than by feature. Three things worth stealing and one worth refusing:

- **Steal: chat is a top-level place, not a widget.** It's the first item in their module list. This matches your instinct exactly.
- **Steal: "only speaks when something needs you."** Their agents are framed as quiet monitors. That is the Morning Brief promise, generalised.
- **Steal: "Confidence — nothing is a black box."** Every answer traces to a source system. Fondas already has the mechanism (`SourceChip` in `chat-thread.tsx`); it just isn't applied outside chat. §7.4.
- **Refuse: persona-segmented dashboards as the organising principle.** They can afford four personas because they sell to groups with four departments. Your buyer is a GM at a boutique property who *is* all four. One customizable Home beats four fixed ones — which is what you already chose.

Note their `#26B7CA` teal-everything chrome. Fonda's colorless chrome is the better-looking system and a real differentiator in this category. Don't drift.

### 1.2 The second-column nav with labelled groups

[Apollo](https://mobbin.com/screens/ab5fc4ba-8529-4e6d-a9fc-6ff4006d8b86) is the sharpest example: a single sidebar broken into named groups — *Prospect and enrich · Engage · Win deals · Tools and automation · Inbound* — with **Assistant pinned at the top, above the groups**. That is precisely the shape you described. [Shopify](https://mobbin.com/screens/04677420-1dd8-4ec6-94b0-481ffbe43286) does the same trick (core items, then a "Growth" group, then "Sales channels"), and [Klaviyo](https://mobbin.com/screens/7a9377d8-6bc4-4746-bcde-a55418e9f376) nests a third level under a group without it feeling deep.

**The lesson:** the grouping work belongs in the *panel*, not in the rail. The rail stays a short stack of icons; each panel opens with a mono eyebrow and can carry one level of nesting inside it. That is already how `RailSection` is built — the panel header exists, we just need nested groups inside it (§2.3).

### 1.3 Customizable dashboards — three tiers, and the one you picked

- [Base44](https://mobbin.com/screens/577ae55a-7229-49f6-b14b-1f43fcf7fd94) — a right-hand **"Customize dashboard"** panel: a checkbox per widget, a drag handle per row, one sentence of explanation at the top. That's it. **This is the pattern you chose and it is the right one.**
- [Xero](https://mobbin.com/screens/e8db89d2-95d7-4b3f-835b-e511011b2e28) — "Add widget" + a column-count selector. Adds layout control; adds a lot of build.
- [Hotjar](https://mobbin.com/screens/f43a5082-26d2-40d3-ba2a-6c4bee3958b5) / [Mixpanel](https://mobbin.com/screens/5e11ed1d-ede3-4aab-bb71-6a9a379679a5) — full board libraries, multiple saved boards, per-tile menus. Out of scope, correctly.

[Asana](https://mobbin.com/screens/1df98632-e928-47ee-b35b-80c519ecd9ad) and [ClickUp](https://mobbin.com/screens/81eba05f-ec09-46ca-9e8a-976fff37b768) both put a single quiet **"Customize" / "Manage cards"** button in the page header — not a settings page, not a modal buried in a menu. Copy that placement.

### 1.4 The "what needs you today" home

[Rox](https://mobbin.com/screens/62b4d10c-498e-49eb-bf78-3b944290f407) is the sharpest version: a greeting, then **"Recommended Actions (7)"** — a ranked feed of things to look at, each with a source chip and a timestamp — with a narrow right column for today's calendar and tasks. [Tana](https://mobbin.com/screens/4297e674-95c8-4646-afe9-96cc77cd4635) opens with *"Good Morning, Alex"* and a **capture composer directly under the greeting**, then Next Up / Pinned. [Deel](https://mobbin.com/screens/403abcf1-892f-4036-9cbd-ba951c6dce7e) runs a literal **"For you today — to-dos that require your attention"** column with a count badge per row.

Fondas already has the engine for this: `lib/todo-rules.ts` produces a ranked, capped, language-free list, and `TodoList` renders it. It is currently a small card in the bottom-right of the dashboard. **It should be the spine of the page, not a footnote.** §3.

### 1.5 The working surface: list · thread · context

Every serious inbox in the set is **three panes, not two**: [Intercom](https://mobbin.com/screens/263e8cd0-fe59-4845-b7db-b0b6e957d292) (list · conversation · Details/Copilot), [Plain](https://mobbin.com/screens/db1a5cad-1e3d-428f-ab61-35ca043e0dbc), [Featurebase](https://mobbin.com/screens/832ce303-3bb3-40bb-806f-bb7c0bc0dc49), [Front](https://mobbin.com/screens/368f2045-9e0c-47a2-a2b7-254c64617374). The third pane answers *"who am I talking to"* without leaving the reply. Fondas' `email-inbox.tsx` is two panes; the guest context it already loads (`withGuestContext` in `lib/inbox.ts`) is spent on a one-line urgency note.

Also note Plain and Front's **queue framing** — *Needs first response · Waiting · Done* — rather than a sort toggle. A queue can be emptied; a sorted list cannot. That's the difference between a tool a GM finishes at 09:40 and one they scroll.

And the guest record itself: [Shopify's customer timeline](https://mobbin.com/screens/04677420-1dd8-4ec6-94b0-481ffbe43286), [Twenty](https://mobbin.com/screens/2909977b-1e1c-4349-9086-7f44eed63259) and [Klaviyo](https://mobbin.com/screens/7a9377d8-6bc4-4746-bcde-a55418e9f376) all use the same anatomy — **facts and tags in a narrow left column, a reverse-chronological timeline on the right**. That is the Guest Experience page, already designed by three good products. §5.4.

---

## 2. The information architecture

### 2.1 The rail: five icons

Today the rail carries **eight sections + Settings**, and `sidebar.tsx` has a comment noting the budget is ~12 before the no-scroll constraint bites. The two-pillar model takes it to **five**.

```
  ▣  Fonda mark                    → /dashboard

  ⌂  Home            ● live        → /dashboard          (the customizable dashboard)
  ✦  Ask             ● live        → /dashboard/chat     (full page, §4)
  ───────────────────────────────  ← hairline, the only structural divider
  ◷  Operation       ▸ panel
  ◈  Commercial      ▸ panel
  ───────────────────────────────  mt-auto
  ⚙  Settings        ● live        → /dashboard/settings
  ◉  Account                        (popover, unchanged)
```

**The third group is gone.** Housekeeping, F&B, Staff, Procurement, Reporting & audit, Chargeback, AI management and Team activity leave the navigation entirely (§2.4). They are not cancelled — they move to `ROADMAP.md`, and each one re-enters the rail the week it ships. With a weekly release train that is a short wait, and in the meantime the nav stops promising eight things that aren't there.

Finance is the odd one out of that set — it isn't really house operations — and it is the one most likely to come back as its own pillar rather than as a row under Operation. That call can wait until there is something to put in it.

**The hairline after Ask is load-bearing.** It says: these two are places you always are; those two are where the product's surface area lives. It is the one new piece of chrome and it costs a `<div className="mx-3 my-2 h-px bg-[var(--fonda-border)]" />`.

Everything else about the rail is **unchanged** — 64px, `--fonda-bg` ground, no right border, monochrome active-by-darkness, ink flyout labels, `SoonMarker` sparkle, the account menu at the foot. Neither pillar carries a coming-soon marker now, because both have live children.

### 2.2 Where every surface lands

Legend: **●** live today · **◐** live but being reworked · **○** coming-soon stub · **✦** new

```
⌂  Home                                    → /dashboard                       ◐  §3
✦  Ask                                     → /dashboard/chat                  ◐  §4

◷  OPERATION
     Morning brief                         → /dashboard/brief                 ●  §5.1
     Arrivals & departures                 → /dashboard/arrivals              ◐  §5.2
     Communications ▾
         In-house                          → /dashboard/communications/in-house   ✦ §5.3
         Upcoming stays                    → /dashboard/communications/upcoming   ◐ §5.3
     Guests                                → /dashboard/guests                ✦  §5.4
     Reputation                            → /dashboard/reputation            ○  ← shared
     Front desk info                       → /dashboard/front-desk/information ○

◈  COMMERCIAL
     Reputation                            → /dashboard/reputation            ○  ← shared
     Revenue management                    → /dashboard/revenue/management    ○
     Demand forecasting                    → /dashboard/revenue/forecasting   ○
     OTA parity                            → /dashboard/revenue/parity        ○
     Upsell AI                             → /dashboard/revenue/upsell        ○
     Room upgrade AI                       → /dashboard/revenue/upgrades      ○
     Sales & marketing                     → /dashboard/sales-marketing       ○

⚙  Settings                                → /dashboard/settings              ●
```

**Twenty-one coming-soon stubs become six.** Fifteen routes leave the product — eight parked to the roadmap, six per-section dashboards deleted, one (Concierge) absorbed.

#### Reputation appears in both panels

It is genuinely both: a GM reads reviews in the morning to find out what broke, and reads them monthly to understand what's moving the score and the rate. So the row renders in both panels, pointing at the same route.

**One rule makes this work:** a shared row has a single **canonical owner** for active-state purposes, and that owner is **Operation** — because the daily read is the operational one, and because two lit rail icons would be a bug, not a feature. Implement it as an optional `canonicalSectionKey` on the nav item; `isSectionActive` already reads `sectionKey` off the active child, so this is a one-field change to the existing logic rather than new machinery.

Route it at `/dashboard/reputation`, not the old `/dashboard/front-desk/reputation` — "front-desk" is no longer a section, and a shared row shouldn't live under either pillar's path.

### 2.3 What the panel has to learn

One new capability: **a labelled sub-group inside the panel** — used once, for `Communications` in Operation.

Reuse the panel header's own treatment, one step quieter: `font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]`, `pl-2.5 pt-3 pb-1`, rows beneath indented to `pl-7` so the icon column still aligns. No chevron, no collapse — at two rows there is nothing to collapse. In the **mobile drawer** the same group renders as a plain indented block inside the existing accordion; do not nest a second accordion.

Build it as a general capability even though only one group needs it today — Finance will want it when it returns, and a one-off special case for Communications would just have to be generalised later.

The three-deltas work from `NAV_REORG_SPEC.md` §9.6 (per-row icons, ground-coloured panel, sparkle marker) is **already shipped** — this builds on it rather than redoing it.

### 2.4 What this deletes

Worth doing in the same pass, because each one is currently costing you something:

0. **The eight parked sections.** Housekeeping, F&B, Staff, Procurement, Reporting & audit, Chargeback, AI management, Team activity. Delete the eight 25-line stub pages and their nav rows. **Keep their rows in `lib/roadmap.ts`** — the copy in `COMINGSOON_CONTENT.md` stays good, it just stops being rendered as a page. Those rows now feed the customize panel's locked tiles (§3.4), which is where the roadmap gets sold from here on. Each returns as a real page, and a real nav row, the week it ships.

1. **The six per-section "Dashboard" children.** Front Desk › Dashboard, Revenue › Dashboard, Operations › Dashboard, Finance › Dashboard, Oversight › Dashboard, plus `/dashboard/analytics`. Six routes that each promise a dashboard, on top of the real one at `/dashboard`. With a *customizable* Home that can carry a Revenue widget and a Housekeeping widget, a per-section dashboard is a worse version of a Home preset. **Redirect all six to `/dashboard`.**
2. **`/dashboard/concierge`.** Absorbed by Communications › In-house (§5.3). Redirect. Its stale docblock claiming `inNav: false` goes with it.
3. **`roadmapNavFeatures()` and the `inNav` field.** Dead — `inNav` is `false` on all 24 rows and the function has no caller. Delete both; the hand-written tree in `layout.tsx` is the real source and should be the only one.
4. **The `dashboardNav` dictionary namespace.** It overlaps `sidebar.*` and only two keys are read. Fold into `sidebar.*`.

### 2.5 Routes & redirects

Live routes keep their URLs except the two that genuinely move:

| From | To | Why |
|---|---|---|
| `/dashboard/checkins` | `/dashboard/arrivals` | it covers departures now (§5.2) — rename with a 301 |
| `/dashboard/communications` | `/dashboard/communications/upcoming` | the parent becomes a redirect to the busier of the two, defaulting to Upcoming |
| `/dashboard/concierge` | `/dashboard/communications/in-house` | absorbed |
| `/dashboard/front-desk/reputation` | `/dashboard/reputation` | shared between both pillars, so it sits under neither |
| `/dashboard/analytics` | `/dashboard` | superseded |
| `/dashboard/{front-desk,revenue,operations,finance,oversight}` | `/dashboard` | per-section dashboards die |
| `/dashboard/operations/{housekeeping,fnb,staff,procurement}` | `/dashboard` | parked to the roadmap |
| `/dashboard/finance/{reporting,chargeback}` | `/dashboard` | parked to the roadmap |
| `/dashboard/oversight/{ai,team}` | `/dashboard` | parked to the roadmap |

Use the redirect pattern `app/[lang]/dashboard/admin/page.tsx` already establishes — sixteen redirect pages in all, the fifteen departures plus Reputation's relocation, which is a move rather than a departure. The parked eight have never been linked from anywhere but the nav that is being removed, so a plain redirect to Home is sufficient — no query preservation needed, unlike the communications case below. `/dashboard/brief` stays — the `NAV_REORG_SPEC.md` §7 URL harmonisation stays deferred, and with pillars instead of Front Desk it is now moot.

> ⚠️ **One thing to check before shipping the rename:** `/dashboard/communications?email=<id>` is a real deep link, used by `NeedsReplyCard` rows and by `DraftResultCard` in chat. The redirect must preserve the query string, and both call sites should be updated to point at the scoped route directly.

---

## 3. Home — the customizable dashboard

### 3.1 The diagnosis

Today `/dashboard` is a fixed vertical stack: greeting → brief teaser → four stats → 14-night occupancy → a two-up of *Needs a reply* and *Do this first*. It is well built and it is the wrong shape for two reasons.

**It buries the answer.** The one question a GM opens this page with is *"what needs me?"*, and the answer is in the bottom-right quadrant, below a chart. Rox, Deel and Tana all put it directly under the greeting. So should we.

**It cannot be wrong for anyone, so it is a bit wrong for everyone.** A 12-room guesthouse owner and a 60-room city GM want different top-four numbers. That is exactly the problem customization solves — and it solves it without you having to guess.

### 3.2 The shape

```
┌──────────────────────────────────────────────────────────────┐
│  Good morning, Marta                         [ Customize ]   │  ← quiet ghost button,
│  Thursday, 18 September · La Casa                            │    Asana/ClickUp placement
├──────────────────────────────────────────────────────────────┤
│  ▸ Needs you today                            (3)            │  ← pinned, not removable,
│    · A complaint from Room 12 is unanswered   2h  →          │    fed by lib/todo-rules.ts
│    · 4 arrivals tomorrow have no ETA              →          │    each row = one TodoItem
│    · Mr Okonjo is a returning guest, no note      →          │
├──────────────────────────────────────────────────────────────┤
│  ▸ Morning brief            [ card, links through ]          │  ← widgets below, in the
│  ▸ Today's numbers          [ 4-up stat card    ]            │    user's own order
│  ▸ Next 14 nights           [ occupancy strip   ]            │
│  ▸ Needs a reply            [ top 3 emails      ]            │
│  …                                                           │
└──────────────────────────────────────────────────────────────┘
```

**"Needs you today" is pinned and cannot be removed.** It is the product's promise. Everything below it is the user's.

Layout stays the single 1120px column; widgets are full-width or half-width (`lg:col-span-1` in a 2-col grid) declared per widget, not chosen by the user. That keeps the Base44 tier honest — pick and order, not resize.

### 3.3 The widget set — ten, all from data you already have

No new integrations. Every one of these can be built from the existing read models.

| Widget | Source | Width | Notes |
|---|---|---|---|
| **Needs you today** | `buildTodoList()` | full | pinned, always first |
| Morning brief | `loadTodaysBriefing()` | full | today's `BriefSummaryCard` |
| Today's numbers | `loadDashboardSnapshot()` | full | today's `StatRow` — occupancy / free / in / out |
| Next 14 nights | `snapshot.outlook` | full | today's `OccupancyStrip`; **keeps the product's one accent** |
| Needs a reply | `loadInbox()` | half | today's `NeedsReplyCard` |
| Arrivals today | `reservations` by `start_utc` | half | new query, ~20 lines; name · room type · ETA-or-not |
| Departures today | `reservations` by `end_utc` | half | mirror of the above |
| VIP arrivals without a note | `snapshot.vipArrivalsWithoutNote` | half | promotes a to-do rule to a surface of its own |
| Inbox pulse | `InboxStats` | half | drafts ready · sent today · avg response |
| Sync health | `deriveConnectionState` + `sync_logs` | half | last sync, last failure — quiet by default |

Two notes on that list. **`checkoutsToday` is already a number in the stat row, but there is nothing behind it** — no list of who is leaving, no late-checkout flags. Departures is the first time check-out becomes something you can act on. And **`vipArrivalsWithoutNote` is already computed and already feeds `buildTodoList` as the `vip_no_note` rule**, capped at two items; as a widget it becomes the full list for a property where that's a daily concern, without inflating the to-do list for everyone else.

### 3.4 The customize panel — and the roadmap trick

Clicking **Customize** opens a right-docked panel, Base44-style: one sentence, then a list of every widget with a checkbox and a drag handle. Reorder by drag, toggle by checkbox, changes save on close. No modal, no separate settings page.

Below the available widgets, a second group: **"Coming soon"** — locked tiles for ADR & RevPAR, Pickup & pace, OTA parity alerts, Review score, Upsell revenue, Housekeeping board, Labour cost. Each renders its `lib/roadmap.ts` blurb, greyed, with the same `Sparkles` marker the nav uses.

**This is how the roadmap gets sold now that the section dashboards are gone** — and it sells better, because the user meets each future feature at the exact moment they are deciding what they want to see every morning. It also gives you a free signal: log which locked widgets get clicked (`lib/analytics.ts` is already there and PII-safe) and you will know what to build next from real demand rather than from the roadmap doc.

### 3.5 Persistence

New table, per-user (you asked for per-user, and `users.id` is `auth.users.id`):

```sql
create table dashboard_layouts (
  user_id     uuid primary key references users(id) on delete cascade,
  hotel_id    uuid not null references hotels(id) on delete cascade,
  widgets     jsonb not null,      -- ordered array of {key, enabled}
  updated_at  timestamptz not null default now()
);
-- RLS: a user reads and writes only their own row, and only within their hotel.
```

A missing row means "defaults", so there is no migration and no backfill. Defaults come from `users.role` — **the first thing in the product to read that column**: `owner` leads with occupancy and the outlook, `manager` leads with arrivals and the inbox. Unknown widget keys in a stored layout are ignored on read, so removing a widget later never breaks a saved layout.

---

## 4. Ask — chat as a place

Your call: **a rail section that opens a full page.** That's the right one, and it is also what otelai does.

### 4.1 What changes

- **`Ask` joins the rail**, second, above the hairline. Icon: `Sparkles` (already the chat glyph in `ChatThread` and `AskYourHotel` — consistent). Label "Ask" in the flyout; `sidebar.chat` already exists in all three dictionaries.
- **`/dashboard/chat` stays the surface** and is already well built — `ChatSurface`'s blank state (centred composer, 44px title, air around it) is exactly right and needs no design work.
- **It gains a thread list.** Today the transcript is in-memory and `reset()` drops it. A GM who asks *"which guest was that?"* on Tuesday should find it on Thursday. This is the single biggest functional gap in chat.
- **The docked bar keeps its job, and gains a handoff.** `AskYourHotel` at the foot of every page is genuinely good — asking without leaving the inbox is worth keeping. It gets one new control: **"Continue in chat ↗"**, which pushes the current thread to `/dashboard/chat?thread=<id>` with the history intact.

### 4.2 Threads

`chat_logs` exists but is flat — `(hotel_id, role, content, created_at)`, no thread, no user. Extend rather than replace:

```sql
alter table chat_logs add column thread_id uuid;
alter table chat_logs add column user_id   uuid references users(id);
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  user_id  uuid not null references users(id)  on delete cascade,
  title    text,                    -- first user message, trimmed; AI-retitled later if you want
  created_at  timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
```

Existing rows keep a null `thread_id` and simply don't appear in the list. The thread list lives in a left column *inside* the chat page (not in the rail) — Sana, [Lightfield](https://mobbin.com/screens/5c0dbeb4-807a-4a7a-8be8-2ca9d251356b) and ChatGPT all do this, and it keeps the rail at six.

> ⚠️ **PII.** `chat_logs` will now hold guest names in plain text with a durable per-user index, where today it holds loose turns. `lib/briefing.ts` already pseudonymises surnames before sending to Claude — decide whether chat transcripts get the same treatment at rest, or whether RLS + the existing hotel scoping is enough. This is a `CLAUDE.md` "treat PII as sensitive" call and should be made deliberately, not by default.

### 4.3 The empty state earns its keep

[Lightfield](https://mobbin.com/screens/5c0dbeb4-807a-4a7a-8be8-2ca9d251356b) lists ten plain-text starter questions under *"Some ideas…"* — no cards, no icons, just tappable lines. That is the cheapest possible way to teach a GM what this thing can do, and it maps directly onto the examples you gave:

> How many check-ins do we have today? · Who is arriving that has stayed before? · Is anyone celebrating something this week? · What did the guest in 14 complain about last time? · How do I handle a late check-out request? · What's our cancellation policy for direct bookings?

The last two matter most: they are *"how do we do things here"* questions, answerable from `hotel_settings` (`policies`, `arrival_instructions`, `tone_guidelines`, `check_in_time`…) which `buildHotelProfileSummary` already feeds into context. Your chat can already answer them. Nobody knows.

### 4.4 Grounding

`ChatThread` already renders a `SourceChip` ("hotel data") and a `StatusLine`. Make the chips **specific** — "Apaleo · today's arrivals", "Gmail · 3 unread", "House policies" — per `FONDA_SANA_REDESIGN.md` §8.2, which specifies exactly this and is the one part of the chat spec not yet built out. This is otelai's "Confidence" pillar, and it is the difference between a GM trusting a number and re-checking it in the PMS.

---

## 5. The Operation surfaces

### 5.1 Morning brief — keep, add "and other important things"

The page is the best thing in the product and needs no redesign. The gradient hero, the 60ch prose, the three-way empty state, the delivery settings on-surface — all correct.

You said "the morning brief **and other important things**". Two additions, both small:

1. **A "Since the brief" block** between the article and the quick actions: anything that landed after the brief was generated — a complaint, a cancellation, a new VIP. Same `TodoItem` rendering as Home. The brief is a 07:00 snapshot; this keeps the page true at 14:00.
2. **Move the history list into a quiet header control.** Seven rows of dates below the delivery form is a lot of page for something used rarely. A "Past briefs" link in the hero's action slot, next to the refresh button, opening `/dashboard/brief/history`.

### 5.2 Arrivals & departures

Today `/dashboard/checkins` is **only** the ETA-chaser grid. You asked for check-ins *and* check-outs. `checkoutsToday` is already computed in `loadDashboardSnapshot` and displayed as a bare number with nothing behind it.

Rename the route to `/dashboard/arrivals` and give it a segmented control:

```
Today  ·  18 September                                    [ Generate chasers ]

   ( Arrivals 12 )  ( Departures 9 )        ← role="group" segmented, same
                                              treatment as the inbox sort toggle
```

- **Arrivals** — the existing chaser grid, plus the arrivals that *don't* need a chaser, so the tab is the whole day rather than only the exceptions. Row: guest · room type · ETA or "no ETA" · returning-guest marker · a link to the guest record (§5.4).
- **Departures** — name · room · departure time · late-checkout requested · outstanding balance flag (once finance data exists; until then, omit the column rather than fake it).

Keep `ChaserItem` exactly as it is — it works. This is a container change, not a component rewrite.

### 5.3 Communications — the two windows

You want two: **in-house** and **future stays**. Before building it, one thing you should know, because it's your own prior decision:

> `lib/stay-phase.ts` carries this comment: *"This once split the inbox in two (FONDA_REDESIGN_SPEC.md §2). In-house guests email rarely enough that the split wasn't worth it."*

That finding is still true **for email**. An in-house guest walks to the desk or texts; they don't email. So a split that only filters email gives you a nearly-empty In-house tab, which reads as a broken feature.

**The split earns its keep the moment In-house owns a channel of its own** — which is exactly what the parked `/dashboard/concierge` route was being held for (WhatsApp / in-stay messaging). So: **build the two windows now, and make In-house the home of that channel**, absorbing Concierge. Until WhatsApp lands, In-house shows in-stay email *and* a first-run card offering to connect WhatsApp — `FirstRunState` already does this shape, and a tab that says "here's what goes here, connect it" is honest, where an empty list is not.

**Mechanically:**

```
/dashboard/communications/in-house   stayPhase === "in_house"
/dashboard/communications/upcoming   stayPhase === "pre_arrival" && arrival >= today
/dashboard/communications            → redirect to whichever has unanswered mail, default upcoming
```

`stayPhaseFor` currently returns only `in_house | pre_arrival`, and `pre_arrival` swallows future stays, past stays *and* unmatched senders. Widen it to `in_house | pre_arrival | post_stay | unmatched`. Past-stay and unmatched mail then needs a home — put both in **Upcoming** for now with a quiet filter chip, rather than inventing a third tab nobody asked for.

**Two upgrades while we're in here** (both from §1.5, both optional but both high-value):

- **A third pane.** `withGuestContext` already loads the guest and their reservation and spends it on a one-line note. A 280px right column — name, stay dates, room type, nationality, language, past stays, a link to the full record — turns "reply to an email" into "reply to a person". Intercom/Plain/Front all do this. It is the single biggest quality jump available in this surface.
- **Queue framing over sort.** Replace (or supplement) the date/urgency toggle with **Needs you · Waiting · Done today**. A queue can be emptied. The data is there: `emails.status` is already `pending | sent | ignored | needs_attention`.

> Note the existing `fondas_inbox_sort` cookie is read server-side so the list doesn't flip after paint. Whatever replaces it must keep that property — it's a real detail and it was the right call.

### 5.4 Guests — the Guest Experience surface, v1

You said there's "a bit of an idea" here. Here is a concrete v1 that is both buildable now and the thing that makes your chat examples actually work.

**The insight:** every guest question you listed — *"what guest was that?", "were they here for a family trip, a work trip, a romantic trip?", "is it their birthday?"* — is a question about a **guest record that doesn't exist yet**. Build the record, and the chat gets good for free, because `buildHotelContext` reads cached Supabase data.

**`/dashboard/guests`** — a searchable list. Default view "In house & arriving", searchable across all of `customers`. Row: avatar (`GuestAvatar` exists) · name · dates · room type · tags.

**`/dashboard/guests/[id]`** — the Shopify/Twenty anatomy:

```
┌────────────────┬─────────────────────────────────────────┐
│ Marta Okonjo   │  TIMELINE                               │
│ ●●● Returning  │                                         │
│                │  Today   Draft reply sent — "late       │
│ Stay           │          check-out request"             │
│  14–18 Sep     │  16 Sep  Arrived · no ETA given         │
│  Double sea    │  12 Sep  Check-in chaser sent           │
│                │  ──────────────────────────────         │
│ Facts          │  Mar 2026  Previous stay, 3 nights      │
│  ES · Spanish  │            "asked for a quiet room"     │
│  2 adults      │                                         │
│  3rd stay      │                                         │
│                │                                         │
│ Tags           │                                         │
│  Anniversary   │                                         │
│  Quiet room    │                                         │
└────────────────┴─────────────────────────────────────────┘
```

Left column is facts, all of which exist today in `customers` + `reservations` (`nationality_code`, `language_code`, `adult_count`, `child_count`, `start_utc`, `end_utc`, `requested_category_id`, and a count of prior reservations for the same `customer_mews_id`). Timeline is `emails` + `checkin_chasers` + prior reservations, merged by date — the same join `lib/inbox.ts` already does, run the other way round.

**The tags are the new part**, and they are what answers your trip-type and birthday questions:

```sql
create table guest_profiles (
  hotel_id     uuid not null references hotels(id) on delete cascade,
  customer_mews_id text not null,
  trip_purpose text,           -- leisure | business | family | romantic | group | unknown
  occasion     text,           -- birthday | anniversary | honeymoon | null
  preferences  jsonb,          -- inferred, each with its source
  notes        text,           -- staff-written, never AI-overwritten
  inferred_at  timestamptz,
  primary key (hotel_id, customer_mews_id)
);
```

Inferred by the same Haiku classifier pattern as `lib/email-processor.ts`, from the email thread plus reservation shape (2 adults + 1 night + weekend ≈ romantic; 2 adults + 2 children + 7 nights ≈ family; single adult + midweek ≈ business). **Every inferred tag carries its source and is editable**, and `notes` is staff-only so an AI pass can never wipe what a receptionist wrote. That last rule matters more than the accuracy of the inference.

> ⚠️ **This is the PII-heaviest surface in the product.** A durable, queryable, AI-enriched guest record is a different thing from a cached reservation, and `CLAUDE.md` is explicit about guest data. Before building: confirm retention (does a profile outlive the reservation, and for how long?), confirm it never leaves server components, and confirm `lib/analytics.ts`'s no-guest-PII enforcement covers the new events. Worth a look at whether the GDPR position needs a line in `/trust` too.

---

## 6. Commercial development — what to actually stand up

Right now Commercial is seven stubs. That's fine for launch — but one of them can be real almost immediately, and it's the one that makes the pillar credible.

**Decided: Reputation first, then Revenue Management.**

- `hotel_settings` already has `tripadvisor_url`, `review_highlights` and `review_summary`, and `tripadvisor-form.tsx` (101 lines) already collects them. The data path is half-built.
- It needs **no PMS rate data**, which Revenue Management does and which you explicitly don't have cached yet (the `OccupancyStrip` ADR row is an admitted placeholder — and leaving it a placeholder is the right call; an invented ADR is the fastest way to lose a GM).
- It reuses machinery you have: fetch reviews → classify with Haiku → theme them. That is `lib/email-processor.ts` with a different prompt.
- It produces a number a GM checks weekly, which gives the Commercial pillar a reason to be clicked before any revenue feature ships.

**Revenue Management is second, and it starts with the rate cache, not the UI.** It is blocked on a real dependency: `rates.currentRates` is empty in briefings and chat because rate plans aren't cached (`RUNBOOK.md` §14), which is the same gap behind the occupancy strip's honest ADR placeholder. That cache is tracked as B17 and it is a data project — build it, let it prove itself in the brief as a prose signal first ("Thursday is 40% sold at €145"), and only then put a management surface on top. Shipping the surface first means shipping a pricing tool with no prices.

Everything else in Commercial stays a stub this round.

---

## 7. Cross-cutting moves

### 7.1 A command palette (⌘K)

Every reference app has one. For a GM it's: jump to a guest, jump to a reservation, jump to a page, start a chat. It is also the **honest answer to "the app has more surfaces now"** — grouping helps, but search is what makes a growing product stay fast.

Scope it small: pages first (static, from the nav tree), guests second (a `customers` query), chat third ("Ask: …" as the last row, handing the query to `/dashboard/chat`). Skip reservations in v1.

### 7.2 The context pane

Described in §5.3 for the inbox; the same component serves the arrivals list and the guest list. Build it once as `components/dashboard/guest-context-panel.tsx` and mount it in three places.

### 7.3 Queue states over sorts

§5.3. Applies to the inbox now and to the chaser grid later — "12 arrivals, 4 still need an ETA" is a queue; "sorted by urgency" is a list.

### 7.4 Provenance chips everywhere

`SourceChip` exists in chat. Extend the same 12px `rounded-full` chip to:

- each brief section — *"from Apaleo · synced 06:40"*
- each draft reply — *"drafted from this thread + house tone"*
- each Home widget — a quiet freshness line rather than a chip, so the page doesn't rattle

otelai sells this as "Confidence". For a hotel handing guest correspondence to an AI, it is the trust mechanism, and you already own the component.

### 7.5 Loading and empty states

`dashboard/loading.tsx` exists; the new routes each need one. `EmptyState` and `FirstRunState` are already well-factored and correctly distinguished (nothing-to-do vs. not-set-up) — keep using both rather than adding a third.

---

## 8. Design-system deltas

### 8.1 The good news

The audit is clean. **Zero hard-coded hex, zero `bg-white`, zero `text-black` anywhere in `components/dashboard/`, `components/ui/` or `app/[lang]/dashboard/`.** No dark chat bubbles. The old `--fonda-accent-light` / `#ECEFFC` survive only in comments recording their deletion. Exactly one accented element exists in the whole product (today's bar in `OccupancyStrip`), which is what §10 of the redesign spec asks for.

**Nothing in this proposal requires a token change.** Everything below is additive component work inside the existing system.

### 8.2 The primitive problem — a decision for you

`components/ui/` has **six files, 252 lines**: card, button, input, label, textarea, skeleton. No Dialog, Tabs, Popover, Tooltip, Dropdown, Table, Badge. Every disclosure, segmented control, badge and tab in the app is hand-rolled inside its consumer — which is why `sidebar.tsx` is 1,357 lines and `email-inbox.tsx` is 543.

This proposal adds: a customize panel (drag + checkbox), two segmented controls, a command palette, a context pane, a guest table, and nested nav groups. Hand-rolling all of that adds maybe 800 lines of bespoke a11y that the sidebar has already had to get right once.

`components.json` is configured but the set was never expanded. Per `CLAUDE.md` ("do not add new dependencies without flagging it first"), it was flagged and **option C is approved**: one new dependency, `@dnd-kit/core` + `@dnd-kit/sortable`, for the drag-reorder in the customize panel only. Everything else follows the sidebar's existing disclosure and focus-trap patterns, which are proven and worth reusing.

The options as considered, for the record:

| Option | What it costs | What it buys |
|---|---|---|
| **A — Add 5 Radix primitives** via shadcn: `dialog`, `popover`, `tabs`, `tooltip`, `dropdown-menu` | ~5 `@radix-ui/*` packages, ~40KB gzipped, restyling each to the Fonda tokens | Correct focus management, escape handling and ARIA for free. Shrinks `sidebar.tsx`. |
| **B — Hand-roll, following the sidebar's patterns** | Zero deps; ~800 lines of new code; every one of them a chance to get focus-trapping wrong | Total control; no restyling pass; stays literally dependency-light per §5.3 of the redesign spec |
| **C — Hybrid (my recommendation)** | 1 dep (`@dnd-kit/core` or `@dnd-kit/sortable`) for the drag-reorder only | Drag-and-drop is the one thing genuinely painful to hand-roll accessibly. Everything else follows the sidebar's existing disclosure pattern, which is good and already proven. |

**C is the approved path.** The sidebar's popover/disclosure code is solid and worth reusing; drag-reorder with keyboard support is not worth rebuilding.

> One escape hatch kept open: if `@dnd-kit` turns out to be awkward against the customize panel's layout, **ship it with up/down arrow buttons instead of drag** — zero dependencies, and reordering ten items twice a year does not really need a drag surface. Don't let the dependency block the phase.

### 8.3 Small conformance items

- **`text-primary` as a link colour** in 3 places (`brief/page.tsx:158`, `briefing-generating.tsx:66`, `settings/connections/page.tsx:194`). Renders fine (`--primary` → `--fonda-ink`), but `button.tsx`'s own comment says in-app links should be a plain `LocaleLink` in `--fonda-text` with an underline. Fix while nearby.
- **Every remaining hard-coded hex in the repo is legitimate** — SVG illustration art, OG images via Satori (which cannot read CSS vars), email HTML for the briefing cron (nor can email clients), the macOS traffic-light dots in the marketing window mocks, and the root error boundary which renders before the stylesheet. The three that used to sit in `app/[lang]/page.tsx` are already gone in your B3 working tree; only the explanatory comments remain. Nothing to do here.
- **Amend `FONDA_SANA_REDESIGN.md` §5** the way `NAV_REORG_SPEC.md` did: a short paragraph noting the rail now carries two pillars plus a quiet third group, and that the panel supports one level of nesting.

---

## 9. Data & schema summary

Three new tables, two column additions, one widened union. Nothing destructive.

| Change | For | Risk |
|---|---|---|
| `dashboard_layouts` (new) | §3.5 | none — absent row = defaults |
| `chat_threads` (new) + `chat_logs.thread_id`, `.user_id` | §4.2 | none — null thread_id rows just don't list |
| `guest_profiles` (new) | §5.4 | **PII review required before building** |
| `StayPhase` widened to 4 values | §5.3 | pure function, computed on read, never stored — safe |
| `reservations` arrivals/departures queries | §3.3, §5.2 | read-only |

All new tables need RLS scoped to the hotel (and to the user, for layouts and threads), consistent with every existing table. Per `CLAUDE.md`: no service-role shortcuts.

---

## 10. Phase plan

Each phase is independently shippable and independently reviewable. Phases 1–3 are the IA change and are worth doing as one stretch; 4+ are features.

| # | Phase | Touches | Done when |
|---|---|---|---|
| **1** | **The rail: five icons, two pillars** | `layout.tsx` (tree), `sidebar.tsx` (hairline, nested group, `canonicalSectionKey`), `dictionaries/*` | Five icons, two panels, nesting works in panel + drawer, Reputation lights Operation only, mobile accordion unchanged in behaviour |
| **2** | **Redirects & deletions** | 15 stub pages → redirects, `roadmap.ts` cleanup, `dashboardNav` fold | No dead routes, no dead code, `?email=` deep link preserved, roadmap rows kept for the locked tiles |
| **3** | **Ask in the rail** | `sidebar.tsx`, `chat/page.tsx` | Chat reachable from the rail; docked bar unchanged; starter questions in the blank state |
| **4** | **Home v1 — "Needs you today" first** | `dashboard/page.tsx`, widget extraction | Existing cards become widgets in a registry; todo list moves to the top; no customization yet |
| **5** | **Home v2 — customize** | customize panel, `dashboard_layouts`, role defaults | Pick + reorder, saved per user, locked roadmap tiles in the panel |
| **6** | **Arrivals & departures** | route rename, segmented control, departures query, `TodoTarget` | Both tabs real; chaser grid unmoved; `todo-rules.ts`'s `{ page: "checkins" }` target renamed with it |
| **7** | **Communications, two windows** | `stay-phase.ts`, two routes, redirect | In-house and Upcoming both real; concierge absorbed; WhatsApp first-run in In-house |
| **8** | **The context pane** | `guest-context-panel.tsx`, mounted in inbox | Third pane at `xl`; below that it stays two-pane |
| **9** | **Chat threads** | `chat_threads`, thread list, handoff | A question asked Tuesday is findable Thursday |
| **10** | **Guests v1** | list + record, `guest_profiles`, inference | Record page live; tags inferred with sources; staff notes protected |
| **11** | **Reputation** | the one real Commercial surface | Reviews fetched, themed, score movement shown |
| **12** | **Sweep** | provenance chips, command palette, `text-primary`, doc amendments | `npm run lint` clean; no navy in chrome; AA re-verified on new surfaces |

**If you only ship three:** 1, 2, 4. The IA change plus a Home that leads with what needs you is most of the perceived improvement, and none of it needs a migration.

---

## 11. Decisions — settled 18 September

| # | Question | Decision |
|---|---|---|
| 1 | The third group | **Dropped.** The eight sections leave the nav and live in `ROADMAP.md`; each returns the week it ships. Finance is the likeliest to come back as its own pillar rather than a row. |
| 2 | Reputation → which pillar | **Both.** Shared row in each panel, canonical owner Operation for active state, route `/dashboard/reputation`. |
| 3 | Primitives A / B / C | **C.** One dependency (`@dnd-kit`) for drag-reorder; everything else follows the sidebar's existing patterns. |
| 4 | In-house absorbs Concierge | **Yes**, and it carries the future WhatsApp channel. |
| 5 | Reputation before Revenue Management | **Yes** — and Revenue Management starts with the rate cache (B17), not a UI. |

| 6 | Guest-data position | **Settled 18 Sep** — see below |

| 7 | The two pillar hrefs | **Deliberately unrouted** — see below |

| 8 | P-6 · The rail's shape | **Overturned 19 Sep** — see below |

| 9 | P-7 · `done_today` and ignored mail | **Decided 19 Sep** — see below |

| 10 | P-8 · No "· edited" marker on drafts | **Decided 19 Sep** — see below |

### 6 · The guest-data position

**Decided:**

1. **`guest_profiles` rows are kept for 24 months after the guest's last stay**, then hard-deleted by a nightly cron.
2. **Chat transcripts are pseudonymised at rest but not in the live context window.** The GM sees real names on screen and Claude receives real names in the request; what lands in `chat_logs` has surnames replaced, the same treatment `lib/briefing.ts` already applies.
3. **Both are stated on `/trust`.** It costs nothing and it is exactly what a hotel's DPO asks about — better to have the line written before the lawyer conversation than after.

**On capacity, which was the open question.** Measured against the schema rather than estimated:

A 30-room property at ~70% occupancy with an average 2.5-night stay produces roughly **3,000 reservations a year**, so `guest_profiles` reaches about **6,000 rows — 3 to 6 MB — per hotel over the full 24 months**. It is one of the smallest tables in the product and retention is not a capacity question.

For scale, the same hotel writes **~140,000 log rows a year**: `sync_logs` takes one row per hotel per sync and sync runs every 15 minutes (~35,000/year), and the emails cron writes one `cron_logs` row per hotel per run, unconditionally, on a 5-minute schedule (~105,000/year). **Twenty-four months of guest profiles costs about the same storage as ten days of cron logs.**

So: the retention policy is safe, and the thing that will actually grow the database is operational logging that nobody has put a ceiling on. That is now tracked in `ROADMAP.md` §3.2 as its own item — it is a real finding, not a footnote to this one.

### 9 · P-7 · What "Done today" counts, and the `all` queue *(19 September)*

The queue framing (§5.3) asks for three queues: **Needs you**, **Waiting**,
**Done today**. Building it surfaced a gap the spec did not know about.

**The `emails` table has `created_at` and `sent_at` and no `updated_at`.** So
the moment a message was *sent* is recorded, and the moment a message was
*ignored* is not recorded anywhere. "Done today" can count what was sent today;
it cannot count what was ignored today without inventing a timestamp.

**Decided:** it does not invent one. `done_today` is sent-today only. A count on
screen that is quietly wrong is worse than a count that is narrower than you
expected — and this is the number a GM would use to feel finished.

**The consequence, and the fix.** With three queues, ignored mail then belongs
to none of them: not Needs you (not pending), not Waiting (not sent), not Done
today (no date). It would be *invisible*, not merely uncounted, which is a worse
bug than the one being avoided. So a fourth segment, **All**, carries the
unfiltered list. It costs one segment and guarantees nothing in the inbox is
unreachable.

**Queues are filters, not a partition.** This is worth stating because the
counts look wrong otherwise: a message sent an hour ago is in both Waiting (they
have not replied) and Done today (you dealt with it). That overlap is intended —
`done_today` is a progress counter, not a bucket.

**Owed:** a migration adding `emails.updated_at`, after which `done_today` can
include ignored-today and `all` becomes optional rather than load-bearing. It is
the right long-term fix and was not worth blocking the queue framing on. Tracked
in `ROADMAP.md` §3.2.

### 10 · P-8 · Why a draft carries no "· edited" marker *(19 September)*

§7.4 asks for a provenance line under each draft reply — "Drafted from this
thread and your house tone" — **plus "· edited" when `draft_edit_events` shows
the GM changed it.** The line is built. The marker is not, and cannot be.

`draft_edit_events` records `hotel_id`, `surface`, `edit_bucket`,
`similarity_pct` and `bulk`. **It has no email id.** That is not an oversight to
patch: it is an analytics table, and giving it a foreign key to a specific
guest's message is exactly the link that would turn an aggregate into something
guest-adjacent — which `lib/analytics.ts`'s rules exist to prevent.

**Decided:** ship the line, drop the marker. The alternatives were both worse
than a missing word. Adding the email id makes an analytics table hold a
pointer to guest correspondence. Diffing `draft_reply` against the sent body at
read time re-derives an answer we already compute at send time, on every render
of every message, to add three characters.

**If the marker is wanted later**, the cheap version is a boolean
`emails.draft_edited` written by `sendReply` when it already computes the
similarity — one column on a table that legitimately holds message state, and
no new link from analytics to guests. Tracked in `ROADMAP.md` §3.2 alongside
the `emails.updated_at` item, which the same migration could carry.

### 8 · P-6 · The rail becomes a labelled sidebar *(19 September)*

§2 of this document describes the nav as a **five-icon rail with docked panels**:
a pillar is an icon, clicking it pins a ~220px labelled column against the rail's
edge, and the pillar's own page is reached through a child row. That shape was
correct **given a 64px rail** — a column that narrow cannot show a label, so the
labels had to live somewhere, and a docked panel was the least-bad somewhere.

Checking Sana's shipped web app against the four reference videos the design
system was built from shows the premise was wrong: Sana does not use an icon
rail. It uses a **labelled sidebar** — a workspace row, a text nav stack under
small uppercase eyebrows, a recents list, account pinned at the foot.

**Decided:** the rail becomes a **240px labelled sidebar**. A pillar stops being
a control and becomes an **eyebrow** — a heading with its rows listed inline,
not focusable, not clickable, no hover state. Communications keeps its one level
of nesting as indented rows.

**What this deletes:** the docked panel component, its hover-preview / pin /
dismiss state machine, and the flyout tooltip primitive. Roughly half of
`components/dashboard/sidebar.tsx`.

**What survives untouched:** the nav *tree* — five sections, two pillars, the
same children in the same order; `canonicalSectionKey`, because Reputation still
appears under both pillars and still needs exactly one owner for the active
state; every badge; every roadmap row and its `SoonMarker`; the mobile top bar
and drawer; and the rule that the active tell is darkness and weight, never hue.

**Consequence for decision 7 above.** The two pillar hrefs were deliberately
unrouted because a pillar was a control that had to not-navigate. A pillar is now
a heading, which cannot navigate by construction — so the decision holds, and the
mechanism that enforced it is no longer needed.

The design side is `FONDA_SANA_REDESIGN.md` §0.1; the prompts are
`APP_UX_PROMPTS.md` §D2.

### 7 · The two pillar hrefs, and why they go nowhere

`/dashboard/operation` and `/dashboard/commercial` are not routes, and must not
become routes. A section with children opens its panel instead of navigating
(§2.1), so neither pillar has a page to point at — the href is there only
because every nav item carries one. A *never-matching* href is the point:
`isSectionActive` starts with `isActive(item.href)`, so giving the pillars
`/dashboard` would light both of them the moment you were on Home. They stay
dark until one of their children matches, which is the only correct answer to
"where am I?".

Nor is either string reachable. `RailLink` and `DrawerLink` render only in the
childless branch of the tree; a pillar renders as `RailSection` — a panel
trigger, not a link — so nothing in the UI ever puts these two hrefs in front of
a user. Their absence from the build's route list is therefore the expected
result, not a missing page. Leave them exactly as they are.

---

## 12. What I'd cut, and what I'd protect

**Cut first if time is short:** the command palette (§7.1), the third pane (§7.2, though it hurts), chat threads (§4.2), Reputation (§6). All four are additive; none of them block the IA.

**Protect:** the Morning Brief page as it stands, the `FirstRunState` / `EmptyState` distinction, the single-accent discipline, the server-read sort cookie, the "no invented ADR" placeholder, and `stay-phase.ts` staying computed-on-read. Those are all decisions someone already thought carefully about, and each of them has a comment in the code explaining why. The temptation during an IA change is to tidy them away.

**And the one thing not to compromise:** the nav stays five sections. Every future feature wants to be a sixth. They go inside a pillar, as a row. *(Amended 19 Sep by P-6 — the five sections are now labelled rows in a sidebar rather than five icons with docked panels. The count is the constraint; the icons never were.)*
