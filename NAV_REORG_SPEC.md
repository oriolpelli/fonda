# Fondas — Navigation Reorganization Spec

**Status:** Draft for go-to-market IA
**Owner:** Oriol
**Applies to:** `app/[lang]/dashboard/*`, `components/dashboard/sidebar.tsx`, `lib/roadmap.ts`, `dictionaries/{en,es,ca}.json`
**Companion doc:** `NAV_REORG_PROMPTS.md` (the Claude Code build prompts that implement this)

---

## 1. Why

Before launch we want the app to read as a *platform*, not a handful of pages.
Grouping today's live surfaces under clear section headers — and standing up
the future sections as tasteful "Coming soon" stubs — does two things at once:

1. **Easier to use.** A GM sees at most eight things in the rail, and drills into
   a section only when they need it.
2. **Sells the roadmap.** The sidebar becomes a sneak peek of where Fondas is
   going (Revenue AI, Operations, Finance, Oversight) without pretending those
   features already exist.

Nothing that works today stops working. This is an information-architecture
change plus a batch of inert stub pages — not a rewrite of any live feature.

---

## 2. The pattern: icon rail + submenu panel

We keep the current **slim 64px monochrome icon rail** (per `FONDA_SANA_REDESIGN.md`
§5 — colorless chrome, active state by darkness not hue). We add a **second
level**: clicking a section icon that has children opens a **submenu panel** —
a labeled column (~220px) docked to the right of the rail — listing that
section's sub-pages. This is the Gmail / Linear two-pane model.

Behaviour:

- **Level 1 (the rail):** the 8 sections as icons, top to bottom. Settings +
  account stay pinned at the foot, exactly as today.
- **A section with children** (Front Desk, Revenue, Operations, Finance,
  Oversight): clicking its icon **opens/pins the submenu panel**. The section
  icon stays lit while you're anywhere inside it. The panel highlights the
  active sub-page.
- **A section that is a direct link** (Dashboard): clicking it just navigates —
  no panel.
- **A section that's coming soon with no children** (Sales & Marketing):
  clicking navigates to its own `ComingSoon` page. No panel.
- **Hover** may preview the panel; **click** pins it. Pressing `Esc` or choosing
  another section dismisses it. Fully keyboard-navigable (same focus discipline
  as the existing mobile drawer).
- **Mobile:** the existing slide-over drawer becomes a set of **collapsible
  groups** (accordion) — section header, then its children indented beneath.

Design note: this is an *extension* of the Signal rail, not a departure —
monochrome, 10px radius, ink flyout labels. The submenu panel reuses the same
tokens. Where this spec and `FONDA_SANA_REDESIGN.md` differ on the rail being
single-level, **this spec supersedes it for navigation** and the redesign doc
should get a one-paragraph amendment (noted in the prompts).

---

## 3. The tree

Legend: **● Live** (works today) · **○ Coming soon** (inert stub) · **→** route

```
● Dashboard                         → /dashboard
    (main dashboard + a compact "Morning Brief" summary card
     that links through to Front Desk › Morning Brief)

▸ Front Desk                        → section (opens submenu panel)
    ○ Dashboard                      → /dashboard/front-desk
    ○ Front Desk Information         → /dashboard/front-desk/information
    ● Morning Brief                  → /dashboard/brief        (existing, moves under here in nav)
    ● Check-in                       → /dashboard/checkins     (existing)
    ● Communication                  → /dashboard/communications (existing · inbox badge)
    ○ Concierge                      → /dashboard/concierge    (existing stub, back in nav here)
    ○ Reputation Analysis            → /dashboard/front-desk/reputation

▸ Revenue                           → section (opens submenu panel)
    ○ Dashboard                      → /dashboard/revenue
    ○ Revenue Management             → /dashboard/revenue/management
    ○ Demand Forecasting             → /dashboard/revenue/forecasting
    ○ OTA Parity                     → /dashboard/revenue/parity
    ○ Upsell AI                      → /dashboard/revenue/upsell
    ○ Room Upgrade AI                → /dashboard/revenue/upgrades

▸ Sales & Marketing                 → /dashboard/sales-marketing   (section-level Coming soon, no submenus)

▸ Operations                        → section (opens submenu panel)
    ○ Dashboard                      → /dashboard/operations
    ○ Staff                          → /dashboard/operations/staff
    ○ Housekeeping / Maintenance     → /dashboard/operations/housekeeping
    ○ F&B                            → /dashboard/operations/fnb
    ○ Procurement / Supply           → /dashboard/operations/procurement

▸ Finance                           → section (opens submenu panel)
    ○ Dashboard                      → /dashboard/finance
    ○ Reporting / Audit              → /dashboard/finance/reporting
    ○ Chargeback                     → /dashboard/finance/chargeback

▸ Oversight / Management            → section (opens submenu panel)
    ○ Dashboard                      → /dashboard/oversight
    ○ AI Management                  → /dashboard/oversight/ai
    ○ Team Activity                  → /dashboard/oversight/team
        (preview of what other Fondas users — receptionist, back office —
         are doing and the work they're handling)

⚙ Settings & Account                → /dashboard/settings   (existing · pinned at foot with account menu)
```

---

## 4. What moves where (from today)

Today the rail is flat: Dashboard · Morning Brief · Check-ins · Communications ·
(Analytics, Chat via roadmap) · Settings. Here's every current surface and its
new home. **Phase 1 keeps live routes at their current URLs** and only re-groups
them in the nav — zero risk of broken links. (Optional Phase 2 harmonizes URLs;
see §7.)

| Today | New location | Route (Phase 1) | Status |
|---|---|---|---|
| Dashboard (`/dashboard`) | **Dashboard** (top level) | `/dashboard` | ● Live — gains summary card |
| Morning Brief (`/dashboard/brief`) | **Front Desk › Morning Brief** | `/dashboard/brief` | ● Live |
| Check-ins (`/dashboard/checkins`) | **Front Desk › Check-in** | `/dashboard/checkins` | ● Live |
| Communications (`/dashboard/communications`) | **Front Desk › Communication** | `/dashboard/communications` | ● Live (badge) |
| Concierge (`/dashboard/concierge`) | **Front Desk › Concierge** | `/dashboard/concierge` | ○ Coming soon (back in nav) |
| Analytics (`/dashboard/analytics`) | **Revenue › Dashboard** (repurpose) | `/dashboard/revenue` | ○ Coming soon — see §6 |
| Chat (`/dashboard/chat`) | Stays the global "Ask your hotel" assistant | `/dashboard/chat` | ● Live — see §6 |
| Settings (`/dashboard/settings`) | **Settings & Account** | `/dashboard/settings` | ● Live |
| Admin (`/dashboard/admin`) | already redirects to Settings › Connections | — | unchanged |

Everything else in §3 marked ○ is a **new stub page** rendered by the existing
`ComingSoon` component.

---

## 5. Copy (English canonical)

Section + sub-page labels and one-line blurbs. Blurbs say what a GM will *get*,
never "coming soon" twice (matching the tone already in `lib/roadmap.ts`).
Claude Code translates each to `es` and `ca` to match the existing dictionary
voice.

**Sections**

| Key | Label | Note |
|---|---|---|
| `dashboard` | Dashboard | live |
| `front-desk` | Front Desk | section |
| `revenue` | Revenue | section |
| `sales-marketing` | Sales & Marketing | section, coming soon |
| `operations` | Operations | section |
| `finance` | Finance | section |
| `oversight` | Oversight | section |
| `settings` | Settings | live |

**Front Desk**

| Key | Label | Blurb (coming-soon pages only) |
|---|---|---|
| `front-desk` (dash) | Dashboard | The whole front desk at a glance — arrivals, messages waiting, and anything that needs a human, in one view. |
| `front-desk-info` | Front Desk Information | House facts, policies and shift notes in one place, so anyone on the desk answers the same way. |
| `brief` | Morning Brief | *(live)* |
| `checkins` | Check-in | *(live)* |
| `communications` | Communication | *(live)* |
| `concierge` | Concierge | Messaging for in-house guests, WhatsApp included. Until then, guest email lives in Communication. |
| `reputation` | Reputation Analysis | Reviews across Booking, Google and TripAdvisor read and themed for you, so you see what's moving your score. |

**Revenue**

| Key | Label | Blurb |
|---|---|---|
| `revenue` (dash) | Dashboard | Rate, occupancy and pickup in one place — the numbers behind every pricing call. |
| `revenue-management` | Revenue Management | A recommended rate for every day, built from your pace, your comp set and the calendar. |
| `demand-forecasting` | Demand Forecasting | Where demand is heading by date, so you price ahead of it instead of chasing it. |
| `ota-parity` | OTA Parity | Every channel watched for rate and availability drift, with the mismatches flagged the day they appear. |
| `upsell-ai` | Upsell AI | The right offer to the right guest before arrival — early check-in, a better view, a table booked. |
| `room-upgrade-ai` | Room Upgrade AI | Empty better rooms turned into paid upgrades automatically, priced to what each guest will pay. |

**Sales & Marketing**

| Key | Label | Blurb |
|---|---|---|
| `sales-marketing` | Sales & Marketing | Direct-booking campaigns, guest segments and channel spend — coming to Fondas. |

**Operations**

| Key | Label | Blurb |
|---|---|---|
| `operations` (dash) | Dashboard | Today's operation on one screen — who's on, what's open, and what's blocking a clean handover. |
| `staff` | Staff | Rotas, shifts and coverage, with the gaps surfaced before they become a short-staffed morning. |
| `housekeeping` | Housekeeping / Maintenance | Room status and work orders in real time, so the desk always knows what's ready to sell. |
| `fnb` | F&B | Covers, stock and outlet performance next to the rooms business they feed. |
| `procurement` | Procurement / Supply | Orders, suppliers and par levels tracked, so you reorder before you run out, not after. |

**Finance**

| Key | Label | Blurb |
|---|---|---|
| `finance` (dash) | Dashboard | Revenue, cost and cash in one view — the property's P&L without the spreadsheet. |
| `finance-reporting` | Reporting / Audit | Night-audit and month-end reports generated and reconciled, ready to hand to your accountant. |
| `chargeback` | Chargeback | Disputes caught early and packaged with the evidence to fight them, so you win more of them. |

**Oversight / Management**

| Key | Label | Blurb |
|---|---|---|
| `oversight` (dash) | Dashboard | The owner's view across every property and every Fondas surface, in one place. |
| `ai-management` | AI Management | See and steer what Fondas' AI is doing on your behalf — what it drafted, sent and decided. |
| `team-activity` | Team Activity | What each seat — reception, back office — is handling right now, and how much Fondas is taking off their plate. |

---

## 6. Decisions to confirm (sensible defaults chosen)

1. **Analytics → Revenue dashboard.** The existing `/dashboard/analytics`
   coming-soon page is superseded by the Revenue section. Default: repurpose it
   as **Revenue › Dashboard** (keep the route working, drop the standalone
   Analytics rail item). Alternative: retire it and 301 to `/dashboard/revenue`.
2. **Chat stays global.** "Ask your hotel" is a cross-cutting assistant (docked
   bar on every page + `/dashboard/chat`). Default: it is **not** one of the
   eight sections; it keeps its docked bar and existing route. Optionally keep a
   single Chat icon at the foot of the rail near Settings.
3. **Section "Dashboard" sub-pages** start as coming-soon stubs. As each section
   ships, its Dashboard becomes the real section overview.
4. **Ordering inside Front Desk.** Morning Brief is placed high (flagship). If
   you'd rather it sit after Check-in, it's a one-line reorder.

---

## 7. Phase 2 (optional, later): URL harmonization

Once the grouped nav is in and comfortable, migrate the four live routes into
nested paths so URLs match the IA, keeping old URLs alive with redirects (the
same pattern `app/[lang]/dashboard/admin/page.tsx` already uses):

| From | To |
|---|---|
| `/dashboard/brief` | `/dashboard/front-desk/brief` |
| `/dashboard/checkins` | `/dashboard/front-desk/check-in` |
| `/dashboard/communications` | `/dashboard/front-desk/communication` |
| `/dashboard/concierge` | `/dashboard/front-desk/concierge` |

Not required for launch. Do it only if clean URLs matter for demos or SEO.

---

## 8. Files this touches

- `components/dashboard/sidebar.tsx` — two-level rail + submenu panel + mobile accordion.
- `app/[lang]/dashboard/layout.tsx` — build the grouped nav tree.
- `lib/roadmap.ts` — one row per new coming-soon sub-page/section (~21 rows).
- `dictionaries/{en,es,ca}.json` — `sidebar.*` labels + `roadmap.blurb.*` for each.
- `app/[lang]/dashboard/**/page.tsx` — new stub pages (each ~15 lines, copy `analytics/page.tsx`).
- `components/dashboard/coming-soon.tsx` / `empty-state.tsx` — optionally add icon keys (falls back to `upcoming` if omitted).
- `app/[lang]/dashboard/page.tsx` — the summary card linking to the brief.
- `FONDA_SANA_REDESIGN.md` — one-paragraph amendment noting the two-level rail.

---

## 9. Submenu panel — Sana-grade visual spec (design polish)

Added after seeing Prompt 2 on localhost: the structure is right but the panel
reads a touch **AI-ish**. Diagnosed against the Sana DNA (`FONDA_SANA_REDESIGN.md`
§1–§2) and fresh Mobbin references, the tell is the panel itself — a **white
floating card with a drop shadow and no header** (`bg-[--fonda-surface] +
shadow-card + border-r`, sidebar.tsx ~L467). That's a detached popover, not
integrated nav.

**What the crafted benchmark set actually does** (Mobbin, web):
- Sana AI — a quiet labeled column, muted section eyebrows ("Folders", "Today"),
  borderless rows, a subtle warm rounded active state, pinned bottom zone.
  https://mobbin.com/screens/114e7c2a-a3fa-476d-bafd-dea29a313abe ·
  https://mobbin.com/screens/fbfef6f6-d5a1-46f8-bf3e-7ecb09394a30
- Superlist — nested, expandable groups, warm and minimal.
  https://mobbin.com/screens/a7c5774f-9db6-4a6d-8ddb-1d08a7105c2e
- Grok — uppercase muted section headers (EXPLORE / API / MANAGE), thin icons.
  https://mobbin.com/screens/a07b68c7-61f4-4220-85ef-cb790a39b3d9
- Linear — quiet grouped sidebar.
  https://mobbin.com/screens/815793b1-5c75-43ac-94c7-93380781e337
- Strut — slim rail + labeled second column (our exact pattern).
  https://mobbin.com/screens/2839e471-23c7-4ebe-bfed-0924401683f2

**The through-line:** a second-level nav column should feel like a quiet
extension of the ground, not a menu that floated in. Four moves get us there.

### 9.1 The panel is part of the ground — no shadow, no white card
- Fill `--fonda-bg` (`#eeeeee`, the same ground as the rail), NOT
  `--fonda-surface` (white). The rail + panel then read as one continuous quiet
  nav zone (the Strut / GitBook two-column feel), warm and integrated.
- **Remove `shadow-card`.** A full-height nav column does not float. At most a
  single `1px` `--fonda-border` on the right edge for definition; tonal step does
  the rest. This one change removes most of the AI-ish read.

### 9.2 A muted section eyebrow at the top
- The panel opens with the section's name as a quiet eyebrow — the same treatment
  as the `ComingSoon` eyebrow and Grok's headers: `font-mono text-[11px]
  font-medium uppercase tracking-[0.14em] text-[--fonda-text-3]`, with padding
  that aligns its baseline near the rail's first icon. This grounds the panel so
  it never reads as a context-less popover.

### 9.3 Rows reuse the rail's exact monochrome ladder
- On the `#eeeeee` panel: rest = `--fonda-text-2`; hover =
  `bg-[--fonda-surface-2]` (`#f6f3ee`, a warm lift) + `text-foreground`; active =
  `bg-[--fonda-inset]` (`#e4e0d7`) + `text-foreground`, weight `font-medium`
  (let the fill, not bold, carry it — Sana's active is subtle). Thin icons,
  `strokeWidth={1.5}`, 18px. Radius `10px`. Coming-soon rows keep the quiet mono
  chip. Give rows a hair more vertical rhythm than a dense menu (≈`py-[9px]`).

### 9.4 Gentle motion (Sana: "motion is subtle")
- The panel currently hard-toggles `hidden`/`flex` — it snaps. Keep it mounted
  (use `inert` + `aria-hidden` when closed, like the drawer already does) and
  animate in: `opacity 0→1` + `translate-x -4px→0`, `~160ms ease-out`. No bounce,
  no colour shift. `prefers-reduced-motion` already collapses this via globals.

Apply the same eyebrow + ladder to the **mobile drawer group headers** so the two
surfaces read as one system.

### 9.5 Bigger option (only if you want to go all-in on Sana)
Sana's real product is a single *labeled* sidebar, not an icon rail. If you'd
rather match that exactly, the alternative is to drop the icon rail and render one
~240px labeled sidebar with expandable grouped sections (the Superlist / Grok
model). It's the most literal Sana match but discards the distinctive slim rail
your whole redesign is built around, so the default here keeps the rail and makes
the panel Sana-grade (§9.1–9.4). Say the word and I'll rewrite Prompt 2 for the
full labeled sidebar instead.

### 9.6 Confirmed reference: Customer.io (keep the rail, match their panel)

Decision (Oriol): keep the small icons we have now (the rail); when a section is
clicked, the submenu panel should look like **Customer.io's sidebar**; and
coming-soon sections get a small marker ("a small logo or something"). So §9.5's
"bigger option" is off — we keep the rail and make the panel Customer.io-grade.

What Customer.io actually does (Mobbin, web):
- https://mobbin.com/screens/0596b84f-f48a-4e08-86df-052f7333ff9d (People)
- https://mobbin.com/screens/76ff26b7-4558-4f17-8ba1-8ea730434561 (Segments)
- https://mobbin.com/screens/9961305a-c801-43f8-8917-1f2ce43923a2 (Campaigns)

A quiet labeled column: a muted section eyebrow, then rows that are **small thin
icon + label**, comfortable rhythm, a **subtle rounded fill** on the active row,
no shadow, no hard border — it belongs to the ground. (Their active icon is
tinted their brand green; we keep Fonda **monochrome** — adopt the *form*, not the
hue.)

**The three deltas from our current panel** (`RailSection` in sidebar.tsx):
1. **Per-row icons.** `PanelLink` is text-only today (a deliberate omission).
   Customer.io's craft is largely those small row icons — add one per child,
   ~16px, `strokeWidth={1.5}`, looked up by the child's `key` from an extended
   `ICONS` map. Suggested keys (swap freely):

   | Child key | Icon | Child key | Icon |
   |---|---|---|---|
   | front-desk / revenue / operations / finance / oversight (the "Dashboard" child) | LayoutDashboard | ota-parity | Scale |
   | front-desk-info | Info | upsell-ai | Sparkles |
   | brief | Sunrise | room-upgrade-ai | BedDouble |
   | checkins | DoorOpen | staff | Users |
   | communications | Send | housekeeping | SprayCan |
   | concierge | Bell | fnb | Utensils |
   | reputation | Star | procurement | Package |
   | revenue-management | LineChart | finance-reporting | FileText |
   | demand-forecasting | Activity | chargeback | CreditCard |
   | | | ai-management | Bot |
   | | | team-activity | UserCog |

2. **Panel is a light column, not a floating card.** Change the `<nav>` fill from
   `bg-[--fonda-surface]` (white) to `bg-[--fonda-bg]` (`#eeeeee`, continuous with
   the rail); **drop `shadow-card`**; keep at most the 1px `--fonda-border` right
   edge. Add the gentle open motion from §9.4 (opacity + 4px slide, ~160ms).
   Soften the active row from `font-semibold` to `font-medium` — the inset fill
   carries it (Customer.io's active isn't bold).

3. **Coming-soon marker ("a small logo").** Replace the trailing text chip on
   coming-soon rows with a small quiet glyph — default a `Sparkles` at 14px in
   `--fonda-text-3` (reads "future feature", stays monochrome), with "Coming
   soon" kept as the `aria-label`/`title`. On the rail, upgrade the tiny
   `SoonDot` on coming-soon section icons to the same small corner glyph so the
   marker is consistent rail-and-panel. Easy swaps if you prefer: a `Lock`
   (reads "not yet"), or keep a compact mono "SOON" tag.

Net effect: the rail is unchanged; the panel gains icons, loses its shadow/white
card, animates in gently, and marks the future sections with a small consistent
glyph — the Customer.io feel, in Fonda's monochrome.
