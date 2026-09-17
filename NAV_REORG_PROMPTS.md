# Fondas — Navigation Reorganization: Claude Code Prompts

Build prompts that implement `NAV_REORG_SPEC.md`. Run them **in order**, one at a
time, in a fresh Claude Code session inside the repo. Each ends with a lint/build
gate so a mistake surfaces before the next step.

## How to use

- Paste one prompt, let it finish, review the diff, then move on.
- After each prompt Claude Code should run `npm run lint` and fix what it reports
  (per `CLAUDE.md`). The last prompt runs a full `npm run build` + click-through.
- Commit after each green step (small, reversible commits).
- These prompts assume **Phase 1**: live routes stay at their current URLs and
  are only re-grouped. Prompt 6 (URL harmonization) is optional and can wait.

## Guardrails to repeat to Claude Code (in `CLAUDE.md` already, but reinforce)

- Follow `FONDA_SANA_REDESIGN.md` for anything visual — monochrome rail, 10px
  radius, active-by-darkness, no hue in chrome. The submenu panel uses the same
  `--fonda-*` tokens.
- Data-driven nav only. Icons are looked up by `key` in the client component;
  never pass component functions from the server layout.
- Copy lives in `dictionaries/{en,es,ca}.json` — all three languages, always.
- Coming-soon surfaces render the existing `ComingSoon` component; don't invent
  a new empty state.
- React Server Components by default; `"use client"` only where there's
  interactivity (the sidebar is already a client component).

---

## Prompt 1 — Nav data model, roadmap rows, and dictionaries

```
Read NAV_REORG_SPEC.md, CLAUDE.md, lib/roadmap.ts, app/[lang]/dashboard/layout.tsx,
and components/dashboard/sidebar.tsx before changing anything.

We're moving the dashboard sidebar from a flat list to a two-level structure:
8 top-level sections, each either a direct link, a "coming soon" section with no
children, or a section that owns a submenu of sub-pages. Implement ONLY the data
layer in this step — no visual/component changes yet.

1. Extend the nav types in components/dashboard/sidebar.tsx:
   - Add an optional `children?: NavItem[]` to `NavItem` (a section owns sub-items).
   - Add an optional `sectionKey?: string` if helpful for active-state grouping.
   - Keep `badge`, `comingSoon`, `comingSoonLabel` working on any level.
   Do not change rendering yet; just widen the type so it compiles.

2. In lib/roadmap.ts, add one row per NEW coming-soon surface from the spec's
   section tree (§3) and copy table (§5). Reuse the existing row shape
   (key, route, status:"coming-soon", inNav, label, blurb accessors). Set
   inNav:false on these new rows — the grouped tree is built in the layout now,
   not by roadmapNavFeatures(); we only want roadmap.ts as the source of truth
   for label + blurb + coming-soon status per key. Add rows for:

   front-desk, front-desk-info, reputation,
   revenue, revenue-management, demand-forecasting, ota-parity, upsell-ai, room-upgrade-ai,
   sales-marketing,
   operations, staff, housekeeping, fnb, procurement,
   finance, finance-reporting, chargeback,
   oversight, ai-management, team-activity

   Use the routes exactly as in the spec §3. Bring `concierge` back with
   inNav:false too (it already exists). Repurpose `analytics`: point its label
   at Revenue's dashboard OR leave analytics as-is and add a separate `revenue`
   row — follow spec §6 decision 1 (default: revenue dashboard supersedes
   analytics; keep the analytics route resolving but drop it from the tree).

3. In dictionaries/en.json, es.json, ca.json add, for every key above:
   - sidebar.<camelOrKey> label (match the spec's English labels; translate es/ca
     to match the existing dictionary voice — concise, GM-facing, no marketing fluff).
   - roadmap.blurb.<key> one-liner (translate the spec's English blurb per §5).
   Keep the three dictionaries structurally identical (same keys, same order).

4. Build the grouped nav tree in app/[lang]/dashboard/layout.tsx: replace the
   flat `navItems` with the 8-section tree from spec §3. Live children keep their
   existing hrefs (/dashboard/brief, /dashboard/checkins, /dashboard/communications,
   /dashboard/concierge). The Communication child keeps the inbox badge. Sections
   with children get `children: [...]`; Sales & Marketing is a single coming-soon
   item with an href and no children; Dashboard stays a direct link. Keep
   settingsItem exactly as it is.

Run `npm run lint` and `npx tsc --noEmit` (or `npm run build` if quicker) and fix
everything. Do NOT touch sidebar rendering, pages, or the dashboard summary card
in this step. Show me the final diff.
```

**Addendum (optional, cosmetic — decided after Prompt 1):** §5 renames the two
live labels to the singular form used in the grouped IA. Rename the label
*values* only (keys stay `checkins` / `communications`, so nothing else breaks —
they're referenced only in the layout): en `Check-ins → Check-in`,
`Communications → Communication`; make `es`/`ca` singular to match (e.g.
`Comunicaciones → Comunicación`). Skip if you'd rather keep the plurals.

---

## Prompt 2 — Sidebar: icon rail + submenu panel + mobile accordion

```
Read NAV_REORG_SPEC.md §2, FONDA_SANA_REDESIGN.md §5, and the current
components/dashboard/sidebar.tsx before editing.

Implement the two-level navigation described in the spec. Keep the exact visual
language of the current rail (monochrome, --fonda-* tokens, 10px radius,
active-by-darkness, ink flyout labels, existing focus-trap/Esc/scroll-lock
discipline). This is an extension of the rail, not a redesign.

Desktop (>= md):
- The 64px rail shows one icon per top-level section, plus Settings + Account
  pinned at the foot (unchanged).
- Add icons to the ICONS map for the new section keys. Suggested lucide-react
  icons (swap freely): dashboard=LayoutDashboard, front-desk=ConciergeBell,
  revenue=TrendingUp, sales-marketing=Megaphone, operations=Wrench,
  finance=Wallet, oversight=Eye, settings=Settings.
- Clicking a section that HAS children opens a pinned "submenu panel": a ~220px
  labeled column docked immediately to the right of the rail, listing that
  section's children (label rows, active row lit, coming-soon rows carry the
  quiet mono "Coming soon" chip exactly like DrawerLink does today). The section
  icon stays lit while the current route is inside that section. The section icon
  itself does NOT navigate — its own page (e.g. /dashboard/revenue) is reached
  via its "Dashboard" child. Note: Revenue / Operations / Finance / Oversight are
  entirely coming-soon and carry `comingSoon: true` on the section object, so
  their rail icons should still show the quiet coming-soon dot; Front Desk does
  not (it has live children).
- Clicking a section that is a direct link (Dashboard) just navigates, no panel.
- Clicking a coming-soon section with no children (Sales & Marketing) navigates
  to its ComingSoon route, no panel.
- Hover on a section may open the panel as a preview; click pins it. Esc closes
  it and returns focus to the section icon; choosing another section switches it;
  an outside click dismisses it. Reuse the open-for-one-route / focus patterns
  already in this file (AccountMenu and the drawer are good references).
- Keep the flyout hover label for sections too, so an unpinned rail still names
  each icon.

Mobile (< md):
- The slide-over drawer becomes grouped: each section renders as a header row;
  sections with children render their children indented beneath (a simple
  accordion — tapping the header expands/collapses; the group containing the
  active route starts expanded). Direct-link and coming-soon-only sections render
  as a single row like today. Preserve the existing dialog/focus-trap/inert
  behaviour and the "close on navigate" logic.

Active state:
- A section is active when the current route equals its href, starts with any
  child href, OR a child's `sectionKey` names it. This last case is load-bearing:
  the four live Front Desk children sit at Phase 1 URLs (/dashboard/brief,
  /dashboard/checkins, /dashboard/communications, /dashboard/concierge) that do
  NOT start with /dashboard/front-desk, so without honoring `sectionKey` the
  Front Desk icon goes dark the moment you open the Morning Brief. Extend the
  isActive helper to walk children hrefs and to map the current route back to a
  section via `sectionKey`.
- Within the panel/accordion, the exact child is marked aria-current="page".

Accessibility:
- The submenu panel is a disclosure, not an ARIA menu (same reasoning as the
  existing AccountMenu): aria-expanded + aria-controls on the section trigger,
  panel labelled by the section name, Esc + outside-click dismiss.
- Every interactive element keeps a visible focus ring (the shared
  :focus-visible rule).

Do not change routes or pages here. Run `npm run lint`, fix all issues, and show
me the diff. Then tell me exactly how to click through it in `npm run dev`.
```

---

## Prompt 3 — New coming-soon pages (stubs)

```
Read app/[lang]/dashboard/analytics/page.tsx (the canonical coming-soon page),
components/dashboard/coming-soon.tsx, and lib/roadmap.ts.

Create a page.tsx for every NEW coming-soon route in NAV_REORG_SPEC.md §3 that
doesn't already have one. Each page is ~15 lines: copy analytics/page.tsx, set
generateMetadata's title to the right dict label, and render
<ComingSoon featureKey="<key>" dict={dict} />. Routes to create:

  app/[lang]/dashboard/front-desk/page.tsx                (key: front-desk)
  app/[lang]/dashboard/front-desk/information/page.tsx    (key: front-desk-info)
  app/[lang]/dashboard/front-desk/reputation/page.tsx     (key: reputation)
  app/[lang]/dashboard/revenue/page.tsx                   (key: revenue)
  app/[lang]/dashboard/revenue/management/page.tsx        (key: revenue-management)
  app/[lang]/dashboard/revenue/forecasting/page.tsx       (key: demand-forecasting)
  app/[lang]/dashboard/revenue/parity/page.tsx            (key: ota-parity)
  app/[lang]/dashboard/revenue/upsell/page.tsx            (key: upsell-ai)
  app/[lang]/dashboard/revenue/upgrades/page.tsx          (key: room-upgrade-ai)
  app/[lang]/dashboard/sales-marketing/page.tsx           (key: sales-marketing)
  app/[lang]/dashboard/operations/page.tsx                (key: operations)
  app/[lang]/dashboard/operations/staff/page.tsx          (key: staff)
  app/[lang]/dashboard/operations/housekeeping/page.tsx   (key: housekeeping)
  app/[lang]/dashboard/operations/fnb/page.tsx            (key: fnb)
  app/[lang]/dashboard/operations/procurement/page.tsx    (key: procurement)
  app/[lang]/dashboard/finance/page.tsx                   (key: finance)
  app/[lang]/dashboard/finance/reporting/page.tsx         (key: finance-reporting)
  app/[lang]/dashboard/finance/chargeback/page.tsx        (key: chargeback)
  app/[lang]/dashboard/oversight/page.tsx                 (key: oversight)
  app/[lang]/dashboard/oversight/ai/page.tsx              (key: ai-management)
  app/[lang]/dashboard/oversight/team/page.tsx            (key: team-activity)

Notes:
- The RoadmapKey union must include every key above (it should already after
  Prompt 1) so featureKey type-checks.
- Optionally add EmptyState icon keys for a few marquee ones (reputation,
  revenue, upsell-ai, staff, chargeback, ai-management). If you skip it, the
  ComingSoon component already falls back to the generic "upcoming" icon — that's
  fine, don't force it.
- Concierge already has a page; leave it.

Run `npm run lint` and `npm run build`. Every new route must compile and render
the ComingSoon state. Show me the diff and confirm the build passed.
```

---

## Prompt 4 — Dashboard summary card → Morning Brief

```
Read app/[lang]/dashboard/page.tsx (the main dashboard) and
app/[lang]/dashboard/brief/page.tsx (the Morning Brief), plus how the brief data
is loaded (lib/inbox, the briefing api, whatever the brief page uses).

On the main Dashboard, add a compact "Morning Brief" summary card near the top: a
short résumé of the biggest things (e.g. today's arrivals count, messages
waiting, and the single most important line from the brief) — reuse the brief's
existing data source, don't duplicate logic or invent numbers. The whole card is
a link to /dashboard/brief (localized via localizedHref), so clicking it opens the
full Morning Brief under Front Desk. If there's no PMS connected or no brief yet,
show the same quiet empty treatment the app already uses — never fake data.

Style it per FONDA_SANA_REDESIGN.md (white card on the greige ground, one accent
only if the design system already uses one for this kind of highlight). Add the
card's label/strings to all three dictionaries.

Keep it small — this is a teaser that drives into the brief, not a second copy of
the brief. Run `npm run lint`, fix issues, show me the diff, and tell me how to
see it in dev.
```

---

## Prompt 5 — Redesign-doc amendment + roadmap note

```
Add a short amendment to FONDA_SANA_REDESIGN.md §5 (the rail section) noting that
the rail is now two-level: a slim icon rail of sections plus a docked submenu
panel for sections that own sub-pages, monochrome and using the same tokens.
One paragraph, in the doc's existing voice. Also update the "How to add a future
roadmap feature" comment block in lib/roadmap.ts if the grouped structure changed
how a new feature gets wired in (which section's children array it joins). No app
code changes in this step.
```

---

## Prompt 6 — (Optional, later) URL harmonization

```
Only do this if we've decided to clean up URLs (NAV_REORG_SPEC.md §7). Move the
four live Front Desk routes to nested paths and keep the old URLs working with
redirects, exactly like app/[lang]/dashboard/admin/page.tsx already does:

  /dashboard/brief          -> /dashboard/front-desk/brief
  /dashboard/checkins       -> /dashboard/front-desk/check-in
  /dashboard/communications -> /dashboard/front-desk/communication
  /dashboard/concierge      -> /dashboard/front-desk/concierge

For each: move the page (and its co-located actions.ts / components) to the new
path, update all internal links (localizedHref call sites, the nav tree in the
layout, any redirects in onboarding/proxy), and leave a redirecting stub at the
old path so bookmarks don't 404. Update the isActive logic and the nav hrefs to
the new routes. Run `npm run lint` and `npm run build`, then grep the repo for the
old paths to prove nothing still points at them. Show me the diff.
```

---

## Prompt 7 — Verification pass

```
Do a full verification of the navigation reorg:

1. `npm run lint` — clean.
2. `npm run build` — succeeds, no route errors.
3. Start `npm run dev` and click every section: Dashboard navigates directly;
   Front Desk / Revenue / Operations / Finance / Oversight each open their submenu
   panel with the right children; Sales & Marketing shows its section-level Coming
   soon; every coming-soon child renders the ComingSoon state; live pages
   (Morning Brief, Check-in, Communication) still work and the Communication badge
   still shows; the Dashboard summary card links into the brief.
4. Confirm the three dictionaries have identical key sets (no missing es/ca
   labels or blurbs) — a quick script comparing key paths across en/es/ca is fine.
5. Mobile width: the drawer groups expand/collapse, the active group starts open,
   focus trap + Esc still work.
6. Accessibility: keyboard-only pass through the rail, panel, and drawer; visible
   focus throughout; aria-current on the active child; the submenu panel's
   aria-expanded/aria-controls wired.

Report anything that fails with the file and line, and propose the fix before
applying it.
```

---

## Suggested commit sequence

1. `nav: widen NavItem to two levels + roadmap rows + dictionaries`
2. `nav: icon rail submenu panel + mobile accordion`
3. `nav: coming-soon stub pages for all new sections`
4. `dashboard: morning brief summary card`
5. `docs: note two-level rail in redesign spec`
6. *(optional)* `nav: harmonize front-desk URLs with redirects`
7. `nav: verification fixes`

---

## Prompt 2R — Customer.io-grade sidebar polish (design refinement)

Run this after Prompt 2. It fixes the "AI-ish" read by matching the submenu panel
to Customer.io's sidebar (our confirmed reference), in Fonda's monochrome. Read
NAV_REORG_SPEC.md §9 (esp. §9.6) and FONDA_SANA_REDESIGN.md §1–§2 first.

```
Read components/dashboard/sidebar.tsx (RailSection, PanelLink, rowStateClass,
SoonDot, SoonChip, the ICONS map) and NAV_REORG_SPEC.md §9. Reference screens for
the target look (open if useful):
  https://mobbin.com/screens/0596b84f-f48a-4e08-86df-052f7333ff9d
  https://mobbin.com/screens/76ff26b7-4558-4f17-8ba1-8ea730434561

Goal: the submenu panel should read like Customer.io's sidebar — a quiet labeled
column with a small icon on every row, a subtle rounded active fill, no shadow,
no floating white card — while staying monochrome (no hue in chrome, per
FONDA_SANA_REDESIGN.md). Keep the rail exactly as it is. Make these changes only:

1. Panel container (the <nav> in RailSection). Currently:
   "fixed inset-y-0 left-16 z-30 w-[220px] flex-col gap-1 overflow-y-auto
    border-r border-[var(--fonda-border)] bg-[var(--fonda-surface)] px-3 py-4 shadow-card"
   - Change bg-[var(--fonda-surface)] -> bg-[var(--fonda-bg)] (the panel is part
     of the ground, continuous with the rail).
   - Remove shadow-card. Keep the 1px border-r border-[var(--fonda-border)].
   - Keep the section eyebrow <p> as is (mono, uppercase, tracking, text-3).

2. Gentle open motion (FONDA_SANA_REDESIGN.md §1 "motion is subtle"). The panel
   currently hard-toggles hidden/flex. Keep it mounted so it can animate: instead
   of `hidden` + flex/hidden, render it always and toggle with `inert={!open}` +
   aria-hidden, opacity-0/opacity-100 and -translate-x-1/translate-x-0, with
   `transition-[opacity,transform] duration-150 ease-out` and pointer-events-none
   when closed. Match the a11y discipline the mobile drawer already uses (inert
   when closed keeps it out of the tab order and aria-controls valid). Do not
   regress the Escape / outside-click / focus-return behaviour.

3. Per-row icons in PanelLink (currently text-only). Add a small leading icon,
   size-[18px] strokeWidth={1.5}, looked up by the child's key from the ICONS
   map. Extend ICONS with the child keys per NAV_REORG_SPEC.md §9.6's table
   (front-desk-info=Info, brief=Sunrise, checkins=DoorOpen, communications=Send,
   concierge=Bell, reputation=Star, revenue-management=LineChart,
   demand-forecasting=Activity, ota-parity=Scale, upsell-ai=Sparkles,
   room-upgrade-ai=BedDouble, staff=Users, housekeeping=SprayCan, fnb=Utensils,
   procurement=Package, finance-reporting=FileText, chargeback=CreditCard,
   ai-management=Bot, team-activity=UserCog; each section's "Dashboard" child
   uses LayoutDashboard). Fall back to a neutral icon if a key is missing. Keep
   the icon muted at rest and inheriting the row's text color on hover/active.

4. Soften the active row: in rowStateClass, active goes from
   "bg-[var(--fonda-inset)] font-semibold text-foreground" to
   "bg-[var(--fonda-inset)] font-medium text-foreground" (the fill carries it).
   Give rows a touch more rhythm: px-3 py-2 -> px-2.5 py-[9px]. Icon+label gap-2.5.

5. Coming-soon marker ("a small logo"). Replace the trailing SoonChip text on
   coming-soon PanelLink rows with a small quiet glyph: a Sparkles icon,
   size-[14px], text-[var(--fonda-text-3)], ml-auto, with title/aria-label set to
   item.comingSoonLabel ("Coming soon") so it stays announced. On the rail, swap
   SoonDot on coming-soon section icons for the same small Sparkles marker in the
   top-right corner (same position SoonDot used), muted. Keep it monochrome. Do
   NOT show both a chip and a glyph — the glyph replaces the chip in the panel.
   (Leave the mobile drawer's SoonChip text as is — the drawer has room for it.)

Keep everything monochrome — no accent/green anywhere in the panel. Run
`npm run lint`, fix all issues, and tell me how to click through it in
`npm run dev` (open a section, confirm: light column not a floating card, row
icons present, active row subtly filled, coming-soon rows show the small glyph,
panel fades/slides in). Show me the diff.
```

Note: this is a pure visual refinement — no routes, data, or nav structure change.
If instead you decide to go all-in on Customer.io's *single labeled sidebar* (all
sections expanded with group eyebrows, no icon rail), that's the §9.5 rewrite —
say so and I'll write that prompt instead.

---

## Prompt 8 — Richer coming-soon pages (TH1-agent previews)

Turns each bare "Coming soon" page into a short preview of the real capability
behind it. Content is drafted in COMINGSOON_CONTENT.md (English canonical);
translate to es/ca in the existing dictionary voice.

```
Read COMINGSOON_CONTENT.md, components/dashboard/coming-soon.tsx,
components/dashboard/empty-state.tsx, lib/roadmap.ts, and how dictionaries are
structured (dictionaries/en.json roadmap.* keys).

Goal: the ComingSoon page should show, under the existing "Coming soon" eyebrow
and the feature name, a short lead sentence, 3–4 concrete "what it'll do" lines,
and a quiet "What's next" line — per COMINGSOON_CONTENT.md. Keep it honest and
inert: no fake numbers, no buttons that don't work, still clearly a preview.

1. Content model. In dictionaries/{en,es,ca}.json add, per feature key, a preview
   object — e.g. roadmap.preview.<key> = { lead: string, willDo: string[],
   next: string }. Use COMINGSOON_CONTENT.md for the English; the "Lead" maps to
   `lead` (and can replace the older one-line roadmap.blurb.<key> — either reuse
   blurb as lead or move to preview.lead, your call, but don't render both).
   Translate willDo lines and next to es/ca. Keep all three dictionaries
   structurally identical. Every key in COMINGSOON_CONTENT.md must be present.

2. ComingSoon component. Render: the mono "Coming soon" eyebrow (unchanged), the
   h1 feature name (unchanged), then the lead paragraph, then the willDo list,
   then the "What's next" line. Style per FONDA_SANA_REDESIGN.md — quiet,
   monochrome, generous whitespace, white card(s) floating on the grey ground,
   no accent (a preview is not data viz or a live metric, §3.2/§10). For the
   willDo list use a restrained marker consistent with the nav's coming-soon
   language — a small muted Sparkles or a hairline dot, not filled check bullets
   that imply "done". Label the last line "What's next" (localize it) in the mono
   eyebrow treatment, muted.

3. Keep the EmptyState icon usage OR fold it in tastefully — don't end up with a
   big centered empty-state icon AND a content block fighting each other. One
   composition: eyebrow + h1 + lead at the top, willDo as a short list, a hairline
   divider, then the muted "What's next" line. Use your judgment against the
   design spec; the point is it reads as a considered preview, not an error state.

4. Sales & Marketing has 4 willDo lines and no sub-pages — its section page
   (/dashboard/sales-marketing) carries the whole preview.

Run `npm run lint` and `npm run build`. Confirm every coming-soon route renders
lead + willDo + next with real localized copy in en/es/ca. Show me the diff and
tell me which routes to open in dev to spot-check (one per section is enough).
```

Content note: COMINGSOON_CONTENT.md is modelled on TH1.ai's 28-agent roster (the
product is openly inspired by it) but the wording is original and every page
stays under the "Coming soon" eyebrow — no feature is claimed as live.
