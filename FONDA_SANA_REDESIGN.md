# Fonda — Warm Redesign (v3 "Fonda × Sana")

> **Purpose.** This document takes the calm, warm, editorial look of Sana AI and
> adapts it to Fonda. It is written to be **pasted into Claude Code**, section by
> section, to make the actual changes. Every value is grounded in the current
> codebase (`app/globals.css`, `components/dashboard/sidebar.tsx`,
> `components/ui/*`, etc.).
>
> **Relationship to prior docs.** This is a deliberate evolution of
> `FONDA_DESIGN_IDENTITY.md` (v2 "Signal"). It **keeps**: Geist + Geist Mono,
> soft-cornered 10px controls (no pills), light-only, one-accent discipline,
> WCAG AA. It **changes**: the page ground goes from pure white to a **neutral
> light grey** `#EEEEEE`, with the surfaces, wells, borders and ink ramp on top
> of it deliberately **warm** (§3); the chrome goes **colorless** (navy leaves the UI and is reserved for
> content); the dashboard sidebar becomes a **slim icon rail**; the chat adopts
> Sana's **plain-assistant / bubbled-user** pattern; and a new **gradient content
> surface** layer is introduced for hero/feature/empty cards. Where this doc and
> v2 disagree, **this doc wins** for the app; both apply to marketing.
>
> **Scope (locked):** the **whole app** — product (dashboard, chat, settings,
> concierge/communications, check-ins, brief) **and** the marketing site, auth,
> onboarding.

---

## 0. The four locked decisions

These were decided up front; the whole document follows from them.

1. **Sidebar → slim icon rail.** ~64px, icon-only, monochrome thin icons, labels
   appear on hover (tooltip/flyout). Replaces today's 256px icon+label rail.
2. **Buttons → keep soft 10px corners.** We do **not** adopt Sana's black pills.
   Fonda's ink buttons stay soft-cornered. (Pills remain allowed for chips/badges
   only, exactly as in v2.)
3. **Color → same discipline as Sana: colorless chrome, color in content.** Navy
   comes **out** of nav, active states, and chips. Color lives only in content:
   gradient hero/feature cards and a single accent inside data viz.
4. **Whole-app scope.** Product + marketing move to the warm ground together.

---

## 1. What Sana actually does (the DNA)

Observed directly from the four reference videos. This is the target feel; §§4–13
translate each point into Fonda changes.

**Ground & surfaces.**
- The page is a **neutral light grey** — `#EEEEEE`, sampled directly from the
  reference video (RGB 238/238/238, no warmth on any channel). Not white, and
  not warm. Getting the page **off white** is ~half of "not-AI"; the page's
  temperature is not where the warmth belongs.
- **Warmth lives in the material, not the page.** Everything sitting *on* the
  grey is deliberately warm — wells, insets, borders, and the whole ink ramp
  (§3.1). A neutral page carrying warm material reads like paper and plaster.
  A warm page does not: an early draft of this doc specified a greige ground
  (`#EDEAE3`) and it read visibly sandy. That premise is retired; this one
  replaces it.
- Cards and panels are **lighter than the page** (white) and appear to **float**
  on the grey. Borders are barely there or absent — separation comes from the
  tonal step, not hairlines.
- Corners are generously soft (≈16–20px). Shadows are **whisper-soft or none** at
  rest.

**Chrome is quiet and colorless.**
- A **very slim left rail** (~56–64px): a solid black round mark at top, then a
  short stack of **monochrome, thin-stroke** icons, a settings gear pinned at the
  bottom. **No labels, no wordmark text, no colored active pill.** Active is a
  subtle darkening/solid-icon, never a saturated tint.
- Almost no color in the frame. Buttons are near-black; text is near-black;
  everything else is grey, warm neutral, and white.

**Color is a content material, not a UI accent.**
- Featured/hero cards use **rich gradients** — a warm sunrise (amber → coral) and
  a cool one (teal → blue → indigo). White text on top.
- Data viz uses **one** saturated color (a cobalt blue) for the meaningful series;
  everything else in the chart is neutral.
- List items get **small colorful circular icon "avatars,"** but the surrounding
  UI stays gray.

**Type does the work.**
- Big, **bold, tightly-tracked** grotesque headings. Document/canvas titles are
  large and confident. Body is calm neutral sans. (Fonda already has this with
  Geist 600 + negative tracking — we keep it and lean in.)

**Chat is the interface, not a bubble.**
- The **user's** message sits in a **light rounded bubble**, right-aligned, with a
  small avatar. The **assistant's** reply is **plain text, no bubble.**
- Progress reads as quiet **status lines** with a small animated glyph
  ("Reviewing meeting transcript", "Building your dashboard", "Done ›").
- Tool/source calls render as **small rounded chips** with an app icon
  ("Lumon × Acme sync", "Acme in Salesforce").
- The composer is a **soft rounded field** with a `+` on the left and a **round
  black send** button on the right; lots of surrounding whitespace.
- Split-view when there's an artifact: **chat on the left (~⅓), a white document /
  dashboard canvas on the right (~⅔)** floating on the grey.

**Motion is subtle.** Streaming text, gentle "building…" states, very soft
skeleton blocks. Nothing bounces, spins, or shifts color on scroll.

---

## 2. Why Fonda looks "AI-ish" today → the fix

A precise gap analysis against the current code, so the changes are targeted.

| # | Today (the tell) | Where | The Sana fix |
|---|---|---|---|
| 1 | **Pure white** page `#FFFFFF` | `globals.css --fonda-bg` | Neutral grey ground `#EEEEEE`; cards float white on top; warmth carried by the surfaces and ink, not the page (§3) |
| 2 | **Navy in the chrome** — active nav = `--fonda-accent-light` pill + navy inset border; badges/chips tinted navy | `sidebar.tsx`, `ask-your-hotel.tsx` | Pull navy out of all chrome; monochrome active states (§4, §6) |
| 3 | **256px labeled rail** with wordmark, connection status, language switcher, sign-out all stacked in it | `sidebar.tsx` | Slim 64px icon rail; move the meta into a hover flyout / account menu (§6) |
| 4 | **Bordered white cards on white** — separation by hairline only | `ui/card.tsx`, `stat-row.tsx` | White cards floating on the grey ground; borderless at top level, hairline on nested, soft radius (§6) |
| 5 | **Floating circular chat FAB** (the classic AI bubble) + **double-sided bubbles** | `ask-your-hotel.tsx` | Sana chat: bubbled user, plain assistant, status lines, source chips, docked composer (§9) |
| 6 | **No content color** — the app is monochrome *everywhere*, so it feels flat-corporate rather than warm-editorial | dashboard pages | Introduce gradient hero/feature/empty surfaces + colorful list avatars (§7) |
| 7 | Accent-tinted pale-blue (`#ECEFFC`) micro-surfaces read "SaaS" | throughout | Replace with warm neutral tints; keep the one accent for data only (§10) |

The through-line: **get the page off white, keep the warmth in the material,
decolor the frame, and move all the color into the content.**

---

## 3. Color system v3 — neutral grey ground, warm material

> **Ground correction (applied 2026-08-19 — this is the shipped system).**
> An earlier draft of this section specified a **warm greige** page ground,
> `#EDEAE3`. Sampling the reference video shows the page canvas is actually
> **RGB 238/238/238 = `#EEEEEE`, a neutral light grey with no warmth on any
> channel.** `#EDEAE3` runs ~10 pts warm on blue, reads visibly sandy, and does
> not match the source.
>
> **The decision, settled:** the **page** is neutral grey; the **material** on
> it stays warm. `--fonda-surface-2` `#F6F3EE`, `--fonda-inset` `#E4E0D7`,
> `--fonda-border` `#E2DDD3`, `--fonda-border-2` `#D4CEC2` and the entire
> `--fonda-text*` / `--fonda-ink` ramp keep their warmth **deliberately** — they
> are not to be neutralized to match the page. Warmth is a property of the
> surfaces, wells, hairlines and ink, not of the canvas they sit on. Only
> `--fonda-bg` changed from the draft.
>
> **AA note:** §3.3's muted-text values fail on any non-white ground. The
> shipped value is `--fonda-text-3: #6C685E` — 4.79:1 on `#EEEEEE`, 5.56:1 on
> white. See §3.3.

Edit the token block in `app/globals.css` (`:root`). This is the single highest-
leverage change; do it first. **Do not hard-code hex in components — reference
these variables / Tailwind tokens** (the codebase already follows this rule).

### 3.1 The new ramp (replace the Signal palette)

```css
:root {
  /* ── Ground: NEUTRAL. Surfaces on it: WARM. (v3) ──────────────────── */
  --fonda-bg:        #EEEEEE;  /* Page ground — neutral light grey (was #FFFFFF)*/
  --fonda-surface:   #FFFFFF;  /* Cards/panels — float LIGHTER than the page   */
  --fonda-surface-2: #F6F3EE;  /* Nested wells, secondary panels, hover fills  */
  --fonda-inset:     #E4E0D7;  /* Pressed states, tracks, active-nav fill      */
  --fonda-white:     #FFFFFF;  /* Modals, canvas, popovers                     */

  /* ── Borders — warm, barely-there ─────────────────────────────────── */
  --fonda-border:    #E2DDD3;  /* Hairline (use sparingly — tone does the work)*/
  --fonda-border-2:  #D4CEC2;  /* Stronger (inputs, buttons)                   */

  /* ── Text — warm near-black ramp ──────────────────────────────────── */
  --fonda-text:      #1C1A16;  /* Primary — warm near-black (was #0A0A0A)      */
  --fonda-text-2:    #56534B;  /* Secondary / descriptions                     */
  --fonda-text-3:    #6C685E;  /* Muted / eyebrows / placeholders (see §3.3)   */
  --fonda-text-inv:  #FFFFFF;  /* Text on ink / gradient                       */

  /* ── Ink — dark CTAs, dark sections ───────────────────────────────── */
  --fonda-ink:       #1C1A16;  /* Primary CTA + full-bleed dark bands          */
  --fonda-ink-hover: #302C25;

  /* ── The ONE content accent — never in chrome (§11) ───────────────── */
  --fonda-accent:        #1B3BB3; /* Data/live signal only. Kept from v2.      */
  --fonda-accent-hover:  #152E8C;
  --fonda-accent-tint:   #E9ECF7; /* Cool tint — data contexts only           */
  /* v2's --fonda-accent-light survives ONLY as a deprecated alias onto
     --fonda-accent-tint, because ~8 component call sites still reference it
     directly. Delete it once those are migrated (Phase 8). Not for new code. */

  /* ── Gradient content surfaces (§8) ───────────────────────────────── */
  --grad-warm: linear-gradient(145deg,#F3A63A 0%,#EE9560 52%,#E0725C 100%);
  --grad-cool: linear-gradient(150deg,#3FB4D0 0%,#2F72D4 58%,#243B98 100%);
  --grad-sand: linear-gradient(150deg,#E9DCC4 0%,#D9C6A6 100%); /* neutral warm */
}
```

Then update the **shadcn semantic mappings** just below (same file) so the whole
component library inherits the warm ground without touching each component:

```css
  --background:       var(--fonda-bg);      /* now neutral grey, not white */
  --card:             var(--fonda-surface); /* now white-on-grey           */
  --popover:          var(--fonda-white);
  --secondary:        var(--fonda-surface-2);
  --muted:            var(--fonda-surface-2);
  --muted-foreground: var(--fonda-text-2);
  /* Chrome must not resolve to a colored accent anymore.
     Repoint the generic --accent pair to a WARM NEUTRAL, and keep the real
     blue only where a component explicitly asks for --fonda-accent (data). */
  --accent:            var(--fonda-inset);   /* was --fonda-accent-light  */
  --accent-foreground: var(--fonda-text);    /* was --fonda-accent        */
  --border:            var(--fonda-border);
  --input:             var(--fonda-border-2);
  --ring:              var(--fonda-accent);   /* focus ring may stay blue  */
```

> **Why the inversion matters.** Today `bg` is white and `surface` is grey, so
> cards are *darker* than the page and need borders to show up. Flipping it
> (grey page, white cards) makes cards read as *raised* — the Sana "floating
> panel" effect — and lets us drop the outer border on top-level cards (§6).
> Note the float is a **17-point** tonal step (`#EEEEEE` → `#FFFFFF`, 1.16:1),
> slightly tighter than the retired greige gave (1.20:1), so the resting
> whisper shadow is load-bearing, not decorative. Nested cards keep a hairline.

### 3.2 Usage rules (unchanged in spirit, warmer in fact)

- **Ground is neutral grey; the material on it is warm.** White is for things
  that should float: cards, the chat composer, the document/dashboard canvas,
  modals. The warm tokens (`surface-2`, `inset`, `border`, `border-2`, and the
  ink ramp) are warm **on purpose** — do not "correct" them toward the neutral
  page. That contrast between a cool-neutral canvas and warm material is the
  system.
- **Ink** (`--fonda-ink`, warm near-black) is the primary CTA and dark bands.
- **The accent is content-only.** `--fonda-accent` may appear **only** inside data
  viz / a single live metric (§11). It must **not** color nav, active states,
  chips, links-in-chrome, or icons. Max one accented element per data view.
- **Never pure `#000` or pure `#FFF` for text.** Warm near-black on grey.

### 3.3 Accessibility (verified against the shipped ground)

Moving the page off white **reduces contrast headroom for muted text.** These are
measured, not estimated, on the shipped `--fonda-bg` (`#EEEEEE`) **and** on
`--fonda-surface` (`#FFFFFF`):

| token | on `#EEEEEE` | on `#FFFFFF` | |
|---|---|---|---|
| `--fonda-text` `#1C1A16` | 14.97:1 | 17.37:1 | ✅ |
| `--fonda-text-2` `#56534B` | 6.62:1 | 7.68:1 | ✅ |
| `--fonda-text-3` `#6C685E` | **4.79:1** | 5.56:1 | ✅ |

- `--fonda-text-3` targets **≥4.5:1** for normal text, **≥3:1** for
  large/eyebrows, and must clear it **on the page**, not just on cards.
  ⚠️ The draft values do **not**: `#7A766C` is 3.90:1 and `#736F65` is 4.32:1 on
  `#EEEEEE` — both fail normal text. (The draft's "~4.5:1 on greige" was really
  the ratio on *white*.) The shipped `#6C685E` is the first value on that warm
  hue clearing 4.5:1 on both grounds. **Never lighten past `#6C685E`.**
- ✅ `--destructive` — **resolved in the Phase 8 sweep.** The draft value
  `#C2403B` was 4.42:1 on `#EEEEEE`, marginally under AA for normal text (it
  passed at 5.13:1 while the page was white). It carries real error copy at
  12–14px directly on the ground, so it was darkened rather than restricted to
  large text. The shipped value is **`#BC3E39`** — the same red scaled toward
  black, holding hue (2.22° → 2.29°) and saturation (0.696):
  **4.66:1 on `#EEEEEE`**, **5.40:1 on `#FFFFFF`**, and 5.40:1 for white text
  *on* it (contrast is symmetric), so a destructive button fill still clears AA.
  Never lighten past `#BC3E39`.
- Any text on a **gradient** surface must be white and pass 4.5:1 against the
  *lightest* stop of that gradient (§7) — engineer a subtle scrim if needed.
  ⚠️ Both current gradients fail white text at their lightest stop
  (`--grad-warm` 2.03:1 at `#F3A63A`; `--grad-sand` 1.35:1 at `#E9DCC4`), so a
  scrim is **mandatory**, not optional, when Phase 5 builds these.

Keep the existing `::selection` and focus-ring rules; the ring may stay accent
blue (it's an interaction signal, not chrome color).

---

## 4. Typography — keep, and lean in

No font change. Fonda already ships Geist + Geist Mono with 600 headlines and
negative tracking — that *is* the Sana headline recipe. Refinements only:

- **Page titles** (dashboard `h1`, page headers): bump to Display MD/LG scale and
  keep `tracking-[-0.025em]`. Big and calm, lots of air above/below.
- **Editorial/canvas titles** (Morning Brief, brief history, chat artifacts): go
  large — `clamp(30px,4vw,44px)`, weight 600 — echoing Sana's document canvas.
- **Eyebrows/labels**: Geist Mono, uppercase, `--fonda-text-3`, `0.14em` tracking
  — unchanged (already used in `stat-row.tsx`).
- **Numbers** (KPIs): keep `tabular-nums`, weight 600, tight tracking; big.

Keep the `h1,h2,h3 { font-weight:600; letter-spacing:-0.025em }` base rule.

---

## 5. The slim icon rail (replaces the sidebar)

This is the structural centerpiece. Rewrite `components/dashboard/sidebar.tsx`
and adjust the padding in `app/[lang]/dashboard/layout.tsx`.

### 5.1 Shape & anatomy

- **Fixed, full-height, ~64px wide** (`w-16`) on `md+`. Background
  `--fonda-bg` (the neutral light grey `#EEEEEE` — the rail is *part of the
  ground*, not a darker panel) OR a hair lighter `--fonda-surface-2`;
  **no right border**, or at most a 1px
  `--fonda-border`. It should nearly disappear.
- **Top:** the Fonda mark as a **solid near-black rounded square/circle** (~32px),
  no wordmark text. Links to `/dashboard`.
- **Middle:** the primary nav as a vertical stack of **icon-only** buttons
  (~40px hit target), thin `strokeWidth={1.5}` Lucide icons at ~20px.
- **Bottom (pinned):** Settings gear, then the **account button** (small avatar or
  initials disc) that opens a menu.
- **Mobile unchanged in behavior:** keep the current slim top bar + slide-over
  drawer, but in the drawer you *may* show icon+label (space allows). Restyle to
  the warm tokens.

### 5.2 States — monochrome, no navy

```
Inactive icon:  color var(--fonda-text-3)             (muted, quiet)
Hover:          color var(--fonda-text);  bg var(--fonda-surface-2); radius 10px
Active:         color var(--fonda-text)  (SOLID near-black icon)
                bg var(--fonda-inset);   radius 10px
                — NO accent tint, NO colored left-border bar
Focus-visible:  the shared 2px accent ring (globals.css) is fine
```

The active tell is **weight/darkness**, not hue: the active icon is solid warm
near-black on a soft greige inset; inactive icons are muted. That one change
removes most of the "AI product" read.

### 5.3 Hover labels (the affordance we keep for staff)

Because there are no visible labels, every rail item needs an **accessible,
discoverable label**:

- Each button has `aria-label={label}` and `title={label}` (native tooltip is the
  zero-JS floor).
- Add a **flyout tooltip** on hover/focus: a small `--fonda-ink` (dark) pill with
  white text, appearing to the right of the icon after ~150ms, `rounded-[8px]`,
  Geist 13px. (A tiny `Tooltip` primitive or a CSS `group-hover` popover — keep it
  dependency-light.) This preserves the multi-user-staff clarity the old labeled
  rail gave, without the visual weight.
- Keep `aria-current="page"` on the active item.

### 5.4 What moves OUT of the rail

Today the rail also carries the wordmark, connection status, language switcher,
user email, and sign-out. The slim rail can't hold those. Relocate:

- **Connection status** (synced/stale/not-connected dot): move to a small,
  quiet indicator in the **account menu**, and/or a dot overlaid on the settings
  gear. Keep `deriveConnectionState` logic as-is; only the placement changes.
- **Language switcher, user email, sign-out:** into the **account menu** popover
  opened from the bottom avatar (a small `--fonda-white` card, soft shadow,
  `rounded-[12px]`).
- **Badges** (e.g. Communications "waiting" count): render as a **tiny neutral dot
  or count** on the icon (top-right), `--fonda-text` on `--fonda-inset`. If a
  genuine alert must stand out, this is the *one* place a restrained accent is
  allowed — but prefer a neutral dot; the design brief is to keep chrome colorless.
- **"Coming soon" items:** in a slim rail, either hide unbuilt items or show them
  muted with a dot; surface the "coming soon" wording in the hover label.

### 5.5 Layout padding

In `app/[lang]/dashboard/layout.tsx`, change the content offset from `md:pl-64`
to `md:pl-16` and keep the `max-w-[1120px]` centered content with generous
padding. The floating chat FAB is being replaced (§9), so also remove/replace the
`AskYourHotel` mount here per §9.

---

## 6. Surfaces & cards

Now that cards are white on the neutral light grey `#EEEEEE`, they read as raised
without borders.

- **Default card:** `background: var(--fonda-surface)` (white), `rounded-[18px]`
  (up from 16 — slightly softer, more Sana), **no border**, and a **whisper
  shadow** at rest: `box-shadow: 0 1px 2px rgba(28,26,22,.04), 0 8px 24px
  rgba(28,26,22,.04)`. Hover deepens it slightly.
- Update `components/ui/card.tsx`: drop `border border-border`, bump radius to
  `rounded-[18px]`, add the resting shadow. Keep the `Card*` sub-components' padding.
- **Nested wells / secondary panels:** `--fonda-surface-2` with **no** shadow (they
  sit *inside* a card).
- **Hairlines** are now the exception, not the rule — use `--fonda-border` only
  where a true divider is needed (e.g. the stat-row internal rules, list row
  separators), never as a card outline.
- **`stat-row.tsx`:** keep the four-numbers-as-one-thought idea, but make the
  container a white card (`--fonda-surface`, `rounded-[18px]`, resting shadow, no
  outer border); keep the 1px internal dividers between cells. Numbers big, warm
  near-black; eyebrows Geist Mono muted.

Corner scale overall: **inputs/buttons 10px**, **cards 18px**, **hero/gradient &
modals 20–24px**, **chips/badges full-round** (chips only, per the locked
no-pills-for-buttons rule).

---

## 7. Gradient content surfaces (the warmth)

This is where color lives now. A small, disciplined set of gradient surfaces —
used for **hero, featured, and empty/first-run states**, never for ordinary data.

### 7.1 The two gradients + one neutral

- **Warm (sunrise):** `--grad-warm` (amber → coral). Fonda's natural home for the
  **Morning Brief** (a literal sunrise) and warm/welcome moments.
- **Cool:** `--grad-cool` (teal → blue → indigo). For **Analytics / data** hero
  moments and "focus/insight" surfaces.
- **Sand (neutral warm):** `--grad-sand` for a quieter featured card that still
  isn't flat.

### 7.2 Rules

- White text only; ensure ≥4.5:1 on the **lightest** stop (add a subtle dark
  scrim `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.28))` under text if needed).
- `rounded-[20px]`, generous padding (28–32px), **no border**, soft shadow.
- **At most one gradient hero per screen.** Everything around it stays neutral
  light grey / white. (Mirrors v2's "one signal per screen" discipline, applied to gradients.)
- Icons inside can be a **soft translucent white** glyph (like Sana's sun icon).

### 7.3 Where to use them in Fonda

- **Morning Brief** page header → warm gradient hero card with the date + brief
  title.
- **Dashboard first-run / empty states** (`first-run-state.tsx`,
  `empty-state.tsx`, `setup-banner.tsx`) → a single gradient card with the CTA,
  instead of the current flat bordered panel.
- **Featured action** (e.g. "Ask your hotel" entry point, or a highlighted to-do)
  → optional gradient tile.
- **Colorful list avatars:** for concierge/inbox items or "agents/workflows"-style
  lists, give each row a **small colored circular icon disc** (like Sana's
  workflow list) drawn from a fixed warm palette — the *only* other place color
  appears. Keep them small; the row text/chrome stays neutral.

---

## 8. Chat, Sana-style

Replace the AI-bubble feel. Two surfaces are affected: the floating
`components/dashboard/ask-your-hotel.tsx` widget and the `/dashboard/chat` page.

### 8.1 The message pattern

- **User message:** right-aligned, in a **light rounded bubble**
  (`--fonda-surface-2`, `rounded-[16px]`, `text` color), with a small round
  **avatar** to its right. (Today the user bubble is dark/`bg-primary` — change it
  to the light greige bubble; dark bubbles read "chatbot.")
- **Assistant message:** **plain text, left-aligned, NO bubble, NO background.**
  Just `--fonda-text` prose at a comfortable measure. Optionally a tiny sparkle/
  mark glyph to the left of the first line. (Today assistant uses `bg-muted`
  bubble — remove the bubble.)
- Comfortable vertical rhythm and whitespace between turns.

### 8.2 Status lines & source chips

- While working, show a **quiet status line** in `--fonda-text-3` with a small
  animated glyph: e.g. "Reviewing today's arrivals…", "Drafting reply…", then a
  muted "Done ›" when complete. (Replaces the bare spinner in the current widget.)
- Tool/context lookups render as **small rounded chips** with an app/context icon
  and label — e.g. a chip for the PMS ("Apaleo · today's arrivals"), Gmail
  ("Inbox · 3 unread"), or a guest/reservation. `--fonda-surface` chip, hairline
  or none, `rounded-full`, 12–13px, small leading icon. These are the Fonda
  equivalent of Sana's "Lumon × Acme sync" chips and make the AI feel *grounded in
  real hotel data*.
- The existing **draft hand-off** ("draft created → Communications") should become
  one of these chips / a small result card (see §8.4), not an accent-tinted pill.

### 8.3 The composer

- A **soft rounded field** (`--fonda-surface` white on the grey ground, `rounded-[14px]`,
  `--fonda-border-2` hairline, generous padding), placeholder in `--fonda-text-3`
  ("Ask anything about your hotel…").
- **Left:** a `+` affordance (attach / add context) — optional but very Sana.
- **Right:** a **round near-black send** button (`--fonda-ink`, `rounded-full`,
  white arrow-up icon). This round send button is the one place a fully-round
  control is right — it's an icon button, not a text button, so it doesn't
  conflict with the no-pills rule.
- Lots of surrounding whitespace; the composer floats, it isn't boxed-in by heavy
  borders.

### 8.4 Result cards

When the assistant produces a concrete result (a draft, an updated reservation, a
confirmation), render a **small white result card** (Sana's "Opportunity updated"
pattern): `--fonda-surface`, `rounded-[16px]`, soft shadow, a leading app/context
icon + title + timestamp, a hairline divider, then the key value and a quiet
"View in …/Open ›" link. Neutral throughout — no accent fill.

### 8.5 The floating FAB → docked entry

The circular floating chat bubble is the single most "AI chatbot" element. Options,
in order of preference:

1. **Best (most Sana):** promote chat to a **first-class surface**. Keep the
   `/dashboard/chat` page as the full experience (empty state = centered composer
   with lots of air, like Sana's blank chat). From other pages, offer a slim
   **"Ask" affordance docked at the bottom** of the content column (a rounded
   input-looking bar) rather than a floating circle — clicking it opens the chat
   panel or navigates to the page.
2. **Acceptable:** keep a floating trigger but make it a **small rounded
   bar/label** ("Ask your hotel") in `--fonda-ink`, not a big circular icon FAB,
   and restyle the opened panel per §8.1–8.4 (light user bubbles, plain assistant,
   warm tokens, no accent header disc).

Either way: remove the accent-tinted circular header icon and the dark user
bubbles; adopt the warm greige surfaces.

---

## 9. Buttons, inputs, chips (keep soft corners)

Mostly unchanged from v2 — we deliberately **kept soft 10px corners** — but warmed.

- **`components/ui/button.tsx`:** no structural change. `ink` stays the default
  CTA (now warm near-black `#1C1A16`). Verify hover uses `--fonda-ink-hover`.
  Radii stay: `sm 8px / default 10px / lg 12px`. **No pills.**
- **Round icon-only buttons** (chat send, maybe a rail action) may be
  `rounded-full` — that's an icon button, not a pill text button, and is on-brand
  (Sana does exactly this).
- **Inputs/textarea:** keep the Signal focus state (accent border + 3px
  accent-light ring) — but recolor the ring tint to `--fonda-accent-tint`
  (`#E9ECF7`) so it stays cool-neutral, not the old bright pale blue. Field bg is
  white (`--fonda-surface`) on the grey ground.
- **Chips/badges:** full-round, `--fonda-surface`/`--fonda-surface-2` fill, warm
  neutral text, optional small leading icon. The `badge-accent` variant is
  **retired from chrome** — only data contexts may use the accent (§11).

---

## 10. Data viz & the one accent

Color returns for meaning, once per view.

- **`components/dashboard/occupancy-strip.tsx`** and any charts: the **one**
  meaningful series/marker uses `--fonda-accent` (navy) or its warm counterpart;
  the rest of the chart is neutral greys on white. Gridlines `--fonda-border`,
  labels `--fonda-text-3`, values `--fonda-text`.
- A **single live/highlight metric** (e.g. today's occupancy, or an alert count)
  may use the accent as a number color or a small filled tile — **once**. Sana's
  dashboard does exactly this (one cobalt KPI tile amid neutral ones).
- Sequential/comparative palettes for richer charts: derive a small warm-to-cool
  ramp, but keep saturation restrained. (If you build multi-series analytics, read
  the `dataviz` skill for palette construction — validate contrast in light.)
- **Never** let the accent leak back into nav, chips, links-in-chrome, or card
  outlines. If you're tempted, use `--fonda-text` or `--fonda-inset` instead.

---

## 11. Motion & loading

- **Streaming:** assistant text streams in (already implemented in
  `ask-your-hotel.tsx`); keep it, just restyle the container.
- **Status shimmer:** the working-status glyph gets a gentle pulse/shimmer, not a
  hard spinner. Respect `prefers-reduced-motion` (the global rule already collapses
  durations — keep relying on it).
- **Skeletons:** loading states (`ui/skeleton.tsx`, the various `loading.tsx`) →
  **soft rounded greige blocks** (`--fonda-surface-2`) on white cards, like Sana's
  building-dashboard state. Round them `rounded-[10px]`, low contrast, gentle pulse.
- Transitions stay `0.18s` ease for color/border/bg. No parallax in the app (the
  marketing hero parallax exception from v2 stays scoped to marketing).

---

## 12. Marketing site tuning

Apply the same warm ground so product and marketing feel like one brand.

- **Ground:** the marketing pages move to the `--fonda-bg` neutral light grey too
  (they currently inherit white). Sections that were pure white become grey with
  white cards.
- **Keep** the v2 marketing decisions that already lean Sana: big Geist headlines,
  generous section padding, one-accent discipline, the ink CTA band/footer.
- **Hero:** the existing La Casa watercolor + parallax (v2.2) is compatible and
  actually reinforces the "warm, not-AI" goal — keep it. Ensure the hero's white
  scrim is re-checked against the grey ground so the section transition is clean.
- **Feature cards / product shots:** put them on white cards floating on the grey,
  soft shadow, `rounded-[18–20px]`, and consider one **gradient feature tile**
  (§7) to introduce the product's warmth above the fold.
- **Nav:** keep the sticky blurred bar; it may now blur over the grey. Wordmark stays
  Geist 600 (this is marketing, where the wordmark *should* show — the icon-only
  rule is a *product-chrome* decision, not a marketing one).

---

## 13. File-by-file migration checklist

Grounded in the actual tree. Work top-down; §3 (tokens) unblocks everything.

**Tokens & base**
- [ ] `app/globals.css` — replace the `:root` Fonda palette with §3.1; repoint the
      shadcn semantic mappings (esp. `--background`, `--card`, `--accent*`); update
      the header comment from "Signal / white" to "v3 neutral grey ground, warm
      material". Re-verify AA (§3.3).

**Chrome**
- [ ] `components/dashboard/sidebar.tsx` — rewrite to the slim icon rail (§5):
      icon-only, monochrome states, hover-label flyout, account menu at the bottom
      absorbing connection status + language switcher + email + sign-out.
- [ ] `app/[lang]/dashboard/layout.tsx` — `md:pl-64` → `md:pl-16`; pass the meta
      (connection state, labels, userEmail, sign-out) into the account menu instead
      of the rail body; replace the `AskYourHotel` FAB mount per §8.5.
- [ ] `components/brand/wordmark.tsx` — no longer used in the product rail (the
      mark becomes an icon); still used on marketing/auth — leave it for those.
- [ ] `components/dashboard/connection-status.tsx` — keep the logic; restyle as a
      quiet dot for the account menu / gear.

**Surfaces**
- [ ] `components/ui/card.tsx` — white surface, `rounded-[18px]`, drop the outer
      border, add the resting whisper shadow (§6).
- [ ] `components/dashboard/stat-row.tsx` — white card container, keep internal
      dividers, warm the text tokens.
- [ ] `components/ui/input.tsx`, `textarea.tsx` — white field on the grey ground, warm focus
      tint (§9).
- [ ] `components/ui/skeleton.tsx` + every `*/loading.tsx` — soft greige rounded
      blocks (§11).

**Chat**
- [ ] `components/dashboard/ask-your-hotel.tsx` — light user bubble, plain
      assistant text, status lines, source/result chips, docked composer with round
      ink send, warm tokens; drop the accent header disc and the circular FAB
      (§8).
- [ ] `app/[lang]/dashboard/chat/page.tsx` — full Sana chat surface; blank state =
      centered composer with air.

**Content color**
- [ ] `components/dashboard/first-run-state.tsx`, `empty-state.tsx`,
      `setup-banner.tsx` — become a single **gradient** hero card (§7).
- [ ] `app/[lang]/dashboard/brief/*` — warm-gradient page hero.
- [ ] `components/dashboard/occupancy-strip.tsx` + analytics charts — one accent,
      rest neutral (§10).
- [ ] Inbox/concierge list rows (`email-inbox.tsx`, `needs-reply-card.tsx`) —
      optional small colored circular avatars per row; chrome stays neutral.

**Marketing**
- [ ] `app/[lang]/page.tsx` + `components/marketing/*` — neutral grey ground, white
      floating cards, keep hero parallax, optional gradient feature tile (§12).
- [ ] `components/auth/*`, `components/onboarding/*` — inherit the grey ground; white
      cards; warm tokens.

**Docs**
- [ ] Update `FONDA_DESIGN_IDENTITY.md` header to note v3 supersedes the white
      ground + chrome-accent decisions for the app (point to this file).

---

## 14. Copy-paste prompts for Claude Code

Paste these in order. Each is scoped to be reviewable on its own. Replace nothing
else while doing a step. **After each step, run the app and eyeball it before
moving on.**

> **Prompt 0 — context (paste once at the start):**
> "Read `FONDA_SANA_REDESIGN.md` in full. We are moving Fonda from the v2 'Signal'
> white look to the v3 warm look inspired by Sana AI. Key rules: a neutral light
> grey `#EEEEEE` page ground carrying deliberately warm surfaces, wells, borders
> and ink, with white cards floating on top; the app chrome is
> **colorless** (no navy in nav/active-states/chips); color lives only in content
> (gradient hero cards + one accent inside data viz); keep soft 10px corners (no
> pills); slim icon-only left rail with hover labels. Do NOT hard-code hex —
> reference the CSS variables. Keep WCAG AA. Work one phase at a time and stop for
> review after each."

> **Prompt 1 — tokens:**
> "Phase 1 (tokens only). In `app/globals.css`, replace the `:root` Fonda palette
> and the shadcn semantic mappings with §3.1 of `FONDA_SANA_REDESIGN.md` (warm
> neutral grey ground, white `--card`, warm-neutral `--accent`, gradient tokens). Update
> the file header comment. Then verify §3.3 contrast for `--fonda-text-3` on both
> `--fonda-bg` and `--fonda-surface`; if it fails AA at small sizes, darken it to
> `#736F65`. Change nothing else. Show me the diff."

> **Prompt 2 — cards & surfaces:**
> "Phase 2. Per §6, update `components/ui/card.tsx` (white surface, `rounded-[18px]`,
> no outer border, resting whisper shadow), `components/dashboard/stat-row.tsx`
> (white card container, keep internal dividers), and the inputs/textarea focus
> tint (§9). Keep everything referencing CSS vars."

> **Prompt 3 — the slim icon rail:**
> "Phase 3. Rewrite `components/dashboard/sidebar.tsx` as a ~64px icon-only rail
> per §5: solid near-black mark at top, monochrome thin Lucide icons, active =
> solid near-black icon on `--fonda-inset` (NO accent tint, NO colored left bar),
> hover shows a dark flyout tooltip label (accessible: `aria-label` + `title` +
> `aria-current`). Move connection status, language switcher, user email, and
> sign-out into an account-menu popover opened from a bottom avatar; keep the
> settings gear pinned above it. Badges become a small neutral dot/count on the
> icon. Keep the mobile top-bar + slide-over drawer, restyled to warm tokens. Then
> in `app/[lang]/dashboard/layout.tsx` change `md:pl-64` to `md:pl-16` and pass the
> relocated meta into the rail's account menu. Preserve all existing a11y (focus
> trap, inert, reduced-motion)."

> **Prompt 4 — chat, Sana-style:**
> "Phase 4. Per §8, restyle `components/dashboard/ask-your-hotel.tsx` and
> `app/[lang]/dashboard/chat/page.tsx`: user messages = light greige bubble
> (`--fonda-surface-2`) right-aligned with a small avatar; assistant = plain text,
> no bubble; add quiet status lines with an animated glyph; render tool/context
> lookups and the draft hand-off as small rounded source/result chips with a
> leading icon; composer = soft white rounded field with a `+` on the left and a
> round near-black send button. Remove the accent-tinted header disc and the
> circular floating FAB — replace the FAB with a slim docked 'Ask your hotel' bar
> per §8.5 option 1. Keep the streaming logic."

> **Prompt 5 — gradient content surfaces:**
> "Phase 5. Per §7, convert `components/dashboard/first-run-state.tsx`,
> `empty-state.tsx`, and `setup-banner.tsx` into a single gradient hero card
> (`--grad-sand` or `--grad-warm`, white text with a scrim if needed,
> `rounded-[20px]`, soft shadow, no border). Give the Morning Brief page header a
> warm-gradient hero (`app/[lang]/dashboard/brief`). Optionally add small colored
> circular avatars to inbox/concierge list rows. One gradient hero per screen max."

> **Prompt 6 — data viz:**
> "Phase 6. Per §10, make `components/dashboard/occupancy-strip.tsx` (and any
> charts) use exactly one accent for the meaningful series/marker and neutral greys
> for everything else; one live/highlight metric may use the accent as a number
> color, once per view. No accent anywhere in chrome."

> **Prompt 7 — marketing, auth, onboarding:**
> "Phase 7. Per §12, move the marketing site, auth, and onboarding to the grey
> ground with white floating cards and warm tokens. Keep the La Casa hero parallax
> and re-check its white scrim against the grey ground. Keep the marketing
> wordmark (the icon-only rule is product-chrome only). Optionally add one gradient
> feature tile above the fold."

> **Prompt 8 — sweep & verify:**
> "Phase 8. Grep the codebase for any remaining hard-coded whites (`#fff`,
> `bg-white`), the old accent-tint (`--fonda-accent-light`, `#ECEFFC`) used in
> chrome, and dark chat bubbles (`bg-primary` on messages). Replace per this doc.
> Then screenshot the dashboard, chat, brief, and marketing hero and check them
> against §1 (the Sana DNA) and §2 (the fixes). Confirm no navy appears in any
> chrome, and that every text/gradient pair passes WCAG AA."

---

## 15. Quick reference card

```
GROUND     #EEEEEE neutral grey page · warm surfaces + white cards float on top
SURFACES   card #FFFFFF r18 · well #F6F3EE · inset #E4E0D7 · modal/canvas #FFFFFF
TEXT       #1C1A16 primary · #56534B secondary · #6C685E muted (4.79:1 on #EEEEEE)
CHROME     COLORLESS — no navy in nav/active/chips/links. Active = solid dark icon
           on #E4E0D7 inset. Rail = 64px icon-only + hover labels.
COLOR      CONTENT ONLY — gradients (warm sunrise / cool / sand) for hero/empty;
           ONE accent (#1B3BB3) inside data viz, once per view.
BUTTONS    ink (#1C1A16) default · soft corners 8/10/12px · NO pills
           (round allowed only for icon-only send button)
CHAT       user = light bubble + avatar · assistant = plain text · status lines ·
           source/result chips · docked composer w/ round ink send · no FAB
CARDS      r18, white, no border, resting whisper shadow · wells r10, no shadow
RADIUS     inputs/buttons 10 · cards 18 · hero/modal 20–24 · chips full-round
TYPE       Geist 600 tight headlines (unchanged) · Geist Mono eyebrows
MOTION     stream text · soft status shimmer · greige skeleton blocks · no app parallax
LIGHT ONLY · WCAG AA · reference CSS vars, never hard-code hex
```

---

## 16. Open choices (safe to defer)

1. **Accent hue for data:** keep Fonda navy `#1B3BB3`, or shift to Sana's brighter
   cobalt (~`#2E6FE0`) for charts? Navy is more boutique; cobalt is more literally
   Sana. Recommendation: keep navy — it's already the brand and reads calmer.
2. **Chat FAB replacement:** docked "Ask" bar (§8.5 opt 1, recommended) vs. keep a
   restyled slim floating trigger (opt 2). Either is compatible.
3. **List avatars:** add colorful circular per-row icons to inbox/concierge (more
   Sana warmth) or keep rows fully neutral (calmer, less busy). Low stakes — try it
   on one list and decide.
4. **Rail width:** 64px (icon-only) vs 72px if the hit targets feel tight with the
   flyout. Tune during Phase 3.
```
