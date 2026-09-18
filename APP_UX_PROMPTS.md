# Fondas — App UX (Two Pillars): Claude Code Prompt Pack

Build prompts that implement `APP_UX_PROPOSAL.md` v4. Run them **in order**, one at
a time, each in a **fresh Claude Code session** inside the repo. Each prompt ends
with a gate (`npm run lint` + `npx tsc --noEmit`, and `npm run build` at the end
of every week) so a mistake surfaces before the next step, not three prompts later.

**Status:** ready to run once `ROADMAP.md` §1 Steps 1–2 are done
**Owner:** Oriol · **Date:** 2026-09-18
**Sequencing:** the pack follows `ROADMAP.md` §2 (W2 → W8, then the "then, in
order" list). `ROADMAP.md` wins on *when*; `APP_UX_PROPOSAL.md` wins on *what*;
this document only says *how to ask for it*.

---

## 0. Before the first prompt

Do not run Prompt 1 until every line below is true. `ROADMAP.md` §1 is explicit:
*nothing reorganises, and no app code changes, until B3 is merged.*

- [ ] `site/v3-redesign` is merged to `main`, production verified in en/es/ca.
- [ ] The cleanup pass (`ROADMAP.md` §1 Step 2) is on `main`. It landed on
      `site/v3-redesign` as four commits — archive move, reference sweep, the
      new spec, doc refresh — and arrives with the merge, not separately.
- [ ] `git status` is clean and you are on `main` (or a branch cut from it today).
- [ ] `npm run build` is green on that commit. If it isn't, fix that first — the
      pack assumes a green baseline and every gate compares against it.
- [ ] Supabase migrations are applied through `0021`. The next number is **0022**.

### How to use

1. Paste one prompt into a fresh Claude Code session. Let it finish.
2. Review the diff yourself, then click through the surface it touched using the
   **Look for** list under that prompt — in all three locales, at desktop and at
   375px. Those lists are what "done" means for each step; if something in one
   fails, fix it before the next prompt, not three prompts later.
3. Commit with the message suggested under the prompt. Small, reversible commits.
4. At the end of each week (marked **Week gate** below) run the verification
   prompt (§V) before you ship.
5. If Claude Code asks a question the prompt doesn't answer, the answer is in
   `APP_UX_PROPOSAL.md` — point it at the section, don't improvise a new decision
   in chat. If the proposal is silent, stop, decide, write the decision into
   `APP_UX_PROPOSAL.md` §11, then continue.

### Guardrails to repeat (all in `CLAUDE.md`; repeated because they bite here)

- **Read `FONDA_SANA_REDESIGN.md` before any UI change.** Nothing in this pack
  changes a token, a radius, or the colorless-chrome rule. One accent in the whole
  product (today's bar in `OccupancyStrip`). No navy in nav, active states or chips.
- **Data-driven nav only.** Icons are looked up by string key in `ICONS` inside
  `components/dashboard/sidebar.tsx`; never pass component functions from the
  server layout (it trips `react-hooks/static-components`).
- **Copy lives in `dictionaries/{en,es,ca}.json`** — all three, same keys, same
  order, every time. No hard-coded strings in components.
- **Server Components by default.** `"use client"` only where there is
  interactivity. Guest data never reaches a client component as props it doesn't
  need for rendering.
- **RLS, not service-role.** Every new table is hotel-scoped (and user-scoped where
  the proposal says so). No service-role shortcuts in page code.
- **PII:** never log guest names or emails; run `npm run analytics-pii-audit`
  whenever an analytics event is added.
- **One new dependency is pre-approved:** `@dnd-kit/core` + `@dnd-kit/sortable`,
  for Prompt 9 only. Anything else must be flagged and refused by default.
- **Keep the existing distinctions:** `EmptyState` (nothing to do) vs
  `FirstRunState` (not set up) — never add a third. `ComingSoon` for stubs.
- **Protect** (`APP_UX_PROPOSAL.md` §12): the Morning Brief page, the server-read
  `fondas_inbox_sort` cookie, the "no invented ADR" placeholder, `stay-phase.ts`
  computed-on-read, and **the rail stays five icons.**

### Decisions this pack makes that the proposal left implicit

Written here so they are visible and can be overturned before you run anything:

| # | Decision | Why |
|---|---|---|
| P-1 | In W2, nav rows whose surface ships later (**Guests**, **Communications › In-house**, **Arrivals** rename) point at an interim target: Guests and In-house render the existing `ComingSoon` page from a new `lib/roadmap.ts` row; Arrivals points at `/dashboard/checkins` until W5 renames it. | The rail must be complete and stable from W2; a row that appears in W6 is a nav change the user notices twice. Stub count briefly goes 6 → 8, back to 6 by the time Guests ships. |
| P-2 | Migrations are numbered `0022` (`dashboard_layouts`), `0023` (`chat_threads` + `chat_logs` columns), `0024` (`guest_profiles` + retention), `0025` (`reviews` for Reputation). | Continues the existing sequence; `0017`/`0018` gaps are historical and stay as they are. |
| P-3 | The widget registry lives at `lib/home-widgets.ts` (keys, width, loader) and `components/dashboard/widgets/*` (renderers). | Keeps `dashboard/page.tsx` a thin composer, same as the proposal's "existing cards become widgets in a registry". |
| P-4 | The Reputation review source is **decided before Prompt 14 runs**, not by Claude Code. Options in §W8. | There is no TripAdvisor review API for this use; scraping is not a product decision Claude Code should make. |
| P-5 | The optional Morning Brief additions (`APP_UX_PROPOSAL.md` §5.1) run as Prompt 7b after Home v1, since "Since the brief" reuses the `TodoItem` rendering Home v1 just moved. | Cheapest point in the sequence; skippable. |

---

## W2 — Two pillars (proposal phases 1–2)

### Prompt 1 — Nav data model: two pillars, dictionaries, roadmap rows

```
Read APP_UX_PROPOSAL.md §2 (all of it), CLAUDE.md, lib/roadmap.ts,
app/[lang]/dashboard/layout.tsx and the NavItem type at the top of
components/dashboard/sidebar.tsx before changing anything. Do NOT change any
rendering in sidebar.tsx in this step — this is the data layer only.

We are moving the dashboard nav from eight flat sections to two pillars plus two
always-there places (Home, Ask). The target tree is APP_UX_PROPOSAL.md §2.2 —
reproduce it exactly, with these interim targets for surfaces that ship later:

  - "Arrivals & departures" → href /dashboard/checkins (renamed in a later week)
  - "Communications › Upcoming stays" → href /dashboard/communications
  - "Communications › In-house" → coming-soon, route /dashboard/communications/in-house
  - "Guests" → coming-soon, route /dashboard/guests
  - "Reputation" → coming-soon, route /dashboard/reputation (NOT the old
    /dashboard/front-desk/reputation)

1. Types (sidebar.tsx, type-level only):
   - Add `canonicalSectionKey?: string` to NavItem. A row that appears in more
     than one panel (Reputation) sets it to the section that should light in the
     rail when the row is active. Add a docblock explaining the rule from §2.2.
   - Add `group?: string` to NavItem: an optional label-key for a nested
     sub-group inside a panel (used for Communications). Rows sharing the same
     `group` value render under one mono eyebrow. Type only; rendering is Prompt 2.

2. lib/roadmap.ts:
   - Change the `reputation` row's route to /dashboard/reputation.
   - Add rows `guests` and `communications-in-house` (status "coming-soon") with
     label + blurb accessors following the existing row shape.
   - Do NOT delete rows for the eight parked sections (housekeeping, fnb, staff,
     procurement, finance-reporting, chargeback, ai-management, team-activity)
     or the per-section dashboard rows yet — Prompt 3 handles deletions once the
     redirects exist. Do not touch `inNav` / `roadmapNavFeatures()` yet either.

3. dictionaries/en.json, es.json, ca.json — keep all three structurally
   identical (same keys, same order):
   - sidebar.home ("Home" / "Inicio" / "Inici") — keep the existing `dashboard`
     key if it is read elsewhere; grep first.
   - sidebar.chat: change the VALUE to "Ask" / "Pregunta" / "Pregunta". The key
     stays `chat` because it is referenced by the rail.
   - sidebar.operation, sidebar.commercial (the two pillar labels; es/ca:
     "Operación"/"Operació", "Comercial"/"Comercial").
   - sidebar.arrivals ("Arrivals & departures" / "Llegadas y salidas" /
     "Arribades i sortides"), sidebar.communicationsGroup ("Communications"),
     sidebar.inHouse ("In-house" / "En casa" / "A casa"),
     sidebar.upcoming ("Upcoming stays" / "Próximas estancias" /
     "Properes estades"), sidebar.guests ("Guests" / "Huéspedes" / "Hostes").
   - roadmap.blurb.guests and roadmap.blurb.communications-in-house — one
     GM-facing line each, in the voice of the neighbouring blurbs, no marketing.
   Match the voice of the existing dictionary entries: concise, GM-facing.

4. app/[lang]/dashboard/layout.tsx — replace `navItems` with the §2.2 tree:
   [ home (direct link), chat (direct link, key "chat"),
     operation { children: brief, arrivals, in-house (group:"communications"),
                 upcoming (group:"communications"), guests, reputation,
                 front-desk-info },
     commercial { children: reputation (canonicalSectionKey:"operation"),
                 revenue-management, demand-forecasting, ota-parity, upsell-ai,
                 room-upgrade-ai, sales-marketing } ]
   - Reputation appears in BOTH pillars with the same href. In Operation it is
     the canonical one (set canonicalSectionKey:"operation" on both copies so the
     rule is explicit).
   - Neither pillar carries `comingSoon` at the section level — both have live
     children. Children keep `comingSoon` from their roadmap row.
   - The Communications children keep the inbox badge on the "upcoming" row
     (that is where the unanswered-mail count belongs until W6 splits it).
   - Keep `settingsItem` exactly as it is.
   - Keep the existing helper that builds an item from a RoadmapKey; extend it to
     pass through `group` and `canonicalSectionKey`.

The rail will look wrong after this step (rendering is Prompt 2) — that is
expected. It must compile and lint. Run `npm run lint` and `npx tsc --noEmit`,
fix everything, and show me the final diff plus a grep proving all three
dictionaries have identical key sets.
```

**Look for** — nothing visual yet; this one is judged in the diff and the dev server.

- The app still boots. `npm run dev`, load `/dashboard` in en, es and ca — no crash, no error overlay.
- The rail looks wrong (gear icons, old rows). That is expected here; Prompt 2 fixes it. Don't "fix" it yourself.
- Open the three dictionaries side by side: the diff should add the *same* keys in the *same* order to all three. A key in `en` that isn't in `ca` is the failure mode of this step.
- The chat label now reads Ask / Pregunta / Pregunta wherever it renders.
- `layout.tsx` has no hard-coded label strings — every one is a dictionary lookup.

**Wrong if:** the eight parked roadmap rows were deleted, or `inNav` / `roadmapNavFeatures()` was touched. That is Prompt 3's job and W4 still needs those rows.

**Commit:** `feat(nav): two-pillar nav tree, dictionaries and roadmap rows`

---

### Prompt 2 — Sidebar: five icons, the hairline, nested groups, canonical owner

```
Read APP_UX_PROPOSAL.md §2.1, §2.2 ("Reputation appears in both panels") and
§2.3, FONDA_SANA_REDESIGN.md §5, and all of components/dashboard/sidebar.tsx
before editing. This is an extension of the existing rail, not a redesign —
keep the exact visual language (64px rail, --fonda-bg ground, no right border,
monochrome active-by-darkness, ink flyout labels, SoonMarker sparkle, the
existing focus-trap / Esc / scroll-lock discipline, the account menu at the foot).

Desktop rail:
1. Five icons in this order: Home, Ask, [hairline], Operation, Commercial, then
   (mt-auto) Settings, Account.
   First, know what the fallbacks do today, so you can tell a gap from a bug:
   rail-level items resolve `ICONS[item.key] ?? Settings`, so Home, Ask,
   Operation and Commercial all draw a gear right now; panel rows resolve
   `ICONS[panelIconKey(item)] ?? Dot`, so Guests and In-house draw a bullet.
   Six keys need entries, not four:
   - home=House (or keep the current dashboard icon)
   - chat=Sparkles (it is already the chat glyph in ChatThread and AskYourHotel
     — stay consistent)
   - operation=ClipboardList or CalendarClock
   - commercial=TrendingUp
   - guests=BookUser or UserRound — NOT Users, which `staff` already holds
   - communications-in-house=MessageSquare — must not share a glyph with
     `communications: Send`; the two Communications rows sit one above the other
   Pick lucide icons that read at 20px in monochrome.
2. The hairline after Ask: exactly
   `<div className="mx-3 my-2 h-px bg-[var(--fonda-border)]" />` — one element,
   no label, no other new chrome. It is the only structural divider in the rail.
3. Home and Ask are direct links (RailLink). Operation and Commercial open the
   existing pinned panel (RailSection). Nothing else changes about how the panel
   opens, closes, traps focus or handles pointer-down outside.

Panel — nested group:
4. Inside the panel, rows sharing a `group` value render under one eyebrow using
   the panel header's own treatment one step quieter:
   `font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]`,
   `pl-2.5 pt-3 pb-1`. Rows beneath are indented to `pl-7` so the icon column
   still aligns. No chevron, no collapse. The eyebrow text comes from
   dict.sidebar[group + "Group"] (i.e. sidebar.communicationsGroup).
   Build it generally (any `group` value works), not as a Communications special
   case — Finance will use it when it returns.
5. Rows are rendered in tree order; a group's eyebrow renders once, before its
   first member.

Active state — canonical owner:
6. Extend `isSectionActive`: when the active child carries `canonicalSectionKey`,
   ONLY the section with that key lights. Reputation is in both panels; when
   /dashboard/reputation is the route, the Operation icon lights and Commercial
   does not. Both panels still show the Reputation row as the active row when
   opened. Add a comment explaining why two lit icons would be a bug.

Mobile drawer (<md):
7. Same tree, same accordion. A `group` renders as a plain indented block with the
   same mono eyebrow inside the section's accordion. Do NOT nest a second
   accordion. Home and Ask are plain DrawerLinks above the sections; keep the
   hairline there too (same element, same tokens).

Also:
8. Update the comment in sidebar.tsx that mentions the ~12-icon budget: the rail
   is now five and the rule (§12 of the proposal) is that it stays five — new
   features go in a panel.
9. Do not delete any page files or change any routes in this step.

Run `npm run lint` and `npx tsc --noEmit`. Then start the dev server and verify
by hand and tell me what you saw: five icons; hairline present; Operation panel
shows the Communications eyebrow with two indented rows; Reputation appears in
both panels; on /dashboard/reputation only Operation is lit; keyboard: Tab into
the rail, Enter opens a panel, Esc closes it and returns focus; the mobile drawer
at 375px shows the group as an indented block. Show me the final diff.
```

**Look for** — this is the most visible change in the pack. Spend ten minutes on it.

- Count the icons: Home, Ask, hairline, Operation, Commercial, then Settings and Account at the foot. Five destinations, no more.
- No gears left standing in for a real glyph, and no bullets on Guests or In-house.
- The hairline reads as a hairline — same weight as every other border, inset from the edges. If it looks like a divider bar or a gap, it's wrong.
- Open Operation: a `COMMUNICATIONS` eyebrow in quiet mono caps, two rows indented under it, icon column still aligned. No chevron, nothing collapsible.
- The whole rail is still colorless. Active row = darker ink, never a tinted pill.
- Go to `/dashboard/reputation`: Operation lights, Commercial does **not**. Two lit icons is the bug this prompt exists to prevent.
- Keyboard: Tab into the rail, Enter opens a panel, Esc closes it and focus lands back on the icon you left from.
- At 375px the drawer shows the group as an indented block inside the section — not a second accordion.

**Wrong if:** the rail gained a sixth destination, or the group renders as a collapsible.

**Commit:** `feat(nav): five-icon rail with two pillars, hairline and nested groups`

---

### Prompt 3 — Redirects and deletions

```
Read APP_UX_PROPOSAL.md §2.4 and §2.5, the redirect pattern in
app/[lang]/dashboard/admin/page.tsx, lib/roadmap.ts, and
app/[lang]/dashboard/communications/page.tsx (the `?email=` handling around
line 58) before changing anything.

Goal: no dead routes, no dead code, every old URL lands somewhere sensible.

1. Replace each of these page.tsx files with a redirect page following the
   admin/page.tsx pattern (locale check via isLocale, notFound on bad locale,
   redirect to the localized target). Keep a two-line docblock in each saying
   where the surface went and why (cite the proposal section):
   - /dashboard/front-desk, /dashboard/revenue, /dashboard/operations,
     /dashboard/finance, /dashboard/oversight, /dashboard/analytics → /dashboard
   - /dashboard/operations/{housekeeping,fnb,staff,procurement} → /dashboard
   - /dashboard/finance/{reporting,chargeback} → /dashboard
   - /dashboard/oversight/{ai,team} → /dashboard
   - /dashboard/front-desk/reputation → /dashboard/reputation
   - /dashboard/concierge → /dashboard/communications (it becomes
     /dashboard/communications/in-house in W6; Prompt 12 will retarget it).
   Do NOT rename /dashboard/checkins in this step (that is W5).
   Do NOT touch /dashboard/brief.

2. Create the two new coming-soon stub pages the nav now points at, using the
   existing ComingSoon component and their roadmap rows exactly like the
   surviving stubs do (copy the shape of one existing stub page):
   - app/[lang]/dashboard/reputation/page.tsx
   - app/[lang]/dashboard/guests/page.tsx
   - app/[lang]/dashboard/communications/in-house/page.tsx
   (Stubs for revenue/* and sales-marketing and front-desk/information already
   exist — leave them.)

3. lib/roadmap.ts cleanup:
   - Delete `roadmapNavFeatures()` and the `inNav` field from the type and from
     every row. Grep for callers first; there should be none.
   - Delete the rows for the six per-section dashboards (front-desk, revenue,
     operations, finance, oversight, analytics) — they no longer exist as pages.
   - KEEP the rows for the eight parked sections (housekeeping, fnb, staff,
     procurement, finance-reporting, chargeback, ai-management, team-activity)
     and keep their blurbs. They are not rendered as pages any more, but the
     customize panel's locked tiles (W4) will read them. Add a docblock above
     ROADMAP saying exactly that, and pointing at ROADMAP.md §6 for the list.
   - Keep the `concierge` row until W6 (Prompt 12 removes it).
   - Update the file's header comment: the tree in layout.tsx is the only source
     of nav structure; roadmap.ts owns label + blurb + status per key.

4. sidebar.tsx dead icon code — delete it in the same pass. The two-pillar tree
   no longer contains a row whose `sectionKey === key`, so the machinery that
   served those rows is now unreachable:
   - `panelIconKey()` and its docblock. Nothing can satisfy its condition any
     more, so each call site becomes a plain `ICONS[item.key] ?? Dot` lookup.
   - The `dashboard: LayoutDashboard` ICONS entry, which existed only as that
     function's return value.
   - The ICONS entries for the six per-section dashboards you just deleted from
     roadmap.ts: front-desk, revenue, operations, finance, oversight (analytics
     never had one). Keep `revenue-management` — that is a live row, not a
     section.
   Grep each symbol before deleting it and show me the greps.

5. Dictionaries: fold the `dashboardNav.*` namespace into `sidebar.*`. Grep every
   reader of dict.dashboardNav, retarget it, delete the namespace from all three
   files, keep key order identical across en/es/ca. Remove blurb/label entries
   for the six deleted per-section dashboard keys. Keep blurbs for the parked
   eight.

6. ⚠️ Deep links: /dashboard/communications?email=<id> is used by
   components/dashboard/needs-reply-card.tsx and components/dashboard/todo-list.tsx
   (and by DraftResultCard in components/dashboard/chat/chat-thread.tsx — grep
   for "?email=" to catch all of them). Nothing
   in this step changes that URL, so nothing should break — but add a comment at
   each call site noting that W6 will scope it, so it is not missed.

7. Comments: search sidebar.tsx, layout.tsx, roadmap.ts and brief-summary-card.tsx
   for references to NAV_REORG_SPEC.md sections that described the eight-section
   structure and update them to cite APP_UX_PROPOSAL.md §2. Leave references to
   NAV_REORG_SPEC.md §2 (rail pattern) and §9 (panel spec) — those survive.
   In the same sweep, fix any comment that cites a dictionary key that no longer
   exists. Specifically: the paragraph above the grouped sections in
   lib/roadmap.ts saying a section's own row IS its "Dashboard" sub-page and
   that the submenu calls it "Dashboard" instead, `from sidebar.dashboard`.
   Prompt 1 deleted that key and the convention it describes is gone with the
   per-section rows — delete the sentence, don't reword it.

Run `npm run lint` and `npx tsc --noEmit`. Then `npm run build` and confirm the
route list contains no route that 404s and no page file that is unreachable
from the nav except the redirect pages. Curl or visit each old URL and paste me
the resolved destination for all fifteen. Show me the final diff.
```

**Look for** — the risk here is a dead link you don't notice for a month.

- Visit all fifteen old URLs. Every one lands somewhere real; none 404s, none loops. Pay attention to `/dashboard/front-desk/reputation` → `/dashboard/reputation` (the new stub, not the old page).
- `/dashboard/concierge` → `/dashboard/communications`. `/dashboard/checkins` still works untouched.
- The three new stubs look identical to the stubs that already existed — same spacing, same sparkle. A stub that looks different wasn't copied from a neighbour.
- Click every row in both panels. Nothing points anywhere dead.
- Open a to-do and a needs-reply card that use `?email=` — the message still opens.
- Scan the pages for raw dictionary keys showing as text. That's the tell that a key was deleted while something still reads it.

**Wrong if:** the eight parked roadmap rows are gone — W4's locked tiles read them.

**Commit:** `refactor(nav): redirect fifteen retired routes, delete dead nav code`

---

### Week gate — W2

Run §V with scope "W2". Then amend the design doc (small, but do it now while it
is fresh):

### Prompt 4 — Doc amendment for W2

```
Read APP_UX_PROPOSAL.md §8.3 (last bullet) and the amendment paragraph that
NAV_REORG_SPEC.md added to FONDA_SANA_REDESIGN.md §5 (search for "NAV_REORG"
in FONDA_SANA_REDESIGN.md). Add a short paragraph in the same place and voice:
the rail now carries Home, Ask, a hairline, then two pillars (Operation,
Commercial); the panel supports one level of nesting under a mono eyebrow; a
shared row has a canonical owner for the active state. Cite APP_UX_PROPOSAL.md
§2. Also tick the W2 row in ROADMAP.md §2 with today's date.

Then close a content gap Prompt 1 opened: COMINGSOON_CONTENT.md has no section
for the two roadmap rows it added. Write them in the doc's existing three-part
shape (Lead / Will do / What's next) and its existing voice — `guests` under
Operation, `communications-in-house` beside the other Communications entries.
English only; the doc's own header says the translation happens where the copy
is used, and `roadmap.blurb.guests` / `roadmap.blurb.communications-in-house`
already exist in all three dictionaries. Leave those blurbs alone unless the new
Lead is genuinely better, in which case update all three and keep key order
identical.

No code changes.
```

**Look for** — docs only, so read rather than click.

- The new paragraph in `FONDA_SANA_REDESIGN.md` §5 should sound like the paragraph above it, not like a changelog entry.
- `ROADMAP.md` §2: W2 ticked, today's date.
- `COMINGSOON_CONTENT.md`: both new entries follow Lead / Will do / What's next, English only.
- `git diff --stat` shows docs and nothing else. A `.tsx` in this diff is a mistake.

**Commit:** `docs: record the two-pillar rail in the design spec and roadmap`

---

## W3 — Ask + Home v1 (proposal phases 3–4)

### Prompt 5 — Ask: starter questions in the blank state

```
Read APP_UX_PROPOSAL.md §4.1 and §4.3, components/dashboard/chat/chat-surface.tsx,
chat-composer.tsx, use-hotel-chat.ts, and lib/hotel-context.ts (to confirm what
buildHotelContext already feeds: hotel_settings policies, arrival_instructions,
tone_guidelines, check_in_time…). Read FONDA_SANA_REDESIGN.md §8 before touching
the surface.

The rail already links to /dashboard/chat (W2). The blank state of ChatSurface
(centred composer, 44px title, air) is right and stays. Add one thing:

1. Under the composer in the blank state, a list of starter questions in the
   Lightfield pattern: a quiet mono eyebrow ("Some ideas" / "Algunas ideas" /
   "Algunes idees"), then plain tappable text lines — no cards, no icons, no
   borders. Text in --fonda-text-2, hover to --fonda-text, 10px radius on the
   focus ring only. Tapping one submits it as the user's message through the
   existing send path in use-hotel-chat.ts (do not duplicate the send logic).

2. Six questions, in dictionaries under askYourHotel.starters (array of strings),
   all three languages, translated in the voice of the existing chat copy:
   - How many check-ins do we have today?
   - Who is arriving that has stayed before?
   - Is anyone celebrating something this week?
   - What did the guest in room 14 complain about last time?
   - How do I handle a late check-out request?
   - What's our cancellation policy for direct bookings?
   The last two are "how do we do things here" questions and must be answerable
   from hotel_settings via the existing context — verify by reading
   lib/hotel-context.ts, and if a field they need is NOT in the context, tell me
   which one rather than adding it silently.

3. The list disappears once the thread has a message. On a narrow viewport the
   lines wrap; nothing truncates.

4. Do not add thread persistence, "Continue in chat", or provenance chips in
   this step — those are later prompts.

Run `npm run lint` and `npx tsc --noEmit`. Verify at desktop and 375px, in all
three locales, and that a tapped starter produces a real answer. Show me the
final diff.
```

**Look for** — go to `/dashboard/chat` with no messages.

- A quiet mono eyebrow, then six plain text lines. If it renders as cards, buttons or a grid, it's wrong — plain tappable text is the whole point.
- Lines sit in `--fonda-text-2` and darken on hover. The only ring anywhere is on keyboard focus.
- Tap one: it sends as if you typed it, a real answer comes back, and the list disappears the moment the thread has a message.
- Ask the last two ("late check-out", "cancellation policy") and check the answer is grounded in your hotel settings, not hedged generic advice. If Claude Code flagged a missing context field, settle that before you ship.
- es and ca are actually translated, in the voice of the existing chat copy.
- At 375px the lines wrap; nothing truncates or scrolls sideways.

**Commit:** `feat(chat): starter questions in the blank state`

---

### Prompt 6 — Home v1: the widget registry, "Needs you today" first

```
Read APP_UX_PROPOSAL.md §3.1–§3.3, app/[lang]/dashboard/page.tsx,
components/dashboard/todo-list.tsx, lib/todo-rules.ts, lib/dashboard-snapshot.ts,
lib/briefing-latest.ts, lib/inbox.ts and FONDA_SANA_REDESIGN.md before editing.

This step restructures Home without adding customization. Same data, same cards,
new order, behind a registry.

1. Create lib/home-widgets.ts (server-only): a typed registry
     HomeWidgetKey = "needs-you" | "brief" | "numbers" | "outlook" |
                     "needs-reply" | "arrivals-today" | "departures-today" |
                     "vip-no-note" | "inbox-pulse" | "sync-health"
     interface HomeWidgetDef { key; width: "full" | "half"; pinned?: boolean }
     HOME_WIDGETS: ordered array of defs, with "needs-you" pinned:true.
   Only the four keys that exist today need renderers in this step
   ("needs-you", "brief", "numbers", "outlook", "needs-reply"); the rest are
   declared so the key set is final, and their renderers are Prompt 7.
   Width is declared per widget, never chosen by the user.

2. Create components/dashboard/widgets/ and move each existing Home card into a
   widget file that takes already-loaded data as props (server components):
   needs-you-widget.tsx (wraps TodoList), brief-widget.tsx (BriefSummaryCard),
   numbers-widget.tsx (StatRow + its footnote), outlook-widget.tsx
   (OccupancyStrip — this keeps the product's ONE accent; do not add another),
   needs-reply-widget.tsx (NeedsReplyCard). Do not restyle the underlying
   components; the widget files are thin wrappers that own the section heading.

3. Every widget gets the same quiet section heading: the widget title in
   text-sm font-medium and, right-aligned, a freshness line in
   font-mono text-[11px] text-[var(--fonda-text-3)] ("synced 06:40" style, from
   the data each loader already has — last sync for PMS-backed widgets, brief
   generated-at for the brief). No chips on Home (proposal §7.4: a line, not a
   chip, so the page doesn't rattle).

4. app/[lang]/dashboard/page.tsx becomes a composer: greeting + date (unchanged),
   then "Needs you today" (pinned, full width, always first, with a count badge
   in the heading like Rox's "(3)"), then the remaining widgets in HOME_WIDGETS
   order, full-width ones spanning both columns and half-width ones in a
   `grid grid-cols-1 gap-6 lg:grid-cols-2`. Keep the 1120px single column. Keep
   the FirstRunState branch exactly as it is.

5. Loading: a widget with no data renders its EmptyState (nothing-to-do), never a
   blank gap. Update dashboard/loading.tsx skeletons to the new order.

6. Dictionaries: add home.widgets.<key>.title for all ten keys (en/es/ca), plus
   home.needsYouCount ("{count} things" style, using the existing t() format
   helper). Retire dictionary keys the old layout used and nothing reads any
   more — grep before deleting.

7. Do not add the Customize button or any persistence in this step.

Run `npm run lint` and `npx tsc --noEmit`. Verify Home at desktop and 375px in
all three locales: to-dos are first, counts are right, the occupancy strip is the
only accented element on the page, and the first-run state is untouched. Show me
the final diff.
```

**Look for** — Home, in all three locales, at 1440 and 375.

- Greeting and date, then "Needs you today" with its count, first and full width. Anything above it is wrong.
- Scan down the page: every widget has the same heading — title left, mono freshness line right. Inconsistency here is what you're hunting for.
- No chips on Home. A line, not a chip (proposal §7.4).
- The occupancy strip is the only coloured thing on the page. Anything else with hue is a second accent.
- Half-width widgets pair into two columns at desktop and stack at 375px; the column is still capped at 1120px.
- A widget with no data shows its empty state, never a blank gap.
- The first-run state (a hotel with nothing connected) looks exactly as it did before.
- Throttle the network and reload: the skeletons match the new order.

**Wrong if:** any underlying card was restyled. The widget files are thin wrappers — the diff should show moves, not redesigns.

**Commit:** `feat(home): widget registry; "Needs you today" leads the page`

---

### Prompt 7 — Home v1: the five new widgets

```
Read APP_UX_PROPOSAL.md §3.3 (the table and the two notes under it),
lib/home-widgets.ts and components/dashboard/widgets/ from the previous step,
lib/dashboard-snapshot.ts (vipArrivalsWithoutNote, checkoutsToday),
lib/inbox.ts (InboxStats), lib/apaleo-status.ts / lib/gmail-status.ts /
lib/mews-sync.ts (deriveConnectionState and sync_logs), and types/database.ts
for `reservations` columns (start_utc, end_utc, customer_mews_id,
requested_category_id, arrival_time). Read FONDA_SANA_REDESIGN.md.

Build the five remaining widgets from data that already exists. No new
integrations, no new tables.

1. arrivals-today (half): a new server query in lib/dashboard-snapshot.ts (or a
   sibling lib/arrivals.ts if the snapshot file is getting long — follow the
   neighbouring pattern) returning today's arrivals in the hotel's timezone
   (use hotelToday from lib/stay-phase.ts): guest display name, room type label,
   ETA or "no ETA", returning-guest flag (count of prior reservations for the
   same customer_mews_id > 0). Row = name · room type · ETA-or-not · a small
   returning marker. Cap at 8 rows with a "+N more" link to /dashboard/checkins
   (W5 renames it — use a single helper for the href so it changes in one place).

2. departures-today (half): mirror of the above on end_utc. Row = name · room ·
   departure time · late-checkout requested (if the field exists — check the
   reservation shape; if it does not, omit the column, do not fake it). No
   outstanding-balance column: the proposal is explicit that it waits for
   finance data.

3. vip-no-note (half): the full list behind snapshot.vipArrivalsWithoutNote
   (today it is capped at two inside buildTodoList as the vip_no_note rule; the
   widget shows all of them). Row links to the reservation's email thread if one
   is linked, else to /dashboard/checkins.

4. inbox-pulse (half): three numbers from InboxStats — drafts ready, sent today,
   average first-response time — in the StatRow visual language, half width.

5. sync-health (half): last successful sync per connected source, last failure
   if any, in one quiet line each. Green means nothing; do not add a status
   colour — it is monochrome text, and a failure gets a plain "Failed" word plus
   a link to Settings → Connections. Reuse deriveConnectionState.

6. Register renderers for all five in the registry. In this step they render for
   everyone in HOME_WIDGETS order (customization is W4). Loaders must run in
   parallel with the existing ones (Promise.all in the page), and a loader that
   throws must degrade to the widget's EmptyState, not take down the page —
   follow the pattern lib/briefing-latest.ts uses.

7. PII: display names only, server components only, nothing new in analytics.
   Run `npm run analytics-pii-audit` to be sure nothing regressed.

Run `npm run lint` and `npx tsc --noEmit`. Verify with the seeded test guests
(`npm run seed-test-guests` if the dev DB is empty) that arrivals and departures
show the right people for today in the hotel's timezone, including a guest
whose departure day is today. Show me the final diff.
```

**Look for** — the failure here is quiet and about dates, so check against the PMS.

- Arrivals and departures list the right people for **today in the hotel's timezone**. An off-by-one day is the classic bug; test with a guest departing today and, if you can, late in the evening.
- Arrivals caps at 8 with a "+N more" link that lands on the check-ins page.
- Departures has no balance column, and a late-checkout column only if that field genuinely exists.
- Inbox pulse reads in the same StatRow language as the numbers widget, at half width.
- Sync health is monochrome. No green dot, no status colour. A failure reads "Failed" plus a link to Settings → Connections.
- Disconnect a source (or otherwise break one loader) and reload: only that widget degrades to its empty state, the page still renders.
- Nothing beyond display names is on screen — no emails, no booking references.

**Commit:** `feat(home): arrivals, departures, VIP, inbox pulse and sync health widgets`

---

### Prompt 7b (optional) — Morning brief: "Since the brief" and "Past briefs"

```
Read APP_UX_PROPOSAL.md §5.1, app/[lang]/dashboard/brief/page.tsx,
components/dashboard/brief-hero.tsx, briefing-article.tsx, and the
needs-you-widget from W3. Read FONDA_SANA_REDESIGN.md §7 (the brief page is the
best surface in the product; it is not being redesigned).

Two small additions, nothing else:

1. "Since the brief": between the article and the quick actions, a block listing
   TodoItems whose underlying event is newer than the brief's generated_at
   (a complaint email received after it, a cancellation, a new VIP arrival).
   Reuse buildTodoList with a `since` filter (add an optional `since?: Date`
   to TodoInput, applied per rule where the source has a timestamp) and the same
   TodoList rendering Home uses. Render nothing at all when the list is empty —
   no empty state, no heading.

2. "Past briefs": move the history list out of the page body into a quiet link
   in the hero's action slot next to the refresh button (LocaleLink,
   --fonda-text, underline — the in-app link treatment from button.tsx's own
   comment), pointing at /dashboard/brief/history. Create that route as a plain
   list of past briefs (date · first line), each linking to the existing
   /dashboard/brief/history/[id] page. Move the existing list markup there
   rather than rewriting it.

Dictionaries for the two headings, all three languages. Run `npm run lint` and
`npx tsc --noEmit`. Show me the diff.
```

**Look for** — the brief page should look untouched apart from two things.

- "Since the brief" appears only when something genuinely happened after `generated_at`. Regenerate the brief and the whole block — heading included — must vanish. An empty heading is the bug.
- Its items render identically to Home's to-dos.
- "Past briefs" is now a quiet underlined ink link in the hero next to refresh. Not a button, no navy.
- `/dashboard/brief/history` lists past briefs, each opening the existing detail page.
- Nothing else on the brief moved. It is the best surface in the product; treat any restyling as a regression.

**Commit:** `feat(brief): "since the brief" block; history moves to its own route`

---

### Week gate — W3

Run §V with scope "W3". Tick the W3 row in `ROADMAP.md` §2.

---

## W4 — Home v2: customize (proposal phase 5)

### Prompt 8 — `dashboard_layouts`: migration, RLS, load/save, role defaults

```
Read APP_UX_PROPOSAL.md §3.5, supabase/migrations/0021_sample_brief_requests.sql
(for the header/comment convention), supabase/migrations/0001_init.sql (RLS
helper functions and the users/hotels policies), types/database.ts, and
lib/home-widgets.ts. Read CLAUDE.md "Safety & boundaries".

Data layer only. No UI in this step.

1. supabase/migrations/0022_dashboard_layouts.sql:
   create table public.dashboard_layouts (
     user_id    uuid primary key references public.users(id) on delete cascade,
     hotel_id   uuid not null references public.hotels(id) on delete cascade,
     widgets    jsonb not null,           -- ordered array of {key, enabled}
     updated_at timestamptz not null default now()
   );
   Enable RLS. Policies: a user can select/insert/update only the row where
   user_id = auth.uid() AND hotel_id = the user's hotel (use the same helper the
   existing policies use to resolve the caller's hotel — do not write a new
   one). No delete policy needed; the cascade handles it. Add a `check`
   constraint that widgets is a jsonb array. Write the header comment in the
   voice of 0021: what this is, why per-user, why an absent row means defaults.
   Do NOT run the migration — tell me it is ready to apply and what to paste.

2. types/database.ts: add the table type by hand in the same style as the
   existing tables (this repo does not regenerate types).

3. lib/home-layout.ts (server-only):
   - `type StoredLayout = { key: HomeWidgetKey; enabled: boolean }[]`
   - `defaultLayoutFor(role: Database["public"]["Enums"]["user_role"])`:
     owner leads with numbers, outlook, brief, needs-reply…; manager leads with
     arrivals-today, needs-reply, brief, numbers…; both include every widget
     (some disabled by default — sync-health off for manager, vip-no-note off
     for owner). "needs-you" is never in the stored array: it is pinned by the
     registry, not by the user.
   - `loadHomeLayout(supabase, userId, role)`: reads the row; missing row →
     defaults; unknown keys in a stored layout are dropped on read; keys missing
     from a stored layout (a widget added after the user saved) are appended,
     enabled, at the end. Returns the resolved ordered array.
   - `saveHomeLayout(supabase, userId, hotelId, layout)`: validates every key
     against HOME_WIDGETS, rejects "needs-you", upserts. Server action lives in
     app/[lang]/dashboard/actions.ts (create it; follow brief/actions.ts).

4. app/[lang]/dashboard/page.tsx: read the layout (this is the first thing in
   the product to read users.role — add a comment saying so) and render widgets
   in that order, skipping disabled ones. "needs-you" stays first regardless.

5. Tests-by-hand you must do and report: with no row, an owner and a manager get
   different orders; a stored layout with a bogus key renders without it; a
   stored layout missing "sync-health" gets it appended.

Run `npm run lint` and `npx tsc --noEmit`. Show me the diff and the SQL.
```

**Look for** — data layer, so most of this happens in the SQL and the database.

- Home looks exactly as it did after Prompt 7. Nothing new on screen is the correct outcome.
- Read the migration before you apply it: RLS enabled, policies scoped to `auth.uid()` **and** the caller's hotel via the existing helper, the jsonb-array check constraint present, no delete policy.
- Apply `0022`, then sign in as an owner and as a manager: different orders, both showing every widget, some off by default.
- Hand-edit a stored row to contain a bogus key — the page renders without it and does not crash.
- Delete a key from a stored row — it comes back appended and enabled.
- `needs-you` never appears in the stored array and is always first on screen.

**Wrong if:** `users.role` is read in a client component, or the layout is read with the service-role key.

**Commit:** `feat(home): per-user dashboard layouts with role defaults (migration 0022)`

Apply `0022` in Supabase before Prompt 9.

---

### Prompt 9 — The Customize panel and the locked roadmap tiles

```
Read APP_UX_PROPOSAL.md §3.4, §8.2 (option C is approved: @dnd-kit for this
panel only), the RailSection panel in components/dashboard/sidebar.tsx (its
focus-trap, Esc and pointer-down-outside discipline is what you copy), lib/roadmap.ts
(the parked rows feed the locked tiles), lib/analytics.ts, and
FONDA_SANA_REDESIGN.md §5–§6.

Dependency: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
This is the ONE pre-approved dependency. If it fights the layout, ship up/down
arrow buttons instead (zero deps) and tell me — do not add anything else.

1. A quiet "Customize" ghost button in the Home header, right-aligned on the
   greeting row (Asana/ClickUp placement). Same ghost variant the page already
   uses for secondary actions.

2. Clicking it opens a right-docked panel (client component
   components/dashboard/home-customize-panel.tsx): ~340px, --fonda-surface,
   hairline left border, 10px radius on the inner controls, slides in from the
   right at md+, becomes a bottom sheet below md. Focus trapped, Esc closes,
   pointer-down outside closes, body scroll locked — reuse the sidebar's
   patterns, do not write new ones.

3. Contents, top to bottom:
   - One sentence (dictionary): "Choose what you see every morning, and in what
     order. Needs you today always comes first."
   - "Needs you today" as a fixed first row: no checkbox, no handle, a lock glyph
     in --fonda-text-3.
   - Every other widget from HOME_WIDGETS: a checkbox (native input, styled per
     the spec), the widget title, a drag handle (GripVertical) at the right.
     Sortable via @dnd-kit with keyboard support (space to lift, arrows to move,
     space to drop) — announce moves with the DnD-kit accessibility messages,
     translated.
   - Below, an eyebrow "Coming soon" and the locked tiles: one per parked
     roadmap row that maps to a future widget — adr-revpar, pickup-pace,
     ota-parity, review-score, upsell-revenue, housekeeping, labour-cost. Add
     these as rows in lib/roadmap.ts with blurbs (en/es/ca) if they do not
     exist, reusing existing keys where they do (ota-parity, housekeeping…).
     Each tile: title, blurb in --fonda-text-3, the same Sparkles SoonMarker the
     nav uses. Not draggable, not checkable. Clicking one does nothing visible
     except firing an analytics event.

4. Persistence: changes are held in local state and saved ON CLOSE via the
   saveHomeLayout server action (one write, not one per toggle). Optimistically
   reorder the page behind the panel with router.refresh() after save. A failed
   save shows the panel's inline error line and keeps the panel open.

5. Analytics: add event "home_locked_widget_clicked" with payload { key } to
   lib/analytics.ts's event union — no PII, no hotel name. Run
   `npm run analytics-pii-audit`.

6. Dictionaries: all panel strings, all three languages.

Run `npm run lint` and `npx tsc --noEmit`. Verify: reorder with the mouse and
with the keyboard only; toggle two off, close, reload — the layout persists;
open the panel as a different user — it does not; 375px shows the bottom sheet;
VoiceOver/NVDA reads the drag announcements. Show me the final diff.
```

**Look for** — open it, then close it, then reload. Persistence is where this breaks.

- "Customize" is a quiet ghost button on the greeting row. If it reads as a primary action, it's too loud.
- The panel is ~340px docked right at desktop and a bottom sheet at 375px, hairline border, 10px radius on the controls.
- "Needs you today" is pinned at the top with a lock glyph — no checkbox, no handle.
- Reorder with the mouse. Then do it again keyboard-only: space to lift, arrows to move, space to drop, and the announcement should be translated.
- Toggle two widgets off, close the panel, reload: the layout holds. Watch the network tab — one save on close, not one per toggle.
- Locked "Coming soon" tiles: title, grey blurb, the same sparkle the nav uses. Not draggable, not checkable, clicking does nothing visible.
- Esc closes, pointer-down outside closes, focus returns, the page behind doesn't scroll.
- Sign in as another user: their layout, not yours.

**Wrong if:** a dependency other than `@dnd-kit` was installed. If dnd-kit fought the layout the answer was arrow buttons, not another library.

**Commit:** `feat(home): customize panel with drag reorder and locked roadmap tiles`

---

### Week gate — W4

Run §V with scope "W4". Tick the W4 row in `ROADMAP.md` §2.

---

## W5 — Arrivals & departures (proposal phase 6)

### Prompt 10 — `/dashboard/checkins` → `/dashboard/arrivals`, two tabs

```
Read APP_UX_PROPOSAL.md §5.2, app/[lang]/dashboard/checkins/{page,actions,loading}.tsx,
components/dashboard/checkin-chasers.tsx (ChaserItem stays exactly as it is),
lib/checkin-chaser.ts, lib/todo-rules.ts (TodoTarget has { page: "checkins" }),
components/dashboard/todo-list.tsx (builds hrefs from TodoTarget), the arrivals/
departures queries from W3 Prompt 7, the segmented sort toggle in
components/dashboard/email-inbox.tsx (copy its treatment), and
FONDA_SANA_REDESIGN.md.

This is a container change, not a component rewrite.

1. Move app/[lang]/dashboard/checkins/* to app/[lang]/dashboard/arrivals/*.
   Leave app/[lang]/dashboard/checkins/page.tsx as a redirect page (admin
   pattern) to /dashboard/arrivals, preserving any query string.
   Update the nav href in layout.tsx, the Home widget "+N more" helper, and
   every other reference (grep for "/dashboard/checkins").

2. lib/todo-rules.ts: rename the target `{ page: "checkins" }` to
   `{ page: "arrivals" }` and update todo-list.tsx's href builder. Grep for
   "checkins" across lib/ and components/ and rename what refers to the page;
   leave `checkin_chasers` (the table) and chaser terminology alone.

3. The page: header "Today · 18 September" (existing date formatting), the
   existing "Generate chasers" action at the right, then a segmented control
   role="group" with two buttons — "Arrivals (12)" and "Departures (9)" — using
   the same treatment as the inbox sort toggle. The selected tab is a `?tab=`
   search param read server-side (like the inbox cookie, so the list doesn't
   flip after paint); default "arrivals".

4. Arrivals tab: the whole day, not only the exceptions. The existing chaser grid
   stays at the top for arrivals that still need an ETA (queue framing: "4 still
   need an ETA"), then the rest of today's arrivals as a plain list: guest · room
   type · ETA · returning-guest marker · a link to the guest record at
   /dashboard/guests/[customer_mews_id] (route exists as a stub until Guests v1;
   link anyway — build the href with one helper).

5. Departures tab: name · room · departure time · late-checkout requested (only
   if the field exists — do not invent it). No balance column.

6. Empty states: EmptyState per tab ("No arrivals today" / "No departures
   today"), not FirstRunState (the PMS is connected if you are here).

7. loading.tsx for the new route; dictionaries (tab labels, counts, empty
   states) in all three languages; rename sidebar.checkins → sidebar.arrivals
   readers if any still exist.

Run `npm run lint` and `npx tsc --noEmit`. Verify: /dashboard/checkins and
/dashboard/checkins?foo=1 redirect correctly; a to-do that targets arrivals
lands on the right tab; ChaserItem is byte-for-byte unchanged (git diff on that
file should be empty). Show me the final diff.
```

**Look for** — a rename touches more than it looks like it does.

- `/dashboard/checkins` and `/dashboard/checkins?foo=1` both land on `/dashboard/arrivals` with the query string intact.
- The segmented control carries live counts — "Arrivals (12)", "Departures (9)" — and looks identical to the inbox sort toggle. Put them side by side and compare.
- Select Departures, reload: it stays on Departures with no flip after paint. That flip is the thing the `?tab=` server read exists to prevent.
- The Arrivals tab shows the **whole day**, not only the exceptions: chaser grid on top, full list beneath.
- Guest names link to `/dashboard/guests/[id]` — a stub for now, so expect ComingSoon, not a 404.
- An empty day shows EmptyState ("No arrivals today"), not FirstRunState.
- A to-do that targets arrivals lands on the right tab.

**Wrong if:** `git diff` on `checkin-chasers.tsx` is not empty. That file was meant to be untouched.

**Commit:** `feat(arrivals): rename check-ins to arrivals & departures, two tabs`

---

### Week gate — W5

Run §V with scope "W5". Tick the W5 row in `ROADMAP.md` §2.

---

## W6 — Communications, two windows (proposal phase 7)

### Prompt 11 — `StayPhase` widened; In-house and Upcoming routes

```
Read APP_UX_PROPOSAL.md §5.3 (all of it, including the stay-phase.ts quote),
lib/stay-phase.ts, lib/email-urgency.ts, lib/inbox.ts (loadInbox,
withGuestContext), lib/inbox-sort.ts (SORT_COOKIE is read server-side — keep
that property), app/[lang]/dashboard/communications/{page,actions,loading}.tsx,
components/dashboard/email-inbox.tsx, components/dashboard/first-run-state.tsx,
and FONDA_SANA_REDESIGN.md.

1. lib/stay-phase.ts: widen
     export type StayPhase = "in_house" | "pre_arrival" | "post_stay" | "unmatched";
   stayPhaseFor: no reservation → "unmatched"; departure < today → "post_stay";
   arrival > today → "pre_arrival"; else "in_house". It stays pure, computed on
   read, never stored — update the docblock, and keep the historical note about
   the earlier split (it is why In-house owns a channel of its own now). Fix
   every consumer: lib/email-urgency.ts's arrival-based rules must treat
   post_stay and unmatched the way they treated pre_arrival before (no urgency
   change from this refactor — add a comment saying so).

2. Routes:
   - app/[lang]/dashboard/communications/in-house/page.tsx — replaces the W2
     stub. Filters loadInbox to stayPhase === "in_house".
   - app/[lang]/dashboard/communications/upcoming/page.tsx — stayPhase ===
     "pre_arrival" with arrival >= today, PLUS post_stay and unmatched behind a
     quiet filter chip ("Show past stays & other mail", off by default; a
     search param, read server-side).
   - app/[lang]/dashboard/communications/page.tsx becomes a redirect: to
     in-house if it has unanswered mail and upcoming does not, otherwise to
     upcoming. PRESERVE THE QUERY STRING — /dashboard/communications?email=<id>
     is a real deep link. Better: if ?email is present, look the email up,
     compute its phase, and redirect straight to the right scoped route with
     the same ?email.
   - Factor the shared page body into one server component that takes the
     phase filter, so the two routes are ~20 lines each.

3. Deep links: update the three call sites (needs-reply-card.tsx, todo-list.tsx,
   the chat DraftResultCard) to link to the scoped route directly, computing the
   phase from data they already have where possible, and falling back to the
   parent redirect where they don't. Remove the W2 "will be scoped" comments.

4. In-house, first-run card: above the list, a FirstRunState card offering to
   connect WhatsApp ("In-house guests text more than they email. Connect
   WhatsApp to bring those messages here." — dictionary, three languages), with
   a disabled/coming-soon action that fires analytics event
   "whatsapp_connect_clicked" (no payload). It shows whenever WhatsApp is not
   connected — i.e. always, for now — and sits above in-stay email, which still
   lists. This is the honest state; do not render an empty list alone.

5. Concierge: retarget the W2 redirect at /dashboard/concierge to
   /dashboard/communications/in-house. Remove the `concierge` row from
   lib/roadmap.ts and its dictionary entries.

6. Nav: the badge (unanswered count) now splits — in-house count on the In-house
   row, upcoming count on the Upcoming row. Check how the badge is loaded in
   layout.tsx and extend it, not duplicate it.

7. loading.tsx for both routes; dictionaries in all three languages.

Run `npm run lint`, `npx tsc --noEmit`, `npm run analytics-pii-audit`. Verify:
an email from a guest who checked out yesterday appears under Upcoming only with
the chip on; a guest arriving tomorrow is under Upcoming; a guest in-house is
under In-house; /dashboard/communications?email=<id> lands on the right tab
with the message open; the sort cookie still applies server-side. Show me the
final diff.
```

**Look for** — three real guests, three routes. Do this with actual data, not by reading the diff.

- A guest currently in-house → In-house. Arriving tomorrow → Upcoming. Checked out yesterday → Upcoming **only** with the "Show past stays & other mail" chip on.
- `?email=<id>` deep links open the right scoped route with the message open. Test all three entry points: a to-do, a needs-reply card, and a chat draft card.
- Bare `/dashboard/communications` redirects sensibly and doesn't bounce between the two.
- The nav badges split across the two rows, and the two numbers add up to what the single badge showed before.
- In-house shows the WhatsApp first-run card **above** a real list of in-stay email — not instead of it. An empty list alone would be dishonest.
- Reload with a non-default sort: still no flip after paint.
- Spot-check urgency: an email that was urgent before this refactor is still urgent. The StayPhase widening was not supposed to change that.
- `/dashboard/concierge` now lands on In-house.

**Commit:** `feat(communications): in-house and upcoming windows; StayPhase widened to four`

---

### Prompt 12 (optional, high value) — Queue framing: Needs you · Waiting · Done today

```
Read APP_UX_PROPOSAL.md §5.3 "Queue framing over sort" and §7.3,
components/dashboard/email-inbox.tsx, lib/inbox-sort.ts, lib/inbox.ts, and the
emails.status enum in types/database.ts (pending | sent | ignored |
needs_attention).

Supplement the date/urgency sort toggle with a queue segmented control above the
list, on both communications routes:
  Needs you  = status in (pending, needs_attention)
  Waiting    = status = sent and no reply received since (use the thread's last
               inbound timestamp; if that isn't tracked, "Waiting" = sent within
               the last 72h)
  Done today = status in (sent, ignored) updated today (hotel timezone)
Each label carries its count. Selecting one filters the list; the sort toggle
still orders within the queue. Persist the selected queue the same way the sort
is persisted (a server-read cookie, sibling of fondas_inbox_sort — keep the
no-flip-after-paint property). Default queue: Needs you. When Needs you is
empty, show EmptyState with "Inbox clear" — a queue can be emptied; make that
moment visible.

Same segmented treatment as the arrivals tabs. Dictionaries, three languages.
Run `npm run lint` and `npx tsc --noEmit`. Show me the diff.
```

**Look for** — counts and persistence.

- The segmented control sits above the list on both routes, in the same treatment as the arrivals tabs.
- Count each queue by hand once. A wrong count here is worse than no count.
- Default is "Needs you". Pick "Waiting", reload — still Waiting, no flip after paint.
- The sort toggle still orders within the selected queue rather than replacing it.
- Empty the "Needs you" queue and look at it: "Inbox clear". If it shows a generic empty state, that moment has been lost and it's worth sending back.

**Commit:** `feat(communications): queue framing — needs you, waiting, done today`

---

### Week gate — W6

Run §V with scope "W6". Tick the W6 row in `ROADMAP.md` §2.

*(W7 is Billing — B20 — and is outside this pack. See `EXECUTION_PLAYBOOK.md`.)*

---

## W7 — Billing — *no prompts in this pack*

W7 ships Stripe and trial gating (B20), which is a commercial build, not an app
IA change: its prompt lives in `EXECUTION_PLAYBOOK.md`, not here. The gap in the
numbering is deliberate.

`ROADMAP.md` §2 warns that W7 is gated on the legal entity, which takes weeks to
incorporate. **If W7 slips, W8 does not move up into its slot** — the weeks are
a release train, and pulling Reputation forward to fill a gap is how a week's
work becomes two half-finished ones. Ship nothing that week, or take something
off §3 that is genuinely one week long.

---

## W8 — Reputation (proposal §6)

### Decide before Prompt 13 (decision P-4)

The proposal says "fetch reviews → classify with Haiku → theme them" but does not
say **where reviews come from**. TripAdvisor has no review-read API for this
purpose, and scraping it is not something to let Claude Code decide. Pick one and
write it into `APP_UX_PROPOSAL.md` §11 as decision 7:

| Option | Pros | Cons |
|---|---|---|
| **Google Business Profile API** (reviews for the hotel's listing) | Official, structured, star + text + date; Google is the score a GM actually watches | OAuth + business verification per hotel — a `/connect/google` flow like Gmail's |
| **Manual import** (paste / CSV of reviews, any source) | Zero integration; ships in the week | GM has to feed it; weakest "weekly number" |
| **A reviews aggregator API** (e.g. one of the hospitality review services) | Multi-source in one call | New vendor, cost, contract |

The prompts below are written for **Google Business Profile**, with the manual
import as the fallback path inside the same data model (a `source` column). If you
choose differently, edit step 2 of Prompt 13 before running it.

### Prompt 13 — Reputation: data model, ingestion, classification

```
Read APP_UX_PROPOSAL.md §6 and §11 decision 7, lib/email-processor.ts (the Haiku
classifier pattern to copy), lib/briefing.ts (pseudonymisation before sending
to Claude), app/connect/gmail/{route.ts,callback/route.ts} (the OAuth pattern
to copy), lib/gmail-status.ts, components/dashboard/tripadvisor-form.tsx and the
hotel_settings columns tripadvisor_url / review_highlights / review_summary,
supabase/migrations/0021 (comment convention), and CLAUDE.md.

Data layer only. No page in this step.

1. supabase/migrations/0025_reviews.sql:
   create table public.reviews (
     id uuid primary key default gen_random_uuid(),
     hotel_id uuid not null references public.hotels(id) on delete cascade,
     source text not null,                 -- 'google' | 'manual'
     external_id text,                     -- source's id, unique per hotel+source
     rating smallint not null check (rating between 1 and 5),
     author_display text,                  -- first name / initial only, never the full name
     body text not null,
     published_at timestamptz not null,
     themes jsonb,                         -- [{theme, sentiment, quote}] from the classifier
     classified_at timestamptz,
     created_at timestamptz not null default now(),
     unique (hotel_id, source, external_id)
   );
   RLS: hotel-scoped read for authenticated users of that hotel (same helper as
   every other table); writes only via server code. Header comment in the 0021
   voice, including the PII posture (author_display is deliberately truncated
   at write time; body may contain names — it is a public review, but we still
   never log it).
   Add the type to types/database.ts by hand.

2. Ingestion (per decision 7): app/connect/google-reviews/{route.ts,
   callback/route.ts} following the Gmail OAuth pattern, storing the encrypted
   token the way Gmail's is stored (lib/encryption.ts), and lib/reviews.ts with
   `syncReviews(hotelId)` that pulls new reviews since the last published_at and
   upserts on (hotel_id, source, external_id). Also a manual path: a server
   action `importReviews(hotelId, rows)` used by a simple paste form later.
   Wire syncReviews into the existing sync cron (app/api/sync/route.ts or a
   sibling — follow what the PMS sync does) at a daily cadence.

3. Classification: lib/review-classifier.ts, a Haiku call in the exact shape of
   lib/email-processor.ts — same model constant, same error handling, same
   logging discipline (no review body in logs). Prompt: return 1–3 themes from
   a fixed vocabulary (cleanliness, staff, breakfast, noise, location, value,
   room, wifi, check-in, other), each with sentiment (+/−) and one short quote.
   Store in reviews.themes; run for unclassified rows inside syncReviews, capped
   per run.

4. lib/reputation.ts: `loadReputation(hotelId, window)` returning score (mean
   rating last 30 days), delta vs prior 30 days, review count, top positive and
   top negative themes with counts and one quote each, and the five most recent
   reviews. Pure read model, cached at request level like the dashboard snapshot.

5. Settings → Connections: a card for Google reviews following
   gmail-connection-card.tsx (connect / connected since / disconnect), and keep
   tripadvisor-form.tsx as it is.

Run `npm run lint`, `npx tsc --noEmit`, `npm run analytics-pii-audit`. Tell me
the migration is ready to apply. Show me the diff.
```

**Look for** — no page yet; `/dashboard/reputation` is still the stub. Check the data.

- Read the migration: RLS hotel-scoped, `unique (hotel_id, source, external_id)`, and `author_display` truncated **at write time**, not at render.
- Connect Google reviews in Settings → Connections. The card should match the Gmail card's look and its three states (connect / connected since / disconnect); `tripadvisor-form.tsx` is unchanged beside it.
- Run the sync twice. No duplicate rows — that's what the unique constraint is for, so confirm it holds.
- Read a handful of classified rows: themes come from the fixed vocabulary, the sentiment matches the text, and the quote actually appears in the body.
- Grep the logs for review text and author names. There should be none.

**Commit:** `feat(reputation): reviews table, Google reviews sync, theme classifier (migration 0025)`

Apply `0025` before Prompt 14.

---

### Prompt 14 — Reputation: the surface

```
Read APP_UX_PROPOSAL.md §6 and §7.4, lib/reputation.ts from the previous step,
components/dashboard/stat-row.tsx, occupancy-strip.tsx (the ONE accent lives
here — Reputation gets no second one), brief-hero.tsx, and
FONDA_SANA_REDESIGN.md §6–§7. Also read the dataviz guidance if a chart is
involved: keep it monochrome except where the spec already grants an accent.

Replace the /dashboard/reputation stub with the first real Commercial surface.

1. Header: "Reputation", a freshness line ("Google · synced 06:40") in the same
   mono treatment Home uses, and a "Connect Google reviews" FirstRunState when
   no source is connected and no manual reviews exist.

2. Score movement, first: a StatRow-style 3-up — score (one decimal), change vs
   the prior 30 days (+0.2 / −0.1, plain text, no colour), reviews in the
   window. Below it, a 12-week sparkline of weekly mean rating in monochrome ink
   on --fonda-border gridlines; no accent, no fill.

3. "What's moving it": two columns — praised / criticised — each a list of
   themes with count and one quote in 60ch prose, quotes in --fonda-text-2.

4. Recent reviews: the five latest, rating as five small monochrome dots
   (filled/unfilled), author_display, date, body clamped to 3 lines with an
   expand control.

5. Provenance: a SourceChip ("Google reviews") on the score card, per §7.4 —
   extract SourceChip from chat-thread.tsx into components/dashboard/source-chip.tsx
   first, unchanged in look, so it can be reused (the sweep will use it too).

6. loading.tsx; EmptyState for a connected source with no reviews yet; dictionaries.
   Reputation is a shared nav row — confirm that on this route the Operation
   icon is lit and Commercial is not.

Run `npm run lint` and `npx tsc --noEmit`. Verify at desktop and 375px, three
locales, with a hotel that has reviews and one that doesn't. Show me the diff.
```

**Look for** — the first Commercial surface, so it sets the tone for the rest of that pillar.

- Score movement leads: score to one decimal, the delta as plain text (no red, no green), review count.
- The sparkline is monochrome ink on `--fonda-border` gridlines, no fill. Any colour here is a second accent and has to go.
- Praised / criticised in two columns, quotes in ~60ch prose, not stretched full width.
- Recent reviews: ratings as small monochrome dots, bodies clamped to three lines with a working expand.
- A "Google reviews" SourceChip on the score card — and chat still looks identical after the chip was extracted out of `chat-thread.tsx`.
- On this route the Operation icon lights and Commercial does not.
- Check both empty paths: a hotel with no source connected shows FirstRunState; a connected hotel with zero reviews shows EmptyState. They are different states.
- At 375px the 3-up doesn't crush and the sparkline scales.

**Commit:** `feat(reputation): score movement, themes and recent reviews`

---

### Week gate — W8

Run §V with scope "W8". Tick the W8 row in `ROADMAP.md` §2.

---

## Then, in order (proposal phases 8–12)

### Prompt 15 — The guest context pane (phase 8)

```
Read APP_UX_PROPOSAL.md §1.5, §5.3 "A third pane" and §7.2, lib/inbox.ts
(withGuestContext — it already loads the guest and reservation), lib/urgency-note.ts,
components/dashboard/email-inbox.tsx, components/dashboard/guest-avatar.tsx,
types/database.ts (customers, reservations columns), and FONDA_SANA_REDESIGN.md.

Build the pane once, mount it in the inbox now; arrivals and guests mount it later.

1. components/dashboard/guest-context-panel.tsx (server component, takes the
   already-loaded guest + reservation + prior-stay count as props): 280px,
   --fonda-surface, hairline left border. Top to bottom: GuestAvatar + name +
   a "Returning · 3rd stay" line when applicable; Stay (dates, room type,
   nights); Facts (nationality, language, adults/children — each row only if
   the value exists, never "—"); a link "Open guest record" to
   /dashboard/guests/[customer_mews_id]. Nothing editable here.

2. Mount it in email-inbox.tsx as a third column at xl and above
   (list · thread · context). Below xl it does not render at all (two panes stay
   as they are); do not collapse it into a drawer in this step. The existing
   one-line urgency note stays in the thread header — the pane complements it.

3. Unmatched sender (no reservation): the pane shows the sender's display name
   and a quiet line "Not matched to a booking" — EmptyState-style, no CTA.

4. PII: this is a server component; nothing about the guest is serialised to a
   client component that was not already receiving it. Confirm by reading the
   client boundary in email-inbox.tsx and say where it is.

Dictionaries (three languages). Run `npm run lint` and `npx tsc --noEmit`.
Verify at 1280 and 1440 wide, and that 1024 still shows two panes. Show me the diff.
```

**Look for** — resize the window slowly; the breakpoint is the point.

- At 1440: three columns — list, thread, context. At 1024: two, and the pane is **gone**, not squeezed and not a drawer.
- The pane is 280px on `--fonda-surface` with a hairline left border.
- Facts show only values that exist. A row reading "—" means the conditional wasn't applied.
- "Returning · 3rd stay" appears only when it's true.
- An unmatched sender shows the display name and a quiet "Not matched to a booking", with no call to action.
- The one-line urgency note is still in the thread header and is not repeated in the pane.
- "Open guest record" resolves — a stub until Prompt 17, which is fine, but not a 404.

**Commit:** `feat(communications): guest context pane at xl`

---

### Prompt 16 — Chat threads (phase 9)

```
Read APP_UX_PROPOSAL.md §4.1, §4.2 (including the PII warning) and §11
decision 6 point 2 (transcripts pseudonymised at rest, real names in the live
context), supabase/migrations/0010_chat_logs.sql, lib/briefing.ts (find the
surname pseudonymisation and reuse the same function — extract it to
lib/pseudonymise.ts if it isn't already shared), app/api/chat/route.ts,
components/dashboard/chat/{chat-surface,chat-thread,use-hotel-chat}.tsx,
components/dashboard/ask-your-hotel.tsx, and FONDA_SANA_REDESIGN.md §8.

1. supabase/migrations/0023_chat_threads.sql:
   alter table public.chat_logs add column thread_id uuid;
   alter table public.chat_logs add column user_id uuid references public.users(id);
   create table public.chat_threads (
     id uuid primary key default gen_random_uuid(),
     hotel_id uuid not null references public.hotels(id) on delete cascade,
     user_id  uuid not null references public.users(id) on delete cascade,
     title text,
     created_at timestamptz not null default now(),
     last_message_at timestamptz not null default now()
   );
   Index chat_logs(thread_id, created_at). RLS on chat_threads: a user reads and
   writes only their own threads within their hotel; chat_logs' existing
   policies extended so a user reads only rows whose thread they own (existing
   null-thread rows stay unreadable to the list — they simply don't appear).
   Header comment: why existing rows keep null thread_id, and the at-rest
   pseudonymisation rule. Add types by hand. Do not run it.

2. app/api/chat/route.ts: accept an optional threadId; create a thread on the
   first message (title = first user message trimmed to 80 chars); write every
   turn to chat_logs with thread_id + user_id, with `content` passed through the
   shared pseudonymise function BEFORE insert. The live request to Claude keeps
   real names (decision 6). Update last_message_at. Return threadId to the client.

3. use-hotel-chat.ts: hold threadId in state; `reset()` starts a new thread
   rather than dropping history on the floor; loading an existing thread hydrates
   the transcript from chat_logs (pseudonymised — note this visibly with a quiet
   mono line at the top of a restored thread: "Names in past conversations are
   shortened" — dictionary).

4. Thread list: a left column INSIDE /dashboard/chat (not in the rail — the rail
   stays five): 240px at lg+, a drawer toggle below. Rows: title, relative time.
   "New conversation" at the top. Active row lit by darkness. Selecting one sets
   ?thread=<id>. Blank state of the page (no thread selected) is unchanged, with
   the starter questions from W3.

5. AskYourHotel (the docked bar on every page): one new control, "Continue in
   chat ↗", visible once the bar's thread has at least one exchange; it pushes
   to /dashboard/chat?thread=<id> with history intact (the bar already has the
   threadId from step 2).

6. Dictionaries; loading state for the thread list; the pseudonymise function
   gets a comment listing every caller (briefing, chat).

Run `npm run lint`, `npx tsc --noEmit`, `npm run analytics-pii-audit`. Verify:
ask on Tuesday's thread, reload, it is in the list; a stored row in chat_logs
has the surname shortened while the on-screen live answer showed the full name;
another user of the same hotel does not see the thread. Show me the diff and
the SQL.
```

**Look for** — the important check is in the database, not on screen.

- Ask something, reload: the thread is in the list with a sensible title trimmed from your first message.
- Open `chat_logs` directly. Surnames are shortened **at rest**, while the answer you saw on screen used the full name. If they match, pseudonymisation didn't run.
- A restored thread carries the quiet mono line explaining that past names are shortened.
- "New conversation" starts a fresh thread without dropping the previous one.
- The thread list lives inside `/dashboard/chat` (240px at lg+, a drawer below). The rail is still five icons — check it.
- "Continue in chat ↗" shows on the docked bar only after an exchange, and carries the history across intact.
- Sign in as another user of the same hotel: your threads are not visible to them.

**Commit:** `feat(chat): persistent threads, thread list, continue-in-chat handoff (migration 0023)`

Apply `0023` before merging.

---

### Prompt 17 — Guests v1: the record (phase 10)

```
Read APP_UX_PROPOSAL.md §5.4 (all, including the PII warning) and §11 decision 6
(24-month retention, hard delete nightly; stated on /trust), CLAUDE.md "Safety &
boundaries", lib/inbox.ts (the emails ↔ reservations join — you run it the other
way round), lib/checkin-chaser.ts, lib/email-processor.ts (the Haiku classifier
pattern), lib/pseudonymise.ts, components/dashboard/guest-context-panel.tsx,
app/api/cron/{emails,briefing,checkin}/route.ts and vercel.json (cron pattern),
app/[lang]/(legal)/trust/page.tsx, and
FONDA_SANA_REDESIGN.md.

1. supabase/migrations/0024_guest_profiles.sql:
   create table public.guest_profiles (
     hotel_id uuid not null references public.hotels(id) on delete cascade,
     customer_mews_id text not null,
     trip_purpose text check (trip_purpose in
       ('leisure','business','family','romantic','group','unknown')),
     occasion text check (occasion in ('birthday','anniversary','honeymoon') or occasion is null),
     preferences jsonb,        -- [{text, source: 'email'|'reservation'|'staff', at}]
     notes text,               -- staff-written; NEVER touched by inference
     inferred_at timestamptz,
     last_stay_end timestamptz,  -- drives retention
     updated_at timestamptz not null default now(),
     primary key (hotel_id, customer_mews_id)
   );
   RLS hotel-scoped, authenticated read/write for that hotel's users. Header
   comment: retention rule (24 months after last_stay_end), the notes rule, and
   that inference never overwrites a staff edit. Types by hand. Do not run it.

2. Retention: app/api/cron/retention/route.ts, protected the way the other
   crons are, deleting guest_profiles where last_stay_end < now() - interval
   '24 months', logging only counts to cron_logs. Add it to vercel.json nightly.

3. lib/guests.ts: `listGuests(hotelId, { view: 'in_house_and_arriving' | 'all',
   q })` over customers + reservations; `loadGuestRecord(hotelId,
   customer_mews_id)` returning facts (nationality_code, language_code,
   adult_count, child_count, current/next stay dates + requested room type,
   prior-stay count) + the profile + a merged timeline of emails (subject,
   status, date), checkin_chasers (sent/replied, date) and prior reservations
   (dates, nights, room type), reverse-chronological.

4. Inference: lib/guest-inference.ts — Haiku, same shape as email-processor.ts.
   Inputs: the guest's email thread (pseudonymised like the brief) + reservation
   shape (adults, children, nights, weekday/weekend, lead time). Output:
   trip_purpose, occasion, preferences[] each with a source and the sentence it
   came from. Write rules: only fill fields that are null or whose existing
   value carries source != 'staff'; never write `notes`. Run it lazily on first
   record view if inferred_at is null or older than the latest email, capped.

5. /dashboard/guests: replaces the stub. Search input (server-read ?q), a
   segmented view toggle (In house & arriving / All), a list — GuestAvatar ·
   name · dates · room type · tags (trip purpose, occasion) as 12px rounded-full
   chips in --fonda-text-2 on --fonda-bg (no hue). Row links to the record.

6. /dashboard/guests/[id]: the Shopify/Twenty anatomy from §5.4 — a 280px left
   column (reuse guest-context-panel.tsx's sections, plus Tags and Notes) and the
   timeline on the right. Tags editable inline (select + clear), each showing its
   source on hover/focus ("inferred from email, 12 Sep" / "staff"). Notes is a
   textarea saved via server action with an explicit Save; a saved note sets
   source 'staff' on the profile row so inference stays out of it.

7. /trust: add two lines — guest profiles kept 24 months after the last stay
   then deleted; chat transcripts stored with surnames shortened. Dictionaries
   for all of the above, three languages.

8. Mount the "Open guest record" link from the context pane (already pointed at
   this route) and the arrivals list (W5 helper) — both should now resolve.

Run `npm run lint`, `npx tsc --noEmit`, `npm run analytics-pii-audit`. Verify:
a staff note survives an inference run; an inferred tag shows its source; the
retention cron deletes a seeded row with last_stay_end 25 months ago and leaves
one at 23; search never leaks across hotels (test with two seeded hotels).
Show me the diff and the SQL.
```

**Look for** — the two tests that matter here are the note and the hotel boundary.

- Write a staff note, then trigger an inference run. The note must come back untouched, and a staff-sourced tag must not be overwritten. If either changes, stop and send it back.
- Seed two hotels and search from one. No guest from the other appears, ever. Do this one deliberately.
- Tags are 12px rounded-full chips in `--fonda-text-2` on `--fonda-bg` — no hue. Coloured chips are wrong.
- Hover or focus a tag: it says where it came from ("inferred from email, 12 Sep" / "staff").
- The record is a 280px left column plus a timeline that merges emails, chasers and prior stays in reverse-chronological order.
- Retention: a seeded profile at 25 months past last stay is deleted, one at 23 months is kept, and only counts are logged.
- `/trust` carries the two new lines, in all three languages.

**Commit:** `feat(guests): guest list and record with inferred tags and protected notes (migration 0024)`

---

### Prompt 18 — Chat grounding: specific source chips (proposal §4.4)

```
Read APP_UX_PROPOSAL.md §4.4 and §7.4, FONDA_SANA_REDESIGN.md §8.2 (this is the
one part of the chat spec not yet built), components/dashboard/source-chip.tsx
(extracted in W8), components/dashboard/chat/chat-thread.tsx, app/api/chat/route.ts
and lib/hotel-context.ts.

Make the chips specific. The chat route already knows which parts of the context
it assembled (arrivals, inbox, house policies, reviews, rates…). Return a
`sources: string[]` array with each answer (keys, not prose) and render one
SourceChip per key with a dictionary label: "Apaleo · today's arrivals",
"Gmail · 3 unread", "House policies", "Google reviews", "Guest record". Keep
the generic "hotel data" chip only when the model used nothing specific. Same
12px rounded-full chip, no hue. Three languages. Do not change the model prompt
beyond what is needed to report which context blocks were included.

Run `npm run lint` and `npx tsc --noEmit`. Ask the six starter questions and
paste me which chips each one produced. Show me the diff.
```

**Look for** — ask the six starter questions and read the chips.

- Each answer carries specific chips ("Apaleo · today's arrivals", "Gmail · 3 unread"), not the generic "hotel data".
- Ask something off-topic: the generic chip should appear there and only there.
- The chips are visually identical to the existing ones — 12px rounded-full, no hue.
- es and ca labels are translated.
- Answer quality didn't change. The model prompt was only supposed to report which context blocks it used.

**Commit:** `feat(chat): specific source chips per answer`

---

### Prompt 19 — Provenance on the brief and the drafts (proposal §7.4)

```
Read APP_UX_PROPOSAL.md §7.4, components/dashboard/source-chip.tsx,
components/dashboard/briefing-article.tsx, lib/briefing.ts (what each section
was built from and when the PMS was last synced), and the draft reply rendering
in components/dashboard/email-inbox.tsx.

1. Each brief section gets one SourceChip in its heading row: "from Apaleo ·
   synced 06:40" / "from Gmail" / "House settings", derived from what
   lib/briefing.ts fed that section. If the section provenance isn't recorded
   today, record it in the briefing JSON at generation time (additive field;
   old briefs without it render no chip).

2. Each draft reply gets one line under the draft, not a chip: "Drafted from
   this thread and your house tone" (mono, --fonda-text-3), plus "· edited" when
   draft_edit_events shows the GM changed it.

Dictionaries, three languages. Run `npm run lint` and `npx tsc --noEmit`. Show
me the diff.
```

**Look for** — restraint. This is easy to overdo.

- One chip per brief section heading. Open an old brief generated before this change: no chips, and nothing breaks.
- The draft reply gets a **line**, not a chip. If it renders as a chip the page starts to rattle, which is exactly what §7.4 warns about.
- "· edited" shows only on a draft you actually edited.

**Commit:** `feat(trust): provenance chips on brief sections and draft replies`

---

### Prompt 20 — Command palette ⌘K (proposal §7.1)

```
Read APP_UX_PROPOSAL.md §7.1, the RailSection / AccountMenu popover code in
components/dashboard/sidebar.tsx (focus trap, Esc, pointer-down-outside — reuse),
app/[lang]/dashboard/layout.tsx (the nav tree is the page index), lib/guests.ts
(listGuests for the guest search), and FONDA_SANA_REDESIGN.md §5–§6.

Scope is deliberately small: pages, then guests, then "Ask".

1. components/dashboard/command-palette.tsx (client): opened by ⌘K / Ctrl+K
   anywhere in the dashboard and by a small search glyph at the top of the rail
   under the Fonda mark (does not count as a sixth icon — it is a control, not
   a destination; keep it visually quieter than the five). Centred dialog,
   --fonda-surface, 10px radius, an input, results grouped by mono eyebrows.
   Focus trapped; Esc closes; ↑/↓ moves; Enter activates. No dependency.

2. Results:
   - Pages: static, from the nav tree passed in from the layout (labels from
     the dictionary, hrefs localized). Fuzzy-ish prefix match is enough.
   - Guests: after 2 characters, a debounced server action calling listGuests
     with q, returning at most 5 {display name, dates, href}. Server action only;
     no client-side guest data beyond what is shown.
   - Last row always: "Ask: <query>" → /dashboard/chat with the query
     pre-filled (use a ?q= param the chat page consumes once and clears).

3. Skip reservations. Skip recent items. Skip actions.

Dictionaries, three languages. Run `npm run lint` and `npx tsc --noEmit`.
Verify keyboard-only use end to end and that the guest search returns nothing
for another hotel's guest. Show me the diff.
```

**Look for** — do the whole thing without touching the mouse.

- ⌘K / Ctrl+K opens it anywhere in the dashboard, Esc closes it, focus returns where it was.
- Arrows move, Enter activates, and the trap holds.
- The search glyph at the top of the rail is visibly quieter than the five icons. If it reads as a sixth destination, it's wrong.
- Type two characters: at most five guests, debounced — watch the network tab for one request per pause, not one per keystroke.
- The last row is always "Ask: <query>", and it lands in chat with the query pre-filled and the param cleared after use.
- Another hotel's guest returns nothing.

**Commit:** `feat(dashboard): command palette — pages, guests, ask`

---

### Prompt 21 — The sweep (phase 12)

```
Read APP_UX_PROPOSAL.md §8.3, §10 phase 12, and §12. Read FONDA_SANA_REDESIGN.md.

1. Replace `text-primary` used as a link colour in brief/page.tsx,
   briefing-generating.tsx and settings/connections/page.tsx with a plain
   LocaleLink in --fonda-text with underline, per button.tsx's own comment.
   Grep for any new occurrences introduced during this pack and fix those too.

2. Audit: grep components/dashboard, components/ui and app/[lang]/dashboard for
   hard-coded hex, bg-white, text-black, and any --fonda-accent use outside
   occupancy-strip.tsx. Report; fix anything that isn't SVG art or a comment.

3. Rail check: exactly five icons + Settings + Account. Grep the layout tree and
   confirm nothing crept in.

4. Loading and empty states: every route under app/[lang]/dashboard has a
   loading.tsx (list the ones missing and add them, matching the neighbour's
   skeleton), and every list surface uses EmptyState vs FirstRunState correctly
   (nothing-to-do vs not-set-up). List the surfaces and which one each uses.

5. Dictionaries: a script-style check that en/es/ca have identical key sets and
   order (write it inline with node, do not add a file); fix drift.

6. Docs: amend FONDA_SANA_REDESIGN.md §5 if the W2 paragraph needs the palette
   and the context pane mentioned; update README.md's product overview to list
   the live surfaces; mark APP_UX_PROPOSAL.md's status line as "Built through
   phase 12" with the date; move APP_UX_PROMPTS.md to docs/archive/ with a
   one-line retirement header like the other archived prompt packs.

7. Run `npm run lint`, `npx tsc --noEmit`, `npm run build`,
   `npm run analytics-pii-audit`, and `npm run reliability-check`. Paste all
   five results.

Show me the diff.
```

**Look for** — this is the last full pass, so do it properly rather than trusting the greps.

- All five command outputs pasted and clean.
- Click every dashboard route in en, es and ca, at 1440 and 375. Note anything that overflows, truncates or shows a raw key.
- No `text-primary` links left anywhere; in-app links are ink with an underline.
- The grep results for hex, `bg-white`, `text-black` and any accent outside `occupancy-strip.tsx` come back empty.
- The rail is still exactly five icons plus Settings and Account.
- Throttle the network and click through: a route that flashes blank is missing its `loading.tsx`.
- The en/es/ca key-set check passes with no drift.
- `APP_UX_PROPOSAL.md`'s status line is updated and this pack has moved to `docs/archive/` with its retirement header.

**Commit:** `chore(dashboard): post-IA sweep — links, audit, loading states, docs`

---

## V — Verification prompt (run at every week gate)

Paste with the scope filled in. It writes nothing except fixes for what it finds.

```
Scope: <W2 | W3 | W4 | W5 | W6 | W8 | final>.

Read APP_UX_PROPOSAL.md §10 and find the "Done when" column for the phases in
this scope. Then:

1. `npm run lint`, `npx tsc --noEmit`, `npm run build`. All three must be clean.
   Paste the output.
2. Start the dev server. For every route touched in this scope, visit it in
   en, es and ca at 1440 and 375 wide. Report anything that overflows,
   truncates, or shows an untranslated key.
3. Old URLs: visit each redirect from APP_UX_PROPOSAL.md §2.5 and confirm the
   destination. Confirm /dashboard/communications?email=<a real id> still opens
   that message.
4. Keyboard: Tab through the rail, open and close each panel with Enter/Esc,
   open and close every new panel/dialog in this scope with the keyboard only.
   Report any focus that escapes or is lost.
5. Design: grep the scope's files for hex colours, bg-white, text-black, pills
   (rounded-full on anything but 12px chips/dots), and any accent outside
   occupancy-strip.tsx. Report.
6. PII: `npm run analytics-pii-audit`; grep new server code for console.log of
   guest fields. Report.
7. Check each "Done when" line for the scope and answer yes/no with evidence.

Fix what is fixable inside this scope; list what isn't with the file and line.
Do not start the next week's work.
```

---

## Suggested commit sequence

```
W2   feat(nav): two-pillar nav tree, dictionaries and roadmap rows
     feat(nav): five-icon rail with two pillars, hairline and nested groups
     refactor(nav): redirect fifteen retired routes, delete dead nav code
     docs: record the two-pillar rail in the design spec and roadmap
W3   feat(chat): starter questions in the blank state
     feat(home): widget registry; "Needs you today" leads the page
     feat(home): arrivals, departures, VIP, inbox pulse and sync health widgets
     feat(brief): "since the brief" block; history moves to its own route   (optional)
W4   feat(home): per-user dashboard layouts with role defaults (migration 0022)
     feat(home): customize panel with drag reorder and locked roadmap tiles
W5   feat(arrivals): rename check-ins to arrivals & departures, two tabs
W6   feat(communications): in-house and upcoming windows; StayPhase widened to four
     feat(communications): queue framing — needs you, waiting, done today     (optional)
W8   feat(reputation): reviews table, Google reviews sync, theme classifier (migration 0025)
     feat(reputation): score movement, themes and recent reviews
then feat(communications): guest context pane at xl
     feat(chat): persistent threads, thread list, continue-in-chat handoff (migration 0023)
     feat(guests): guest list and record with inferred tags and protected notes (migration 0024)
     feat(chat): specific source chips per answer
     feat(trust): provenance chips on brief sections and draft replies
     feat(dashboard): command palette — pages, guests, ask
     chore(dashboard): post-IA sweep — links, audit, loading states, docs
```

**If you only ship three** (proposal §10): Prompts 1–3 and 6. That is the IA
change plus a Home that leads with what needs you, and none of it needs a
migration.
