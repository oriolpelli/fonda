# Fonda — Design Identity & System Specification
> Feed this entire document to Claude Code before making any UI changes.
> Every value here is intentional. Do not deviate without explicit instruction.

---

## 1. Design Philosophy

Fonda is an AI tool for boutique hotel owners who are taste-makers — people who chose craft over scale. The design must feel like **the product belongs on their front desk**, not in a Silicon Valley dashboard.

**Three words to hold while designing:** Calm. Intelligent. Boutique.

**Core references:**
- **withjulienne.com** — pure white, editorial serif headlines, hand-drawn illustrations, generous whitespace, warm off-white cards, clean pill CTA
- **sana.ai** — bold confident typography at large scale, minimal nav, clean feature sections with product screenshots, dark pill CTA

**What to avoid:**
- Dark mode (Fonda is light-only)
- Blue/purple/neon AI color clichés
- Excessive gradients or glassmorphism
- Dashboard-like density or information overload
- Corporate SaaS feel

---

## 2. Color System

All colors use CSS custom properties. Define these in `:root`. Never use hard-coded hex values in component CSS — always reference variables.

```css
:root {
  /* Backgrounds */
  --bg:           #FAFAF8;   /* Page background — warm near-white, never pure white */
  --bg-surface:   #F4F2EE;   /* Cards, panels, input backgrounds */
  --bg-inset:     #EDEAE4;   /* Pressed states, inner wells */
  --bg-white:     #FFFFFF;   /* Overlays, modals only */

  /* Borders */
  --border:       #E2DDD5;   /* Default border — warm, not gray */
  --border-light: #EDEAD4;   /* Subtle dividers */
  --border-focus: #1E3A5F;   /* Input focus ring */

  /* Text */
  --text:         #1C1915;   /* Primary text — warm near-black */
  --text-2:       #6B6057;   /* Secondary text, labels */
  --text-3:       #A09488;   /* Muted/placeholder text */
  --text-inv:     #FAFAF8;   /* Text on dark backgrounds */

  /* Accent — Navy (deep, refined, boutique hospitality) */
  --accent:       #1E3A5F;   /* Primary action color */
  --accent-hover: #162D4A;   /* Hover state */
  --accent-light: #EBF1F8;   /* Tinted background for accent areas */
  --accent-text:  #1E3A5F;   /* Text on accent-light backgrounds */

  /* Ink — for Sana-style bold dark CTAs and elements */
  --ink:          #1C1915;   /* Dark pill buttons, bold UI elements */
  --ink-hover:    #2E2A24;   /* Ink hover */

  /* Semantic */
  --success:      #4A8C5C;
  --warning:      #C8944A;
  --error:        #C84A4A;
}
```

### Color Usage Rules
- **`--bg`** is the default page background. Never use pure `#FFFFFF` for the page.
- **`--bg-surface`** for all cards and panels — gives depth without shadow.
- **`--accent`** only for primary CTAs, active states, and key highlights. Max 2–3 uses per screen.
- **`--ink`** for pill-style dark buttons (like Sana's "Book an intro"). Use as an alternative CTA style.
- Text should always be `--text` on `--bg` or `--bg-surface`. Never use pure black `#000`.

---

## 3. Typography

### Font Families
```css
/* Import in <head> */
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

:root {
  --font-serif:  'Playfair Display', Georgia, serif;
  --font-sans:   'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

> **Why Playfair Display over DM Serif Display:** Playfair has more editorial weight at large sizes — closer to what Julienne uses. The "D" and "d" letterforms are more distinctive and warm.

### Type Scale
```css
:root {
  /* Display — hero headlines only */
  --text-display-xl: clamp(52px, 7vw, 96px);   /* Hero H1 */
  --text-display-lg: clamp(40px, 5vw, 72px);   /* Section headlines */
  --text-display-md: clamp(28px, 3.5vw, 48px); /* Sub-section heads */

  /* UI Text */
  --text-xl:   22px;   /* Large body / pullquotes */
  --text-lg:   18px;   /* Body text, descriptions */
  --text-base: 16px;   /* Default UI text */
  --text-sm:   14px;   /* Labels, secondary info */
  --text-xs:   12px;   /* Captions, fine print */
  --text-2xs:  11px;   /* Tags, badges, eyebrows */

  /* Line heights */
  --leading-tight:   1.05;  /* Display headlines */
  --leading-snug:    1.25;  /* Sub-headlines */
  --leading-normal:  1.6;   /* Body text */
  --leading-relaxed: 1.75;  /* Long-form text */

  /* Letter spacing */
  --tracking-tight:   -0.025em;  /* Display headlines */
  --tracking-normal:  -0.01em;   /* Sub-headlines */
  --tracking-wide:    0.04em;    /* Small caps, labels */
  --tracking-widest:  0.12em;    /* Eyebrow tags */
}
```

### Typography Patterns

**Hero headline** — centered, Playfair, 96px, tracking -0.025em, line-height 1.05:
```
Your hotel,
running itself.
```
The second line is always in *italic* — this is Fonda's typographic signature.

**Section headline** — left-aligned (in most sections), Playfair, 56–72px.

**Eyebrow label** — Inter, 11px, weight 500, tracking 0.12em, UPPERCASE, color `--text-3` or `--accent`. Always placed above a headline with 16px gap.

**Body text** — Inter, 17–18px, weight 400, color `--text-2`, line-height 1.7.

**Never use font-weight above 600 for Inter.** Playfair's boldness comes from the serif forms themselves — let the typeface do the work.

---

## 4. Spacing System

Based on an 8px grid. All padding, margins, and gaps must be multiples of 4px or 8px.

```css
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
  --space-32:  128px;
}

/* Section padding: 96px–128px top/bottom on desktop, 64px on mobile */
/* Content max-width: 1120px, centered, padding 0 48px */
/* Narrow content (text blocks): max-width 640px */
/* Card grid gap: 24px */
```

---

## 5. Component Specifications

### 5.1 Buttons

**Primary — Navy pill:**
```css
.btn-primary {
  background: var(--accent);
  color: var(--text-inv);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: 12px 28px;
  border-radius: 100px;   /* Full pill shape */
  border: none;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
```

**Secondary — Ink pill (Sana-style dark button):**
```css
.btn-ink {
  background: var(--ink);
  color: var(--text-inv);
  /* All other properties same as .btn-primary */
  border-radius: 100px;
  padding: 12px 28px;
}
.btn-ink:hover { background: var(--ink-hover); transform: translateY(-1px); }
```

**Ghost — outlined:**
```css
.btn-ghost {
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 11px 24px;
  font-size: 15px;
  font-weight: 400;
  transition: all 0.2s;
}
.btn-ghost:hover { color: var(--text); border-color: var(--text-3); }
```

> **Rule:** All buttons are pill-shaped (border-radius: 100px). No square or slightly-rounded buttons. This is critical to the visual identity.

### 5.2 Cards

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;           /* Generous rounding, like Julienne's cards */
  padding: var(--space-10);      /* 40px */
  transition: box-shadow 0.2s;
}
.card:hover {
  box-shadow: 0 4px 24px rgba(28, 25, 21, 0.06);
}
```

**No box-shadow by default.** Shadow only on hover. Cards feel flat and clean at rest.

### 5.3 Navigation

```css
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 64px;
  background: rgba(250, 250, 248, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s;
}
nav.scrolled {
  border-bottom-color: var(--border);
}
```

- Logo: **Playfair Display**, 20px, weight 400 (not bold — Julienne's logo is refined, not heavy)
- Nav links: Inter, 14px, weight 400, color `--text-2`. Hover: `--text`
- CTA in nav: `.btn-ink` at reduced padding: `padding: 8px 18px; font-size: 13px`
- No underlines, no heavy font weights in nav

### 5.4 Inputs / Forms

```css
.input {
  width: 100%;
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 13px 18px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}
.input::placeholder { color: var(--text-3); }
.input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-light); }
```

### 5.5 Tags / Badges / Eyebrows

```css
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 16px;
}

.badge {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-2);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 5px 12px;
}

.badge-accent {
  background: var(--accent-light);
  color: var(--accent-text);
  border-color: transparent;
}
```

---

## 6. Illustration System

### Style: Pencil Sketch + Watercolor Wash
Inspired directly by Julienne's hand-drawn kitchen objects (the saucepan, the blender). These illustrations add warmth and humanity to what would otherwise be a sterile AI product page.

**For Fonda, the illustration subjects are hotel objects:**
- A hotel room key (old-style brass key with tag)
- A morning coffee cup (ceramic, steam wisps)
- A notepad/briefing sheet with handwritten marks
- A small envelope (for the email feature)
- A bedside alarm clock
- A handbell (concierge bell)
- A room number plate

### SVG Illustration Specification
All illustrations must be SVG for sharpness at all scales. Render as inline SVG or `<img src="illustration.svg">`.

**Visual style rules:**
1. **Line work:** 1.5–2px stroke, `stroke-linecap: round`, `stroke-linejoin: round`. Color: `#3D3528` (warm dark, not pure black)
2. **Fill:** Very light watercolor washes — low-opacity fills (10–25% opacity) in warm tones: cream `#F0EDE8`, amber `#E8C99A`, warm gray `#D4CFC8`
3. **No perfect geometry** — slight imperfection in lines (use SVG paths with gentle wobble, not perfect rectangles)
4. **Shadow:** A single soft drop shadow under the object using a light warm ellipse
5. **Size:** Illustrations are decorative — 160px–280px wide, placed at section edges or corners, never center-stage
6. **Placement:** Bottom-right of sections (like Julienne), or floating beside content. Never blocking text.

**SVG Template — Coffee Cup illustration:**
```svg
<svg width="200" height="220" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Steam wisps -->
  <path d="M85 45 C83 38, 88 32, 85 25" stroke="#3D3528" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <path d="M100 40 C98 33, 103 27, 100 20" stroke="#3D3528" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <path d="M115 45 C113 38, 118 32, 115 25" stroke="#3D3528" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <!-- Cup body fill (watercolor wash) -->
  <path d="M72 55 C70 55, 68 130, 72 145 C76 155, 124 155, 128 145 C132 130, 130 55, 128 55 Z" fill="#F5EDE8" opacity="0.6"/>
  <!-- Cup body outline -->
  <path d="M72 55 C70 55, 68 130, 72 145 C76 155, 124 155, 128 145 C132 130, 130 55, 128 55 Z" stroke="#3D3528" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Handle -->
  <path d="M128 80 C148 80, 152 95, 152 105 C152 115, 148 130, 128 130" stroke="#3D3528" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <!-- Saucer fill -->
  <ellipse cx="100" cy="165" rx="52" ry="10" fill="#E8C99A" opacity="0.3"/>
  <!-- Saucer outline -->
  <ellipse cx="100" cy="165" rx="52" ry="10" stroke="#3D3528" stroke-width="1.5"/>
  <!-- Shadow -->
  <ellipse cx="100" cy="190" rx="48" ry="8" fill="#3D3528" opacity="0.06"/>
</svg>
```

**SVG Template — Hotel Key illustration:**
```svg
<svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Key ring -->
  <circle cx="60" cy="90" r="32" stroke="#3D3528" stroke-width="1.8" fill="#F5EDE8" fill-opacity="0.4"/>
  <circle cx="60" cy="90" r="20" stroke="#3D3528" stroke-width="1.5" fill="none"/>
  <!-- Key shaft fill -->
  <rect x="88" y="85" width="118" height="10" rx="5" fill="#E8C99A" opacity="0.5"/>
  <!-- Key shaft -->
  <path d="M88 85 L206 85 M88 95 L206 95" stroke="#3D3528" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Key bit 1 -->
  <path d="M170 95 L170 112" stroke="#3D3528" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Key bit 2 -->
  <path d="M185 95 L185 108" stroke="#3D3528" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Key bit 3 -->
  <path d="M200 95 L200 105" stroke="#3D3528" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Shadow -->
  <ellipse cx="140" cy="160" rx="80" ry="8" fill="#3D3528" opacity="0.05"/>
</svg>
```

### Where to Place Illustrations
| Page section         | Illustration           | Position              | Size   |
|---------------------|------------------------|-----------------------|--------|
| Hero                | Morning coffee cup     | Bottom-right, floating | 180px  |
| Problem section     | Notepad/briefing sheet | Bottom-right corner   | 200px  |
| Email feature       | Envelope               | Right side, mid-float  | 160px  |
| Morning briefing    | Alarm clock            | Left corner           | 170px  |
| Check-in feature    | Concierge bell         | Right corner          | 150px  |
| AI Chat feature     | Hotel key              | Bottom-right          | 220px  |
| CTA / footer        | Coffee cup + key pair  | Right side            | 200px  |

---

## 7. Layout Principles

### Page Structure
```
nav (fixed, 64px tall)
└── hero section (100vh, centered content)
└── logo/trust bar (full-width, 60px tall)
└── section (max-width: 1120px, margin: 0 auto, padding: 96px 48px)
    └── [section-label eyebrow]
    └── [section headline — left or centered]
    └── [content — grid or prose]
└── ... more sections
└── cta section (full-width, centered)
└── footer (max-width: 1120px)
```

### Grid System
- **2-column:** `grid-template-columns: 1fr 1fr; gap: 24px`
- **3-column:** `grid-template-columns: repeat(3, 1fr); gap: 24px`
- **Feature layout (text + preview):** `grid-template-columns: 5fr 7fr; gap: 64px`
- **Stats row:** `grid-template-columns: repeat(4, 1fr)` with dividers between

### Hero Layout (Critical)
```
[centered column, max-width: 760px]
  [eyebrow label]             ← 11px caps, --text-3, 24px below nav
  [H1 headline]               ← Playfair, 80–96px, centered, italic second line
  [subheadline]               ← Playfair italic, 28–32px, --text-3, 16px below H1
  [body text]                 ← Inter, 18px, --text-2, 600px max-width, 24px below sub
  [CTA row]                   ← flex center, gap 12px, 40px below body
    [btn-ink "Get early access"]  [btn-ghost "See how it works →"]
[illustration]                ← absolute-positioned, bottom-right of hero, 180px
```

**Hero background:** `--bg` only. No gradients. Julienne and Sana both use totally flat white/off-white backgrounds. The typography IS the design.

---

## 8. Motion & Interaction

Keep motion minimal and purposeful — never decorative.

```css
/* Global transition defaults */
* { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

/* Link/button hover */
a, button { transition: all 0.2s; }

/* Card hover */
.card { transition: box-shadow 0.25s, transform 0.25s; }
.card:hover { transform: translateY(-2px); }

/* Page entrance (use IntersectionObserver) */
.fade-up {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s, transform 0.5s;
}
.fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**No:**
- Spinning logos
- Parallax effects
- Auto-playing videos or animations
- Scroll-triggered color changes

---

## 9. Specific Page Sections

### Hero Section
```html
<section class="hero">
  <div class="hero-inner">
    <p class="eyebrow">AI for boutique hotels · Private beta</p>
    <h1 class="hero-headline">
      Your hotel,<br>
      <em>running itself.</em>
    </h1>
    <p class="hero-sub">The intelligence only chains could afford — until now.</p>
    <p class="hero-body">
      Fonda gives independent hotels an AI operations layer that handles the 
      daily grind — morning briefings, OTA emails, check-in chasing, and 
      live hotel data — in 90 seconds.
    </p>
    <div class="hero-actions">
      <a href="#waitlist" class="btn-ink">Get early access</a>
      <a href="#features" class="btn-ghost">See how it works →</a>
    </div>
  </div>
  <div class="hero-illustration" aria-hidden="true">
    <!-- SVG: morning coffee cup -->
  </div>
</section>
```

```css
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 48px 80px;
  position: relative;
  background: var(--bg);
}
.hero-inner {
  text-align: center;
  max-width: 760px;
}
.hero-headline {
  font-family: var(--font-serif);
  font-size: clamp(52px, 7vw, 96px);
  font-weight: 400;       /* Playfair is expressive at regular weight */
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0 0 16px;
}
.hero-headline em {
  font-style: italic;
  /* No color change — italic is enough. Julienne's approach. */
}
.hero-sub {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(20px, 2.5vw, 28px);
  color: var(--text-3);
  margin-bottom: 24px;
  line-height: 1.3;
}
.hero-illustration {
  position: absolute;
  bottom: 60px;
  right: 80px;
  width: 180px;
  opacity: 0.85;
  pointer-events: none;
}
```

### Trust / Logo Bar
```css
.trust-bar {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 20px 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  background: var(--bg);
}
.trust-label {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.trust-badge {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  padding: 4px 14px;
  border: 1px solid var(--border);
  border-radius: 100px;
}
```

### Feature Section (Sana-style tabs with preview)
The features section uses a left-column list of clickable items + right-side sticky preview. On click, the preview updates.

```css
.features-grid {
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: 64px;
  align-items: start;
}
.feature-tab {
  padding: 20px 24px;
  border-radius: 16px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.feature-tab:hover { background: var(--bg-surface); }
.feature-tab.active {
  background: var(--bg-surface);
  border-color: var(--border);
}
.feature-tab h4 {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}
.feature-tab p {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.6;
}

.feature-preview {
  position: sticky;
  top: 88px;
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(28, 25, 21, 0.06);
}
.preview-titlebar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 6px;
}
/* macOS-style traffic lights */
.tl { width: 10px; height: 10px; border-radius: 50%; }
.tl-red { background: #FF5F57; }
.tl-yellow { background: #FEBC2E; }
.tl-green { background: #28C840; }
```

### Statistics Row
```css
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  margin-top: var(--space-16);
}
.stat-cell {
  padding: var(--space-10);
  border-right: 1px solid var(--border);
}
.stat-cell:last-child { border-right: none; }
.stat-number {
  font-family: var(--font-serif);
  font-size: 52px;
  font-weight: 400;
  color: var(--text);
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}
.stat-label {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.4;
}
```

### CTA Section
```css
.cta-section {
  background: var(--bg-surface);
  border-radius: 28px;
  padding: var(--space-32) var(--space-24);
  text-align: center;
  margin: 0 48px var(--space-32);
  position: relative;
  overflow: hidden;
}
/* Subtle texture: a very faint illustration in the corner */
.cta-section .bg-illustration {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 240px;
  opacity: 0.15;
  pointer-events: none;
}
.cta-headline {
  font-family: var(--font-serif);
  font-size: clamp(36px, 4.5vw, 64px);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--text);
  max-width: 600px;
  margin: 0 auto var(--space-4);
}
.cta-headline em { font-style: italic; }
```

---

## 10. Do's and Don'ts Checklist

| ✅ DO | ❌ DON'T |
|--------|---------|
| Use Playfair Display for all headlines | Use bold/heavy Playfair (weight 400 is enough) |
| Keep backgrounds `--bg` (#FAFAF8) | Use pure white `#FFFFFF` for page background |
| Make all buttons pill-shaped (border-radius: 100px) | Use rectangular or slightly-rounded buttons |
| Place illustrations at section edges/corners | Center illustrations or make them hero imagery |
| Use `--accent` navy sparingly (max 2–3x per page) | Use accent on every interactive element |
| Keep the italic second line in every hero headline | Make all headline lines the same style |
| Use Inter weight 400 or 500 for body | Use Inter 700+ (that's Sana's approach, not Fonda's) |
| Add `--bg-surface` cards with `border-radius: 20px` | Add heavy drop shadows to cards |
| Use fade-up entrance animations via IntersectionObserver | Use complex scroll-triggered parallax |
| Keep nav transparent until scrolled | Have a solid nav background on page load |
| Use warm grays (`--text-2`, `--text-3`) for secondary text | Use cool grays like `#999` or `#666` |

---

## 11. Responsive Breakpoints

```css
/* Mobile first */
/* xs: 0px default */
/* sm: 480px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px+ */

@media (max-width: 768px) {
  nav { padding: 0 20px; }
  .hero { padding: 100px 20px 60px; }
  .hero-headline { font-size: 42px; }
  .hero-illustration { display: none; } /* hide illustrations on mobile */
  section { padding: 64px 20px; }
  .features-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: 1fr 1fr; }
  .cta-section { margin: 0 16px var(--space-16); }
  .btn-primary, .btn-ink, .btn-ghost { width: 100%; justify-content: center; }
  .hero-actions { flex-direction: column; align-items: stretch; }
}

@media (max-width: 480px) {
  .stats-row { grid-template-columns: 1fr; }
  .hero-headline { font-size: 36px; }
}
```

---

## 12. File / Asset Naming Convention

```
/public
  /illustrations
    coffee-cup.svg
    hotel-key.svg
    notepad.svg
    envelope.svg
    alarm-clock.svg
    concierge-bell.svg
  /fonts
    (loaded via Google Fonts CDN — no local copies needed)
/src
  /styles
    tokens.css          ← CSS custom properties (Section 2 & 3 above)
    typography.css      ← Type scale and patterns
    components.css      ← Buttons, cards, inputs, badges
    layout.css          ← Grid, section, nav
    animations.css      ← fade-up, transitions
  /components
    Nav.jsx / Nav.tsx
    Hero.jsx
    TrustBar.jsx
    Features.jsx
    Stats.jsx
    CTA.jsx
    Footer.jsx
    Illustration.jsx    ← wrapper that accepts illustrationName prop
```

---

## 13. Quick Reference Card

```
FONTS:      Playfair Display (headlines) · Inter (body/UI)
BACKGROUND: #FAFAF8 (page) · #F4F2EE (cards) · #FFFFFF (modals only)
TEXT:       #1C1915 (primary) · #6B6057 (secondary) · #A09488 (muted)
ACCENT:     #1E3A5F (navy) · hover: #162D4A
INK:        #1C1915 (dark pill buttons)
BORDERS:    #E2DDD5
RADIUS:     100px (buttons) · 20px (cards) · 12px (inputs) · 28px (CTA box)
HEADLINES:  Playfair weight 400, always with italic second line
BUTTONS:    Always pill-shaped · navy OR ink · ghost for secondary
ILLUSTRATIONS: SVG pencil+watercolor, hotel objects, 160–240px, corner-placed
MOTION:     Subtle only — fade-up on scroll, translateY(-2px) on hover
LIGHT ONLY: No dark mode
```
