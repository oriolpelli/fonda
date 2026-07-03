# FONDAS — Design Polish Brief ("Signal v3")

_Draft 1 July 2026. Feed this to Claude Code **together with** `FONDA_DESIGN_IDENTITY.md`
before a visual-polish pass. This does **not** replace the v2 "Signal" tokens — it
layers execution polish on top to reach the Sana-level refinement Oriol is after.
Reference: sanalabs.com (calm, confident, type-led, generous space, real product
imagery, tasteful depth)._

---

## 0. The gap (why it currently reads "basic")

The token system is already right. What's missing is execution:

1. **Placeholder imagery instead of real product shots** — the biggest tell. Sana's pages are carried by beautiful screenshots; ours use striped/placeholder blocks.
2. **Type isn't ambitious enough** — headlines should be much larger and more confident.
3. **Not enough whitespace** — sections feel dense; Sana breathes.
4. **Too flat** — a little tasteful depth on imagery/elevated surfaces adds richness.
5. **No motion** — Sana has quiet scroll-reveal and smooth micro-interactions.

Fixing these five, without changing the palette or fonts, closes most of the gap.

---

## 1. Type — make it carry the page

Push scale and confidence. Geist, negative tracking, weight 600 for display.

```
Hero H1      clamp(52px, 7vw, 92px)   weight 600  line 1.00  tracking -0.035em
Section H2   clamp(32px, 4.5vw, 58px) weight 600  line 1.05  tracking -0.025em
Sub-head     clamp(26px, 3vw, 40px)   weight 600
Lead text    20–22px  weight 400  color text-2  max-width ~560px
Body         16–17px  line 1.6
Eyebrow      12–13px  Geist Mono  uppercase  tracking .14em
```

- Hero headline is **two short lines**, left-aligned, no color change — the line break is the rhythm.
- One idea per section, stated big. Don't decorate around the type.

---

## 2. Space — let it breathe

```
Section padding   112–160px top/bottom desktop · 64–80px mobile
Hero top space    generous; large gap between headline block and product visual
Content max-width 1120px · text columns ~60ch
Grid gaps         40–64px between major blocks
```

More air is most of the "premium" feeling. When in doubt, add space.

---

## 3. Product imagery — the highest-impact upgrade

Replace **every** placeholder/striped block with a **real, high-fidelity product
screenshot**.

- **Frame:** rounded **16–20px**, 1px hairline border (`--fonda-border`), soft
  shadow (see §4), optional faint top highlight.
- **Hero:** one large primary product visual (the dashboard or a morning brief),
  anchored below or beside the headline. A slight float/tilt is fine if subtle.
- **Feature sections:** alternate text and screenshot in a `5fr / 7fr` layout.
- **Backdrop:** a subtle tinted or faintly gradient panel behind key imagery adds
  depth without color noise.

> This is a **dependency**: the polish only lands with good screenshots. Plan to
> capture real shots from a nicely-seeded demo hotel (clean data, realistic names)
> once the Phase B pages look presentable — not lorem-ipsum states.

---

## 4. Depth — flat, but not lifeless

Introduce a small, tasteful shadow scale. Depth appears on **imagery and elevated
surfaces only** — form controls and quiet cards stay flat.

```
Imagery / floating panels   0 24px 60px -24px rgba(10,10,10,.18)
Card hover (lift)           0 12px 40px rgba(10,10,10,.06)
Rest cards / inputs         no shadow — hairline border only
```

---

## 5. Motion — quiet and purposeful

- **Scroll reveal:** fade + 12–16px rise, lightly staggered, via IntersectionObserver.
- **Transitions:** 0.18s ease on color/border/transform for links, buttons, tabs.
- **Hover:** subtle card lift; button color/opacity shift.
- **Never:** parallax, autoplay, spinning, scroll-jacking.

---

## 6. Color — one signal, a little warmth, dark for contrast

- Keep the **single navy signal** (`#1B3BB3`), max 2–3 uses per screen.
- Optional restrained warmth: a faint off-white or barely-there gradient wash on
  select sections. Base stays near-white.
- Use a **full-bleed dark "ink" band** for the primary CTA and footer — the
  high-contrast moment Sana uses to punctuate a page.

---

## 7. Micro-detail — the last 10% that reads as "expensive"

- Consistent radii: **10px** buttons · **16px** cards · **20px** imagery · 100px badges only.
- Hairline borders everywhere; never heavy 1px lines.
- Align baselines; consistent 8px-system gaps.
- Refined empty states for placeholder pages (Concierge/Analytics/Chat) — a small
  icon, a line of copy, and calm spacing, not a plain grey box.
- Real **favicon + Open Graph image** with the FONDAS wordmark.

---

## 8. Landing page — target structure

1. Sticky nav (blur over 82% page bg), **FONDAS** wordmark, links, ink CTA.
2. **Hero:** eyebrow · big two-line headline · lead subhead · primary + secondary
   CTA · trust row (logos — "soon" until pilots) · large product visual.
3. "Works with" row — **MEWS · Apaleo · Gmail** only (already fixed).
4. **Four feature sections** (brief, concierge, communications, chat) — each with a
   real screenshot, alternating sides.
5. Outcome/stats band (time saved, etc.).
6. Social proof / a pilot quote (once available).
7. **Dark CTA band.**
8. Clean footer (wordmark, links, legal, language switch).

---

## 9. App / dashboard polish

- Sidebar: refine the active state and spacing; consider quiet Geist Mono section
  labels; keep it calm.
- Dashboard cards: consistent radius/border, clear hierarchy, a touch of depth on
  the primary card only.
- Analytics (later phase): chart styling in the palette — thin axes, navy series,
  lots of whitespace, no gridline noise.
- Polished loading skeletons and empty states throughout.

---

## 10. How to implement (sequencing)

Run **after** Phase B and the rebrand are committed. Feed Claude Code this doc +
`FONDA_DESIGN_IDENTITY.md`, and do it in reviewable chunks:

1. Landing page (hero + type + spacing + first real screenshot).
2. Depth + motion pass.
3. Dashboard/app polish.
4. Swap in the remaining real screenshots.

Approve each chunk in the browser before moving on — same loop as the phases.
