# Fondas — Implementation Brief for Claude Code

_Everything needed to apply the new positioning, the Mobbin-audit fixes and the La Casa watercolour hero. Paste the prompts below into Claude Code in order._

---

## 0. How to use this

Open Claude Code in the Fondas repo. Paste **Prompt 0** first (it loads the guardrails), then paste **Prompts 1–11 one at a time**, letting each finish and lint clean before the next. The prompts are ordered by dependency and priority (the audit's "Now" items first).

The finished hero illustration is committed at **design/la-casa-hero.html** — Prompt 2 tells Claude Code how to extract it into a component.

---

## 1. New positioning (the "why")

Fondas is **not an inbox tool** — it's the **AI front office for independent hotels**: it drafts guest email, chases arrival times, delivers a morning brief, and answers anything about the property, learning the hotel once and running on top of the PMS. Full reasoning is in fonda-positioning-gtm.html; the copy to ship is below.

### Hero copy to ship (all three locales)

| Locale | Headline line 1 | Headline line 2 | Subhead |
|---|---|---|---|
| EN | The admin runs itself. | You run the hotel. | Fondas is the AI front office for independent hotels — it drafts your guest email, chases arrival times, briefs you every morning, and answers anything about your property. It learns your hotel once and works on top of the PMS you already run. |
| ES | La gestión se hace sola. | Tú llevas el hotel. | Fondas es la recepción con IA para hoteles independientes: redacta el correo de tus huéspedes, reclama las horas de llegada, te prepara un resumen cada mañana y responde cualquier cosa sobre tu alojamiento. Aprende cómo es tu hotel una vez y funciona sobre el PMS que ya usas. |
| CA | La gestió es fa sola. | Tu portes l'hotel. | Fondas és la recepció amb IA per a hotels independents: redacta el correu dels teus hostes, reclama les hores d'arribada, et prepara un resum cada matí i respon qualsevol cosa sobre el teu allotjament. Aprèn com és el teu hotel un cop i funciona sobre el PMS que ja fas servir. |

**Recommended eyebrow:** For independent hotel GMs · Private beta &nbsp; **Primary CTA:** Get early access &nbsp; **Secondary:** Book a demo (or keep "See how it works").

---

## 2. Prioritised change list (from the Mobbin audit)

| Area | Grade | Priority | Change |
|---|---|---|---|
| Social proof | D | Now | No evidence anyone uses it. Add design-partner quotes (name · role · property + one metric), a hotel-logo row, and a 'first 20 hotels' line. |
| Hero headline | B | Now | Undersells the product as an inbox tool. Adopt the new 'AI front office' positioning + copy (below). |
| Footer | D | Now | A 3-link footer looks like a side project. Build Product / Company / Resources / Legal columns + newsletter + wordmark. |
| Mobile nav | C | Now | Links vanish on phones with no menu. Add a mobile disclosure/sheet with the links + CTA. |
| Pricing | C | Now | 'Talk to us' button links to /signup and contradicts the €199 stat. Commit to the flat price + a real contact link. |
| Comparison | — | Soon | Add the deferred 'Status quo vs Fondas' section (Sana model) — sells the shift from the manual front desk. |
| Features bento | B | Soon | Motifs are sketches. Swap for real product crops or the new watercolour vignettes. |
| Product showcase | B | Soon | Single hand-built window. Use a real Morning-Brief screenshot + a 'watch the brief' play. |
| ROI stats | B | Soon | Numbers are unattributed. Attribute one to a pilot; reconcile the €199 stat with the pricing band. |
| SEO / OG / IA | C | Soon | No OG image, no structured data, thin site IA. Add OG, JSON-LD, sitemap/robots, hreflang; plan Features/Customers pages. |
| Accessibility | B | Soon | Verify AA contrast on muted text, focus rings, skip-link, heading order. |
| How it works | A | Later | Solid. Optionally add a small product peek per step + one CTA. |
| FAQ | A | Later | Solid. Add FAQPage JSON-LD for SEO. |
| Final CTA | A | Later | Clean ink band. Optionally add a secondary 'Book a demo'. |
| Auth (split-screen) | A | Later | Good. Add 'Open Gmail/Outlook' on the verify-email step. |
| Onboarding | B | Later | Progressive + summary. Wrap in the split-screen brand panel; end on a 'Connect PMS & inbox' CTA. |

Full detail per area is in fonda-mobbin-audit.html.

---

## 3. Assets

- **design/la-casa-hero.html** — the finished watercolour illustration (Scene A = hero, Scene B = second surface, Scene C = source for vignettes). Self-contained inline SVG; Prompt 2 extracts it.
- **Vignette set** — key, coffee, olive branch, lantern, olive pot, sun-lounger, sailboat, arch. Prompt 3 builds them from the hero's motifs.

---

## 4. The prompts — paste in order

### Prompt 0 — Context & guardrails — paste first

```text
You are working in the Fondas repo (Next.js 16 App Router, React 19, Tailwind CSS v4, Supabase). Before changing anything, read CLAUDE.md, AGENTS.md, README.md and FONDA_DESIGN_IDENTITY.md.

All UI must follow the v2 "Signal" identity: Geist + Geist Mono, a single cool-navy signal colour #1B3BB3 used sparingly (max 2–3 per screen), flat white cards with hairline borders, soft 10px corners, generous space, light only. No gradients, no dark mode, no second accent, no pill buttons.

Key facts:
- The marketing page is app/[lang]/page.tsx. Auth is app/[lang]/(auth). Onboarding is app/[lang]/onboarding.
- All copy lives in dictionaries/en.json, es.json and ca.json. es and ca are type-checked against en.json, so every new key MUST be added to all three locales with a translation, or the build breaks. The customer-facing product name is "Fondas".
- Use @supabase/ssr helpers correctly (server vs browser client). Never commit secrets or .env files.
- After every task, run npm run lint and fix what it reports. Do not add new dependencies without flagging first.

Confirm you have read FONDA_DESIGN_IDENTITY.md and understood the Signal rules, then wait for Task 1. Do the tasks one at a time, in order.
```

### Prompt 1 — Reposition the hero copy (en/es/ca)

```text
Reposition the hero from an "inbox tool" to the "AI front office for independent hotels". Do NOT touch layout yet — copy only.

In dictionaries/en.json, es.json and ca.json, set these hero keys (keep all three locales in sync):

EN  hero.headlineLine1: "The admin runs itself."
EN  hero.headlineLine2: "You run the hotel."
EN  hero.subhead: "Fondas is the AI front office for independent hotels — it drafts your guest email, chases arrival times, briefs you every morning, and answers anything about your property. It learns your hotel once and works on top of the PMS you already run."

ES  hero.headlineLine1: "La gestión se hace sola."
ES  hero.headlineLine2: "Tú llevas el hotel."
ES  hero.subhead: "Fondas es la recepción con IA para hoteles independientes: redacta el correo de tus huéspedes, reclama las horas de llegada, te prepara un resumen cada mañana y responde cualquier cosa sobre tu alojamiento. Aprende cómo es tu hotel una vez y funciona sobre el PMS que ya usas."

CA  hero.headlineLine1: "La gestió es fa sola."
CA  hero.headlineLine2: "Tu portes l'hotel."
CA  hero.subhead: "Fondas és la recepció amb IA per a hotels independents: redacta el correu dels teus hostes, reclama les hores d'arribada, et prepara un resum cada matí i respon qualsevol cosa sobre el teu allotjament. Aprèn com és el teu hotel un cop i funciona sobre el PMS que ja fas servir."

Also update meta.description in en.json (and provide es/ca equivalents) to lead with the new positioning:
EN meta.description: "Fondas is the AI front office for independent hotels: guest email drafted for your review, a morning brief before the desk opens, check-in times chased automatically, and plain-language answers about your hotel — on top of the PMS you already run."

Keep hero.eyebrow, hero.ctaPrimary and hero.ctaSecondary as they are. Run npm run lint.
```

### Prompt 2 — Add the La Casa watercolour hero illustration

```text
The file design/la-casa-hero.html contains a finished watercolour SVG illustration of the hotel (built earlier). It has:
- a hidden <svg width="0" height="0"> defs block with filters (ids: wc, wcHard, wcInk, grain, mottle, mottle2), gradients (skyG, seaG, poolG, skyMask, seaMask, fadeX) and reusable symbols/defs (villa, palm, cypress, olivepot, lantern, balusters, deckTile, frondL, frondD, clip* ids);
- three scene SVGs: Scene A (viewBox "0 0 900 600", the villa reflected in a still pool between two palms — the intended HERO), Scene B (viewBox "20 30 860 570", headland above a bay with an infinity pool), Scene C (entrance corner with bougainvillea, lanterns and a pool corner).

Task: extract Scene A plus every def/filter/gradient/symbol it references into ONE self-contained React server component at components/marketing/hero-illustration.tsx that exports <HeroIllustration/> rendering a single inline <svg> (no external files). IMPORTANT: prefix every def id to avoid collisions with the rest of the page, e.g. "wc" -> "hero-wc", and update all url(#…) references to match. Mark the root svg aria-hidden (it is decorative).

Then place <HeroIllustration/> in the hero of app/[lang]/page.tsx, following the illustration's own placement rules (documented at the bottom of design/la-casa-hero.html): under the headline + subhead + CTAs (you may replace or sit alongside the existing EmailDraftPreviewWindow — keep the strongest single visual), the art no more than ~40% of the hero's height, never behind the type, only one illustration per screen. Wrap it in the existing Reveal so it fades up, and make sure it collapses gracefully on mobile. Respect prefers-reduced-motion (already handled globally). Run npm run lint.
```

### Prompt 3 — Build the watercolour vignette set

```text
Create a small family of watercolour spot-vignettes that match the hero's style. Reuse the motifs already drawn inside design/la-casa-hero.html — pull the lantern, the olive pot and the arch out of Scene C — and add a room key, an espresso cup, an olive branch, a sun-lounger with a striped parasol, and a small sailboat.

Build components/marketing/vignettes.tsx exporting a <Vignette name="key|coffee|olive|lantern|lounger|sail|arch|olivepot" size={...}/> that renders each as an inline SVG at ~80–120px, flat on white, one navy accent maximum, in the same warm palette as the hero. Then use them:
- as the small icon at the top of each of the four feature bento tiles in app/[lang]/page.tsx (replace the current sketch FeatureMotif visuals, or sit above them);
- one in the new footer.
No dictionary changes. Run npm run lint. Note in a code comment that these are placeholders in the hero's style and may be repainted by an illustrator to final finish.
```

### Prompt 4 — Add a social-proof section (audit's #1 gap)

```text
Add a social-proof section immediately after the trust bar in app/[lang]/page.tsx. Two parts:
(a) a hotel-logo row: a Geist-Mono label ("Trusted by independents like…") + 4–6 clearly-marked PLACEHOLDER logos (neutral grey wordmark chips are fine) + a line "The first 20 hotels are onboarding now."
(b) a 3-card testimonial grid (Hex model): each card has a one-line quote, a name, a role, a property, and one metric rendered in navy. Fill with clearly-marked PLACEHOLDER content I can swap for real design-partner quotes later.

Flat white cards, hairline borders, one navy accent per card (the metric), per Signal. Add every new string to en.json, es.json and ca.json (keep in sync). Run npm run lint.
```

### Prompt 5 — Replace the footer with a real one (audit gap)

```text
Replace the thin footer in app/[lang]/page.tsx with a real multi-column footer. Columns: Product / Company / Resources / Legal. Use existing routes where they exist (/sample-brief, /privacy, /terms) and clearly mark the rest as placeholder links (#). Include: a newsletter email capture (non-functional placeholder, clearly commented), the LanguageSwitcher, a large FONDAS wordmark, one line of the value prop, and the copyright line. Keep it flat, hairline-ruled and light — NOT a dark mega-footer. Add all new labels to en.json, es.json and ca.json. Run npm run lint.
```

### Prompt 6 — Add a mobile navigation menu

```text
The top nav in app/[lang]/page.tsx hides its links below the md breakpoint with no replacement, so the nav is unusable on phones. Create a client component components/marketing/mobile-nav.tsx: a hamburger button that toggles a disclosure/sheet containing the same links (How it works, Features, FAQ, Sign in), the LanguageSwitcher, and the primary "Get early access" CTA. Wire it into the header, visible only below md; leave the desktop nav unchanged. Make it accessible: button with aria-expanded/aria-controls, close on Escape, return focus on close. Follow Signal styling. Run npm run lint.
```

### Prompt 7 — Reconcile the pricing story

```text
There is a conflict: the ROI stat row shows "€199 per property / month" while the pricing band says "Talk to us" and its button links to /signup. Commit to the flat price. In app/[lang]/page.tsx: keep the €199 stat; change the pricing band to state the flat per-property price clearly (e.g. headline stays "One flat price per property", add a visible "€199 / property / month — everything included" line) and point the button at a real contact — a mailto:hello@fondas… placeholder or a new /contact route stub — NOT /signup. Update the pricing.* copy in en.json, es.json and ca.json accordingly. Run npm run lint.
```

### Prompt 8 — Add a 'Status quo vs Fondas' comparison

```text
Add a comparison section (Sana model — the high-impact piece deferred earlier) before the FAQ in app/[lang]/page.tsx. Two columns:
- "The manual front desk": spreadsheets and inbox rules, replies written at midnight, arrival times chased by hand, missed arrivals, no morning picture.
- "With Fondas": every reply drafted for review, arrival times chased automatically, one morning brief before the desk opens, ask-anything answers from live data.
Hairline-ruled rows; a small navy check or emphasis on the Fondas column only; flat, light, per Signal. Add all rows/labels to en.json, es.json and ca.json. Run npm run lint.
```

### Prompt 9 — SEO, OpenGraph and structured data

```text
SEO pass. (1) Add an OpenGraph/Twitter image: create a Signal-styled public/og.png (or a clearly-marked placeholder) and wire openGraph.images + twitter.card in the metadata in app/[lang]/layout.tsx, with locale-correct values. (2) Add JSON-LD structured data on the marketing page: Organization, SoftwareApplication (or Product), and FAQPage built from the FAQ copy. (3) Add app/sitemap.ts and app/robots.ts. (4) Verify hreflang alternates for en/es/ca via metadata.alternates.languages. Run npm run lint and npm run build.
```

### Prompt 10 — Accessibility pass

```text
Accessibility. (1) Audit muted/eyebrow text: #9C9C97 on white fails WCAG AA at small sizes — darken it or increase size where used for readable content (keep it only for truly decorative labels). (2) Ensure a visible focus-visible ring on every link, the FAQ <summary> elements, the language switcher and the mobile-nav trigger. (3) Add a skip-to-content link in app/[lang]/layout.tsx. (4) Confirm exactly one <h1> per page and sequential heading order on the marketing page. Run npm run lint.
```

### Prompt 11 — Verify and finish

```text
Final verification. Run npm run lint and npm run build and fix anything they report (remember es/ca must match en.json exactly). Then run npm run dev and confirm that /en, /es and /ca all render fully styled with: the new hero copy, the La Casa illustration, the social-proof section, the comparison, the new footer, the mobile menu, and the reconciled pricing. If the dev server ever renders with NO styling (serif font, no layout), that is a CSS pipeline issue, not these changes — stop the server, run: rm -rf .next && npm run dev, and hard-refresh. Report anything you could not complete.
```

---

## 5. Guardrails recap

- Follow **FONDA_DESIGN_IDENTITY.md** (Signal): Geist type, one navy #1B3BB3 signal, flat white cards, hairline borders, light only.
- **en/es/ca dictionaries are type-checked against en.json** — always add new keys to all three.
- Run **npm run lint** after each task; **npm run build** at the end.
- Never commit secrets. Don't add dependencies without flagging.
- Customer-facing name is **Fondas**.
