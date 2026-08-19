# Fonda × Sana — Claude Code Implementation Prompt Pack

> **What this is.** A ready-to-paste sequence of prompts that drive Claude Code to
> implement the Fonda relaunch end to end — both the **warm visual redesign**
> (`FONDA_SANA_REDESIGN.md`) and the **new marketing voice**
> (`FONDA_MARKETING_VOICE.md`, applied in Phase 7.5). All three files live in the
> repo root. Paste **one phase at a time**, review the diff, let it lint/build,
> commit, then move on. Phases are ordered by dependency — Phase 1 (tokens)
> unblocks the visuals; Phase 7.5 swaps the approved copy into the dictionaries.
>
> **Ground rules baked into every prompt:** keep the `--fonda-*` token names
> (never rename them), keep the product name **Fondas** customer-facing, reference
> CSS variables instead of hard-coded hex, preserve accessibility and the
> server/client component boundaries, and run `npm run lint` before calling a phase
> done. Tailwind is **v4** (colors live in `globals.css` via `@theme` + CSS vars —
> there is no `tailwind.config` color file).

---

## How to run this pack

1. **Work on a branch.** Phase 0 creates `redesign/warm-sana`. Keep `main` clean.
2. **One phase per message.** Paste the fenced prompt for a phase, wait for Claude
   Code to finish, then **read the diff yourself** before accepting.
3. **Gate each phase** on: `npm run lint` clean, `npm run build` passing, and a
   quick visual check in `npm run dev`. Only then commit and continue.
4. **Screenshots are the real test.** After Phases 3–5 especially, look at the
   dashboard, chat, brief, and marketing hero against §1 (the Sana DNA) and §2
   (the fixes) of the design doc.
5. If a phase goes sideways, `git restore .` / `git checkout .` to reset just that
   phase — the previous phases are already committed.

**Verification commands** (this repo): `npm run lint` · `npm run build` ·
`npm run dev`. There's no UI test suite, so lint + build + eyeball is the gate.

---

## Phase 0 — Orientation, branch & authority swap

This one is essential and easy to overlook: `CLAUDE.md` currently tells Claude
Code that v2 "Signal" is the law. Until that's repointed, every later phase fights
an uphill battle.

```text
We're starting a visual redesign of the Fonda app, moving from the v2 "Signal"
look to a warm, Sana-AI-inspired look. The full spec is in the repo root at
FONDA_SANA_REDESIGN.md. Read that file completely before doing anything.

Do these setup steps only — no UI changes yet:

1. Create and switch to a new git branch: redesign/warm-sana

2. Update CLAUDE.md so the design authority points at the new system. In the
   "# Design" section:
   - Keep FONDA_DESIGN_IDENTITY.md referenced as background/history, but add
     FONDA_SANA_REDESIGN.md as the CURRENT, governing spec for the app, and state
     that where the two conflict, FONDA_SANA_REDESIGN.md wins for all app/product
     and marketing UI.
   - Update the one-line summary to the v3 warm system: Geist + Geist Mono; a
     neutral light grey #EEEEEE ground carrying deliberately warm surfaces,
     wells, borders and ink, with white cards floating on top; colorless chrome (no navy in
     nav/active-states/chips); color reserved for content (gradient hero cards +
     one accent inside data viz); soft-cornered 10px controls (no pills); slim
     icon-only left rail; light only.
   - Do NOT rename the design system or the product. Product stays "Fondas"
     customer-facing; CSS tokens stay prefixed --fonda-*; the token comments that
     say "Signal" can stay.

3. Confirm the app builds on this branch before we start: run npm run lint and
   npm run build and report any pre-existing failures (do not fix unrelated ones —
   just tell me).

Then stop and show me the CLAUDE.md diff and the build result.
```

**Acceptance:** on branch `redesign/warm-sana`; `CLAUDE.md` now cites
`FONDA_SANA_REDESIGN.md` as governing; baseline `lint`/`build` status reported.
Commit: `chore(design): branch + point CLAUDE.md at v3 warm spec`.

---

## Phase 1 — v3 tokens: neutral grey ground, warm material (the foundation)

The single highest-leverage change. Everything downstream inherits from it. The
exact palette is embedded here so there's zero ambiguity.

```text
Phase 1 — design tokens only. Implement §3 of FONDA_SANA_REDESIGN.md in
app/globals.css. Change ONLY the :root token block, the shadcn semantic mappings,
and the file header comment. Do not touch any component yet.

Replace the Fonda palette in :root with exactly these values (keep the --fonda-*
names — do not rename tokens):

  --fonda-bg:        #EEEEEE;   /* NEUTRAL light grey page ground (was #FFFFFF) */
  --fonda-surface:   #FFFFFF;   /* cards/panels float lighter than page */
  --fonda-surface-2: #F6F3EE;   /* nested wells, secondary panels, hover fills */
  --fonda-inset:     #E4E0D7;   /* pressed states, tracks, active-nav fill */
  --fonda-white:     #FFFFFF;
  --fonda-border:    #E2DDD3;   /* warm hairline */
  --fonda-border-2:  #D4CEC2;   /* stronger border (inputs, buttons) */
  --fonda-text:      #1C1A16;   /* warm near-black */
  --fonda-text-2:    #56534B;
  --fonda-text-3:    #6C685E;   /* muted — see AA gate below; do NOT lighten */
  --fonda-text-inv:  #FFFFFF;
  --fonda-accent:        #1B3BB3;  /* content/data accent ONLY — never in chrome */
  --fonda-accent-hover:  #152E8C;
  --fonda-accent-tint:   #E9ECF7;  /* cool tint for data contexts only */
  --fonda-ink:       #1C1A16;
  --fonda-ink-hover: #302C25;

Add these gradient tokens to :root:

  --grad-warm: linear-gradient(145deg,#F3A63A 0%,#EE9560 52%,#E0725C 100%);
  --grad-cool: linear-gradient(150deg,#3FB4D0 0%,#2F72D4 58%,#243B98 100%);
  --grad-sand: linear-gradient(150deg,#E9DCC4 0%,#D9C6A6 100%);

Note the page ground is NEUTRAL grey but everything sitting on it — surface-2,
inset, both borders, and the whole text/ink ramp — is deliberately WARM. That
contrast is the system; do not "correct" the warm tokens toward the neutral page.

Then repoint the shadcn semantic mappings so the whole component library inherits
the new ground without per-component edits:
  --background       -> var(--fonda-bg)
  --card             -> var(--fonda-surface)
  --popover          -> var(--fonda-white)
  --secondary        -> var(--fonda-surface-2)
  --muted            -> var(--fonda-surface-2)
  --muted-foreground -> var(--fonda-text-2)
  --accent           -> var(--fonda-inset)   (was --fonda-accent-light: decolor the generic accent)
  --accent-foreground-> var(--fonda-text)     (was the navy accent)
  --border           -> var(--fonda-border)
  --input            -> var(--fonda-border-2)
  --ring             -> var(--fonda-accent)   (focus ring may stay blue)

If --fonda-accent-light is still referenced anywhere in globals.css theme
mappings, remove it from chrome roles; leave the raw variable defined only if a
data component still imports it.

Update the header comment at the top of globals.css from the "Signal / white"
description to the v3 description: neutral grey ground, warm material.

ACCESSIBILITY GATE: --fonda-text-3 (#6C685E) must hit WCAG AA. Verify its contrast
on BOTH #EEEEEE (page) and #FFFFFF (card): need >=4.5:1 for normal text and >=3:1
for large/eyebrows. #6C685E clears both — 4.79:1 on #EEEEEE and 5.56:1 on white.

Do NOT substitute the values an earlier draft of the spec proposed: #7A766C
(3.90:1 on #EEEEEE) and its #736F65 fallback (4.32:1) BOTH fail normal text on
any non-white ground — the draft's "~4.5:1" figure was really the ratio on WHITE,
and moving the page off white costs roughly 0.75:1 of headroom. Muted text must
clear AA on the PAGE, not just on cards. Never lighten past #6C685E.

Tell me the ratios you computed.

Change nothing else. Show me the full globals.css diff.
```

**Acceptance:** page renders neutral light grey, cards read white/raised; no build
errors; `--fonda-text-3` AA ratios reported. Commit: `feat(design): v3 token
system — neutral grey ground, warm material`.

---

## Phase 2 — Cards, surfaces, inputs, skeletons

Now the primitives catch up to the new ground.

```text
Phase 2 — surface primitives. Per §6, §9, and §11 of FONDA_SANA_REDESIGN.md:

1. components/ui/card.tsx — make the card a raised white surface: background var
   --card (white), rounded-[18px], REMOVE the outer "border border-border", and add
   a resting whisper shadow:
     box-shadow: 0 1px 2px rgba(28,26,22,.04), 0 8px 24px rgba(28,26,22,.04);
   Deepen it slightly on hover. Keep the Card sub-components' padding as-is.

2. components/dashboard/stat-row.tsx — make the outer container a white card
   (var --card, rounded-[18px], the same resting shadow, NO outer border); keep the
   1px internal dividers between the four cells; keep numbers big/warm and eyebrows
   Geist Mono muted. It should read as one raised panel of four numbers.

3. components/ui/input.tsx and components/ui/textarea.tsx — field background is
   white (var --card / --fonda-surface) on the grey page; keep the focus state
   (accent border + 3px ring) but point the ring tint at --fonda-accent-tint
   (#E9ECF7) so it's cool-neutral, not the old bright pale blue.

4. components/ui/skeleton.tsx and every */loading.tsx under app/[lang]/dashboard —
   skeleton blocks become soft rounded greige (var --fonda-surface-2),
   rounded-[10px], low-contrast, gentle pulse — like Sana's "building..." state.

Reference CSS variables only; no hard-coded hex. Run npm run lint. Show me the
diffs for card.tsx, stat-row.tsx, and one loading.tsx.
```

**Acceptance:** cards float without borders; stat row is one raised panel; inputs
white with warm focus; skeletons soft greige. Commit: `feat(design): raised white
surfaces + warm inputs/skeletons`.

---

## Phase 3 — The slim icon rail (biggest structural change)

The most complex phase. Extra guardrails included. Consider doing this one in its
own Claude Code session so the context stays focused.

```text
Phase 3 — replace the dashboard sidebar with a slim icon-only rail. Implement §5
of FONDA_SANA_REDESIGN.md. Two files: components/dashboard/sidebar.tsx and
app/[lang]/dashboard/layout.tsx.

Target (desktop, md+):
- A fixed, full-height rail ~64px wide (w-16). Background var(--fonda-bg) (it is
  part of the ground) with no right border, or at most a 1px --fonda-border.
- Top: the Fonda mark as a solid near-black rounded square ~32px (no wordmark
  text), linking to /dashboard.
- Middle: the primary nav as a vertical stack of ICON-ONLY buttons, ~40px hit
  target, Lucide icons ~20px at strokeWidth={1.5}. Keep the existing ICONS map and
  nav item keys/order.
- Pinned bottom: the Settings gear, then an account button (small avatar/initials
  disc) that opens an account menu popover.

States — MONOCHROME, no navy anywhere:
- inactive: color var(--fonda-text-3)
- hover:    color var(--fonda-text); background var(--fonda-surface-2); rounded-[10px]
- active:   SOLID near-black icon (color var(--fonda-text)) on a var(--fonda-inset)
            fill, rounded-[10px]. NO accent tint, NO colored left-border bar.
- Keep aria-current="page" on the active item and the shared focus-visible ring.

Hover labels (we removed visible labels, so accessibility is mandatory):
- Every rail button gets aria-label={label} AND title={label}.
- Add a flyout tooltip on hover/focus: a small dark (var --fonda-ink) pill with
  white text to the RIGHT of the icon, ~150ms delay, rounded-[8px], Geist 13px.
  Keep it dependency-light (a group-hover CSS popover or a tiny local Tooltip; do
  NOT add a new npm dependency).

Relocate everything the old rail carried but the slim rail can't hold, into the
account-menu popover (a small white card, soft shadow, rounded-[12px]) opened from
the bottom avatar:
- connection status (keep deriveConnectionState logic; render as a quiet dot in the
  menu and/or overlaid on the gear),
- the LanguageSwitcher,
- the user email,
- the sign-out form/button.
Reuse the existing dict keys for all labels; add new keys only if strictly needed,
under the existing namespaces.

Badges (e.g. Communications "waiting" count): render as a small NEUTRAL dot/count
on the icon top-right (var --fonda-text on var --fonda-inset). Do not use the
accent unless it's a true alert; prefer neutral.

Coming-soon items: show muted with a small dot, and put the "coming soon" wording
in the hover label (keep driving them from lib/roadmap.ts).

Mobile: KEEP the current slim top-bar + slide-over drawer behavior and all its
a11y (role=dialog, aria-modal, focus trap, inert, Escape/scrim dismiss,
reduced-motion). In the drawer you MAY keep icon+label since there's room; restyle
to the warm tokens. Do not regress any of the existing keyboard/focus behavior.

layout.tsx: change the content offset from md:pl-64 to md:pl-16. Pass the relocated
meta (connectionState, connectionLabels, userEmail, signOutAction, signOutLabel,
locale, language switcher) into the rail so the account menu can render them.
Keep the max-w-[1120px] centered content and generous padding.

CONSTRAINTS: preserve the server/client boundary — icons stay looked-up by key
inside the client component (never passed as props from the server layout). Keep
stripLocale/isActive logic. Reference CSS vars only. Run npm run lint.

Show me the full sidebar.tsx and the layout.tsx diff, and describe how the hover
label + account menu behave.
```

**Acceptance:** 64px monochrome rail; hover flyout labels work by keyboard and
mouse; account menu holds connection/language/email/sign-out; mobile drawer
unchanged in behavior; no navy in the rail. Commit: `feat(nav): slim icon rail
with hover labels + account menu`.

---

## Phase 4 — Chat, Sana-style

```text
Phase 4 — restyle chat to the Sana pattern. Implement §8 of
FONDA_SANA_REDESIGN.md across components/dashboard/ask-your-hotel.tsx and
app/[lang]/dashboard/chat/page.tsx.

Message pattern:
- User message: right-aligned in a LIGHT greige bubble (var --fonda-surface-2),
  rounded-[16px], text color var --fonda-text, with a small round avatar to its
  right. (Change today's dark bg-primary user bubble to this light bubble.)
- Assistant message: PLAIN TEXT, left-aligned, NO bubble, NO background — just
  var --fonda-text prose at a comfortable measure. Optionally a tiny sparkle glyph
  before the first line. (Remove today's bg-muted assistant bubble.)

Status + chips:
- While working, show a quiet status line in var --fonda-text-3 with a small
  animated glyph ("Drafting reply...", "Reviewing today's arrivals..."), resolving
  to a muted "Done" when complete. Respect prefers-reduced-motion.
- Render tool/context lookups as small rounded chips (rounded-full, var --card,
  12-13px, small leading icon) — e.g. PMS/Gmail/guest context. Convert the existing
  draft hand-off ("draft created -> Communications") into one of these chips or a
  small result card, NOT an accent-tinted pill.

Result cards: when the assistant produces a concrete result (a draft, a
confirmation), render a small white result card (var --card, rounded-[16px], soft
shadow, leading icon + title + timestamp, hairline divider, key value, quiet
"Open ->" link). Neutral — no accent fill.

Composer: a soft white rounded field (var --card, rounded-[14px], --fonda-border-2
hairline, generous padding, placeholder var --fonda-text-3). A "+" affordance on
the left (attach/add context). On the right, a round near-black send button
(var --fonda-ink, rounded-full, white arrow-up icon) — this round icon-only button
is allowed and does not violate the no-pills rule.

Floating FAB: remove the big circular chat FAB and the accent-tinted header disc.
Replace the entry point with §8.5 option 1: keep /dashboard/chat as the full
surface (blank state = a centered composer with lots of air), and from other pages
offer a slim docked "Ask your hotel" bar at the bottom of the content column (a
rounded input-looking bar in var --fonda-ink or a quiet outline) that opens the
chat panel / navigates to the page — not a floating circle.

Keep the existing streaming logic (fetch + reader + DRAFT_SENTINEL handling) intact
— only the presentation changes. Reference CSS vars only. Run npm run lint. Show me
the diffs.
```

**Acceptance:** user = light bubble, assistant = plain text; status lines + chips
present; composer has round ink send; no circular FAB, no dark bubbles, no accent
header disc; streaming still works. Commit: `feat(chat): Sana-style messages,
chips, composer; drop FAB`.

---

## Phase 5 — Gradient content surfaces

```text
Phase 5 — introduce the gradient content layer. Implement §7 of
FONDA_SANA_REDESIGN.md.

1. Convert these flat panels into a SINGLE gradient hero card each (white text with
   a subtle dark scrim if contrast needs it, rounded-[20px], generous padding, no
   border, soft shadow):
   - components/dashboard/first-run-state.tsx
   - components/dashboard/empty-state.tsx
   - components/dashboard/setup-banner.tsx
   Use var(--grad-sand) or var(--grad-warm). Keep the existing CTA and copy.

2. Give the Morning Brief page header a warm-gradient hero (var --grad-warm) with
   the date + brief title — a literal sunrise. Files under app/[lang]/dashboard/
   brief (and components/dashboard/briefing-article.tsx if the header lives there).

3. Optional but on-brand: add a small colored circular avatar per row to
   inbox/concierge lists (components/dashboard/email-inbox.tsx,
   needs-reply-card.tsx) drawn from a small fixed warm palette; keep the row text
   and chrome neutral.

RULES: at most ONE gradient hero per screen; everything around it stays neutral
light grey / white; white text must pass WCAG AA against the lightest gradient
stop — note BOTH current gradients fail white text unaided (--grad-warm 2.03:1 at
its #F3A63A stop, --grad-sand 1.35:1 at #E9DCC4), so the scrim is mandatory (add
the scrim from §7.2 if needed). Reference the --grad-* tokens; no inline gradients
with raw hex. Run npm run lint. Show me the first-run-state and brief header diffs.
```

**Acceptance:** first-run/empty/setup are gradient heroes; brief has a warm hero;
one gradient per screen; text passes AA on gradients. Commit: `feat(design):
gradient hero/empty surfaces + brief hero`.

---

## Phase 6 — Data viz & the single accent

```text
Phase 6 — data viz discipline. Implement §10 of FONDA_SANA_REDESIGN.md.

In components/dashboard/occupancy-strip.tsx (and any chart/metric component):
- Use var(--fonda-accent) for exactly ONE meaningful series/marker; render
  everything else in neutral greys (gridlines var --fonda-border, labels
  var --fonda-text-3, values var --fonda-text).
- One live/highlight metric (e.g. today's occupancy) may use the accent as a number
  color or a single small filled tile — once per view, no more.
- Ensure NO accent leaks into nav, chips, links-in-chrome, or card outlines
  anywhere.

Reference CSS vars only. Run npm run lint. Show me the occupancy-strip diff and
point out where the single accent lands.
```

**Acceptance:** one accent per data view, rest neutral; no chrome accent leaks.
Commit: `feat(design): one-accent data viz`.

---

## Phase 7 — Marketing, auth, onboarding

```text
Phase 7 — extend the v3 ground to marketing, auth, and onboarding. Implement §12
of FONDA_SANA_REDESIGN.md.

- Move app/[lang]/page.tsx and components/marketing/* to the neutral light grey
  ground: sections that were pure white become grey with white FLOATING cards (rounded-[18-20px],
  soft shadow). Keep big Geist headlines, generous section padding, one-accent
  discipline, and the ink CTA band/footer.
- KEEP the La Casa hero watercolor + parallax (components/marketing/hero-parallax.tsx
  and hero-illustration.tsx). Re-check its white scrim against the grey ground so
  the hero-to-page transition stays clean; adjust the scrim stops if there's a seam.
- Keep the marketing wordmark (the icon-only rule is product-chrome only — marketing
  keeps "Fonda"/"Fondas" wordmark).
- Optional: add ONE gradient feature tile (§7) above the fold to introduce the
  product's warmth.
- components/auth/* and components/onboarding/* inherit the grey ground with white
  cards and warm tokens.

Do not change marketing copy or the parallax motion math — visual ground only.
Reference CSS vars. Run npm run lint. Show me the marketing hero + one feature
section diff.
```

**Acceptance:** marketing/auth/onboarding on the grey ground with floating white cards; hero
parallax intact with a clean scrim; wordmark kept. Commit: `feat(design): warm
ground for marketing, auth, onboarding`.

---

## Phase 7.5 — Marketing voice (the copy swap)

Design and voice ship on the same branch. This phase carries the **exact approved
strings** (repositioning Fonda from "AI front office" to **AI hotel manager**), so
Claude Code invents nothing — it just applies them by key across the three
dictionaries. The full rationale is in `FONDA_MARKETING_VOICE.md`.

```text
Phase 7.5 — marketing copy. Apply these EXACT strings to dictionaries/en.json,
dictionaries/es.json, and dictionaries/ca.json. Change ONLY the keys listed below,
use the exact text per language (do not translate, paraphrase, or "improve" any of
it), and touch no other key. Keep the informal tú/tu register, keep all JSON
structure and interpolation tokens ({year}) intact and valid, and add/remove no
keys.

hero.headlineLine1
  EN: You run the hotel.
  ES: Tú llevas el hotel.
  CA: Tu portes l'hotel.

hero.headlineLine2
  EN: Fonda runs the rest.
  ES: Fonda se encarga del resto.
  CA: Fonda s'encarrega de la resta.

hero.subhead
  EN: An AI manager for your hotel — it prices your rooms against the competition, drives upgrades and extras, sends guests offers tailored to their stay, and briefs you each morning. On top of the PMS you already run.
  ES: Un director con IA para tu hotel: ajusta tus tarifas según la competencia, impulsa mejoras y extras, envía a cada huésped ofertas a su medida y te prepara un resumen cada mañana. Sobre el PMS que ya usas.
  CA: Un director amb IA per al teu hotel: ajusta les teves tarifes segons la competència, impulsa millores i extres, envia a cada hoste ofertes a la seva mida i et prepara un resum cada matí. Sobre el PMS que ja fas servir.

hero.badge
  EN: The AI manager for hotels · Private beta
  ES: El director con IA para hoteles · Beta privada
  CA: El director amb IA per a hotels · Beta privada

meta.title
  EN: Fondas — The AI manager for hotels
  ES: Fondas — El director con IA para hoteles
  CA: Fondas — El director amb IA per a hotels

meta.description
  EN: Fondas is the AI manager for hotels: it prices your rooms against the competition, drives upgrades and extras, drafts guest email for your review, and briefs you each morning — on top of the PMS you already run.
  ES: Fondas es el director con IA para hoteles: ajusta tus tarifas según la competencia, impulsa mejoras y extras, redacta el correo de tus huéspedes para que lo revises y te prepara un resumen cada mañana, sobre el PMS que ya usas.
  CA: Fondas és el director amb IA per a hotels: ajusta les teves tarifes segons la competència, impulsa millores i extres, redacta el correu dels teus hostes perquè el revisis i et prepara un resum cada matí, sobre el PMS que ja fas servir.

footer.rights   (keep the {year} token exactly where it is)
  EN: © {year} Fondas. The AI manager for hotels.
  ES: © {year} Fondas. El director con IA para hoteles.
  CA: © {year} Fondas. El director amb IA per a hotels.

footer.valueProp
  EN: The AI manager for independent hotels.
  ES: El director con IA para hoteles independientes.
  CA: El director amb IA per a hotels independents.

auth.signupDesc
  EN: Your hotel's manager, working overnight.
  ES: El director de tu hotel, trabajando cada noche.
  CA: El director del teu hotel, treballant cada nit.

After editing, verify each file still parses as valid JSON (e.g. run
node -e "require('./dictionaries/en.json')" for each of the three), and confirm
git diff touches ONLY the keys above across the three files. Show me the diff for
all three.
```

**Acceptance:** the ten keys above updated identically across en/es/ca; all three
JSON files valid; diff limited to those keys. Commit: `feat(copy): reposition as AI
hotel manager — hero, subhead, anchor lines`.

> **Deferred (not in this phase):** the features/bundle sections still say "Four
> jobs. One calm morning." and list four capabilities — which undersells the
> revenue + guest-marketing scope. Expanding those is a separate content job (all
> three languages); do it as a follow-on when the words are ready.

---

## Phase 8 — Sweep, verify & QA

```text
Phase 8 — final sweep and verification. Implement §14 Prompt 8 of
FONDA_SANA_REDESIGN.md.

1. Grep the whole codebase for leftovers and fix each per the spec:
   - hard-coded whites: "#fff", "#ffffff", "bg-white", "text-white" used as a page
     or card ground (white text ON ink/gradient is fine — judge by context),
   - the old accent tint in CHROME: "--fonda-accent-light", "#ECEFFC", "#eceffc",
   - dark chat bubbles: "bg-primary" applied to a message bubble,
   - any navy/accent used in nav, active states, chips, or card borders.
   List every hit and what you changed before changing it.

2. Confirm the invariants: no navy appears in ANY chrome; cards are white on the
   neutral grey ground with no outer border; the rail is icon-only monochrome; chat has light user
   bubbles + plain assistant text; buttons kept soft 10px corners (no pills).

3. Run npm run lint and npm run build; both must pass.

4. Report a QA checklist against §1 (Sana DNA) and §2 (the fixes) for four screens:
   dashboard, chat, morning brief, marketing hero — tell me which items pass and
   which need a follow-up.

Show me the grep results, the build result, and the QA checklist.
```

**Acceptance:** grep clean, invariants hold, lint+build pass, QA checklist
returned. Commit: `chore(design): warm redesign sweep + QA`. Then open a PR from
`redesign/warm-sana`.

---

## Optional — single kickoff prompt (if you'd rather Claude Code self-drive)

If you'd prefer to hand the whole thing over in one go (less control, faster, more
risk), paste this instead of Phases 0–8 and let it work through them, pausing for
your review at each commit:

```text
Read FONDA_SANA_REDESIGN.md and this file's phase plan (FONDA_SANA_PROMPT_PACK.md)
in full. Implement the warm Sana redesign in the phase order defined there
(0 through 8), on a new branch redesign/warm-sana. After EACH phase: run npm run
lint and npm run build, commit with the message suggested for that phase, then
STOP and show me the diff and a one-paragraph summary before starting the next
phase. Follow all the ground rules: keep --fonda-* token names, keep "Fondas"
customer-facing, reference CSS variables (no hard-coded hex), preserve
accessibility and server/client boundaries, and keep soft 10px corners (no pills).
Start with Phase 0.
```

---

## Troubleshooting & rollback

- **A phase looks wrong:** `git restore .` (uncommitted) resets just that phase;
  earlier phases are safe because each was committed.
- **Everything looks too washed out / low-contrast after Phase 1:** the neutral
  grey ground (`#EEEEEE`) is correct — the fix is usually that a component still
  assumes a white page. That's what Phases 2–7 address; don't lighten the tokens.
- **Cards look flat / don't read as raised:** the page→card step is only 17 points
  (`#EEEEEE` → `#FFFFFF`, 1.16:1), so a borderless card rests entirely on that step
  plus its whisper shadow. If it doesn't lift, deepen `--fonda-shadow-card` —
  do **not** re-add card borders or lighten the ground back toward white.
- **Claude Code reverts to white ground / navy chrome:** it's still reading v2 as
  authority — re-run Phase 0's `CLAUDE.md` edit and re-state that
  `FONDA_SANA_REDESIGN.md` governs.
- **Contrast failures in Phase 8:** `--fonda-text-3` already ships at `#6C685E`
  (4.79:1 on `#EEEEEE`, 5.56:1 on white). If a checker still complains, darken
  further — never lighten, and never revert to the draft's `#7A766C` or `#736F65`,
  which fail normal text on any non-white ground. Add the §7.2 scrim under any text
  on a gradient (both gradients need it — neither passes white text unaided).
- **New dependency requested:** decline — the pack is designed to need none
  (tooltips and menus are hand-rolled, dependency-light).

---

## One-glance phase map

```
0  Branch + repoint CLAUDE.md to v3         chore(design): branch + v3 authority
1  v3 tokens: grey ground, warm material    feat(design): v3 token system
2  Cards/surfaces/inputs/skeletons          feat(design): raised white surfaces
3  Slim icon rail + account menu            feat(nav): slim icon rail
4  Sana chat (bubbles/chips/composer)       feat(chat): Sana-style chat
5  Gradient hero/empty + brief hero         feat(design): gradient surfaces
6  One-accent data viz                      feat(design): one-accent data viz
7  Marketing + auth + onboarding warm       feat(design): warm marketing
7.5 Marketing voice (copy swap, 3 langs)    feat(copy): reposition as AI hotel manager
8  Sweep + QA + PR                          chore(design): sweep + QA
```
