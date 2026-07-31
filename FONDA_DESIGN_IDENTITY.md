# Fonda — Design Identity & System Specification (v2.0 "Signal")
> Feed this entire document to Claude Code before making UI changes.
> This **replaces** the previous Playfair + warm-navy identity. Every value is intentional.

---

## 0. What changed from v1

| | v1 (retired) | v2 "Signal" (this doc) |
|---|---|---|
| Headlines | Playfair Display serif, italic 2nd line | **Geist**, weight 600, tight tracking — no serif |
| Body / UI | Inter | **Geist** |
| Labels / eyebrows | Inter uppercase | **Geist Mono**, uppercase |
| Page background | warm off-white `#FAFAF8` | neutral white `#FFFFFF` |
| Accent | navy `#1E3A5F` | cool navy signal `#1B3BB3` |
| Buttons | full pill (100px) | soft-cornered (10px) |
| Cards | 20px radius, warm surface | 16px radius, white + hairline border |
| Illustrations | hand-drawn pencil + watercolor | **dropped** — type and space carry the brand |

The product voice is unchanged. The *visual* language is now confident, neutral, and grotesque — inspired by Sana: bold large-scale type, generous space, one signal color.

> **v2.1 amendment (illustration).** The line below and §6 originally read "no illustration." As of v2.1 we deliberately reintroduce **one warm illustrated layer** — a single watercolor hero scene plus a small spot-vignette set — over the otherwise-flat Signal system. See §6 for the rules. Warmth comes from the art; calm comes from the type. This is an intentional, owner-approved exception, not a loosening of the system.

**Scope:** this system governs the **entire app** — marketing site, dashboard, auth, onboarding — and is the **standard for all future pages and features**. New UI must use these tokens, this type, and these components; do not introduce a serif, a second accent, pill buttons, or hand-drawn illustration.

---

## 1. Design Philosophy

Fonda is an AI operations layer for boutique hotels. The interface should feel **calm, intelligent, and boutique** — precise software that gets out of the way.

**Principles:**
- **Type does the work.** Big, tightly-tracked Geist headlines are the design. Don't decorate around them.
- **One signal.** Navy appears only for primary action and live highlights — never as ambient color.
- **Quiet surfaces.** Flat white cards, hairline borders, no shadow at rest.
- **Generous air.** Large section padding; let content breathe.

**Avoid:** dark mode · gradients / glassmorphism · purple-blue "AI" clichés · dashboard density · heavy drop shadows · decorative illustration.

---

## 2. Color System

Defined as CSS custom properties in `:root` (see `globals.css`). Never hard-code hex in components — reference variables / Tailwind tokens.

```
--fonda-bg:           #FFFFFF   Page background (neutral white)
--fonda-surface:      #F6F6F4   Cards, panels, nested wells
--fonda-inset:        #EEEDE9   Pressed states, inner wells
--fonda-border:       #E8E7E3   Hairline border
--fonda-border-2:     #DCDBD6   Stronger border (inputs, buttons)
--fonda-text:         #0A0A0A   Primary text (near-black)
--fonda-text-2:       #5B5B58   Secondary text / descriptions
--fonda-text-3:       #6F6F6A   Muted / eyebrows / placeholders (v2.1: darkened from #9C9C97 for WCAG AA — 5.05:1 on white; the old value failed AA at every size)
--fonda-text-inv:     #FFFFFF   Text on ink / accent
--fonda-accent:       #1B3BB3   Cool navy SIGNAL — primary action only
--fonda-accent-hover: #152E8C
--fonda-accent-light: #ECEFFC   Accent tint background
--fonda-ink:          #0A0A0A   Dark CTAs, dark sections, footers
--fonda-ink-hover:    #1C1C1C
```

**Usage rules**
- Background is `#FFFFFF`. Use `--fonda-surface` for nested panels/wells.
- `--fonda-ink` (near-black) is the **primary CTA** color and the color of full-bleed dark sections (CTA band, footer).
- `--fonda-accent` (navy) is the **signal** — max 2–3 uses per screen: primary action, active tab, a live metric, an eyebrow. Never on every interactive element. It is the **only** accent — keep every highlight on this one blue.
- Text is always `--fonda-text` on light, `--fonda-text-inv` on ink/accent. Never pure `#000`.

> **Alternate tones.** The showcase ships three retunes — **Signal** (default, neutral), **Atlas** (navy-forward, cool), **Warm** (warm paper, nods to v1). Signal is canonical; the others exist if leadership prefers a different temperature. Pick one and lock it.

---

## 3. Typography

### Fonts
**Geist** (everything) + **Geist Mono** (labels, eyebrows, code, metadata). Load via `next/font/google` — see the header comment in `globals.css`.

```
--font-sans:  Geist
--font-serif: Geist   ← intentionally remapped so legacy classes keep working
--font-mono:  Geist Mono
```

### Type scale
```
Display XL   clamp(44px, 6.6vw, 86px)   weight 600   line 1.00   tracking -0.035em   Hero H1
Display LG   clamp(30px, 4.5vw, 56px)   weight 600   line 1.05   tracking -0.025em   Section headlines
Display MD   clamp(26px, 3.4vw, 44px)   weight 600   line 1.08   tracking -0.025em   Sub-section heads
Heading      22–24px                    weight 600   tracking -0.01em                Card titles
Body LG      19px                       weight 400   line 1.6    color text-2        Lead paragraphs
Body         16px                       weight 400   line 1.6    color text-2        Default
Small        14px                       weight 400/500                              Labels, captions
Eyebrow      12–13px  Geist Mono  weight 500  tracking 0.14em  UPPERCASE             Section labels
```

**Rules**
- Headlines are weight **600** with negative tracking. Never use weight 700+ except sparingly.
- The hero headline is two short lines, left or centered, no italic, no color change. The line break is the rhythm.
- Eyebrows are **Geist Mono**, uppercase, `--fonda-text-3` (or `--fonda-accent` when it should signal).
- Body never exceeds ~60ch; lead paragraphs ~520px max-width.

---

## 4. Spacing & Layout

8px base. Multiples of 4/8 only.

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128
```

- **Content max-width:** `1120px`, centered, `padding: 0 32px`.
- **Section padding:** 80–96px top/bottom desktop; 56–64px mobile.
- **Section dividers:** 1px `--fonda-border` top rule between sections (no heavy separators).
- **Grids:** 2-col `1fr 1fr` · 3-col `repeat(3,1fr)` · feature layout `5fr 7fr`, gap 40px · stat row `repeat(4,1fr)` with 1px dividers.

---

## 5. Components

### 5.1 Buttons — soft-cornered (10px), never loud
```css
/* Primary (ink / dark) — default CTA */
.btn-ink      { background: var(--fonda-ink); color: var(--fonda-text-inv);
                border-radius: 10px; padding: 13px 24px; font: 500 15px Geist; border: 0; }
.btn-ink:hover{ opacity: .88; }

/* Accent (navy) — use when action IS the signal */
.btn-accent   { background: var(--fonda-accent); color: #fff; border-radius: 10px; padding: 13px 24px; }
.btn-accent:hover { background: var(--fonda-accent-hover); }

/* Secondary — white + border */
.btn-secondary{ background: var(--fonda-bg); color: var(--fonda-text);
                border: 1px solid var(--fonda-border-2); border-radius: 10px; padding: 12px 23px; }
.btn-secondary:hover { border-color: var(--fonda-text-3); }

/* Ghost */
.btn-ghost    { background: transparent; color: var(--fonda-text-2); border: 0; padding: 12px 14px; }
.btn-ghost:hover { color: var(--fonda-text); }
```
Sizes: sm `8px 16px / 13px / r8` · md `13px 24px / 15px / r10` · lg `16px 32px / 17px / r12`.

> **Migration:** in `components/ui/button.tsx`, change the radius from `rounded-full` to `rounded-[10px]` (or `rounded-lg`). Keep the `ink` variant as the default CTA. No pills.

### 5.2 Cards
```css
.card { background: var(--fonda-white); border: 1px solid var(--fonda-border);
        border-radius: 16px; padding: 28px; }
.card:hover { box-shadow: 0 12px 40px rgba(10,10,10,.06); }   /* hover only */
```
Subtle panel: `background: var(--fonda-surface)`. Ink surface (`--fonda-ink`, white text) for CTAs/footers, radius 16–28px.

### 5.3 Inputs
```css
.input { background: var(--fonda-bg); border: 1px solid var(--fonda-border-2);
         border-radius: 10px; padding: 12px 14px; font: 15px Geist; color: var(--fonda-text); }
.input:focus { border-color: var(--fonda-accent); box-shadow: 0 0 0 3px var(--fonda-accent-light); }
```

### 5.4 Badges & eyebrows
```css
.eyebrow { font: 500 12px "Geist Mono"; letter-spacing: .14em; text-transform: uppercase;
           color: var(--fonda-text-3); }
.badge   { font: 12px "Geist Mono"; color: var(--fonda-text-2); background: var(--fonda-surface);
           border: 1px solid var(--fonda-border); border-radius: 100px; padding: 4px 12px; }
.badge-accent { background: var(--fonda-accent-light); color: var(--fonda-accent); border-color: transparent; }
```
Pills (100px radius) are allowed for **badges/chips only** — not buttons.

### 5.5 Navigation
Sticky, 64px, `backdrop-filter: blur(14px)` over an 82%-opaque page background, 1px bottom border. Wordmark: **Geist 600, 21px, tracking -0.03em** ("Fonda"). Nav links 14px `--fonda-text-2`, hover `--fonda-text`. CTA uses `.btn-ink` at sm size.

> **Migration:** `components/brand/wordmark.tsx` — drop `font-serif`, use `font-sans font-semibold tracking-tight`.

---

## 6. Iconography & imagery

- **Illustration — one warm layer (v2.1).** v2 retired v1's pencil/watercolor; **v2.1 reintroduces illustration in a single, deliberate way**: one hand-painted watercolor scene ("La Casa" — cream façade, terracotta roof, arcaded loggia, a pool between two palms) in the hero, plus a small matched set of spot-vignettes (key, coffee, olive branch, lantern, sun-lounger, sailboat) for feature rows, the footer and empty states. Everything else stays flat and neutral. **Rules:** at most **one illustration per screen**; the hero art is **≤40% of the hero's height**; it **never sits behind type** (it sits beside or below the words); palette is drawn from the artwork; the type still does the work. This is a cohesive new illustrated layer — the v1 coffee-cup / hotel-key SVGs remain retired and are *not* what's coming back.
- Icons: a single line set at ~1.5px stroke (Lucide is a good match) — used small and sparingly. No emoji in product chrome.
- Markers: a small navy square (`6–8px`, radius 2px) in place of bullets/emoji in lists.
- Product imagery: real screenshots in rounded containers (16–20px radius, 1px border). Use a striped placeholder with a Geist Mono caption (`dashboard.webp · product shot`) until real assets exist.

---

## 7. Motion

Minimal and purposeful.
- Transitions `0.18s` ease for color/border/background on links, buttons, tabs.
- Card hover: shadow in, no large transforms.
- Entrance: fade + 12–16px rise via IntersectionObserver.
- **No** parallax, spinning, autoplay, or scroll-triggered color shifts.

### v2.2 — hero parallax (a deliberate, single exception)

The "no parallax" rule above and the La Casa placement rule "never behind the
type" both stand **everywhere except the marketing hero**, where one scroll-linked
parallax is now allowed. This is an exception, not a new pattern: do not
reach for it a second time on the same page or on any other surface.

The exception is scoped to exactly this:

- **One instance only** — the single La Casa hero illustration, as the
  background layer of the hero. Nowhere else, ever.
- **Subtle** — background drifts at `0.275 × scrollY`, foreground copy at
  `-0.075 × scrollY`. Nothing rotates, scales, or changes colour on scroll.
- **The type never fades.** Headline lift + fade stays off; the copy shifts a
  few pixels and holds full opacity throughout.
- **Centred, and larger than §6 allows.** The art is vertically centred in the
  hero (lifted ~5% so it shares the copy's optical centre) at
  `clamp(340px, 52vw, 640px)` wide — roughly half the hero's height, not the
  ≤40% §6 sets for art that sits *beside or below* the words. Once the
  headline runs *through* the painting, that ceiling no longer applies; the
  scrim is what protects the type. This size and placement are part of the
  exception, not a licence to grow the art elsewhere.
- **Legibility is engineered, not hoped for.** A white scrim sits between the
  art and the copy so the headline never competes with the painting. It holds
  meaningful coverage down to ~76% — past the CTA row — and releases below, so
  the art's detailed lower edge stays unwashed. **Re-check the scrim whenever
  the art is resized or moved**; the type band and the gradient stops must
  stay aligned.
- **Reduced motion is a hard gate**, not a softening. Under
  `prefers-reduced-motion: reduce` the hero renders as a plain static
  composition: no listeners bound, no transforms written, text at full
  opacity. The server-rendered markup *is* the static version, so this is also
  what everyone sees before hydration.

Implementation: `components/marketing/hero-parallax.tsx`, ported from
`design/hero-parallax-prototype.html`. The factors above are the prototype's
`data-parallax` values folded with its default depth of 1.25.

> **Also amended by v2.2:** §3 says the hero headline has "no colour change".
> The hero now sets line 2 in `--fonda-accent` (two-tone). That is intentional
> and counts against the screen's 2–3 accent budget — the hero spends two (the
> eyebrow dot and the headline line), so add no further accent there.

---

## 8. Quick reference

```
FONT:      Geist (all) · Geist Mono (eyebrows/labels)
BG:        #FFFFFF page · #F6F6F4 panels · #0A0A0A ink sections
TEXT:      #0A0A0A primary · #5B5B58 secondary · #6F6F6A muted (AA — was #9C9C97)
ACCENT:    #1B3BB3 navy signal (max 2–3 per screen) · hover #152E8C
BORDERS:   #E8E7E3 hairline · #DCDBD6 inputs/buttons
RADIUS:    10px buttons · 16px cards · 28px CTA band · 100px badges only
HEADLINES: Geist 600, negative tracking, no serif, no italic
BUTTONS:   ink (dark) default · accent (navy) when action is the signal
SHADOW:    none at rest; soft on hover only
LIGHT ONLY
```
