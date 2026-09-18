# B3 — Landing page: inbox-first hero + fragmentation story

Paste the **Session kickoff prompt** (from EXECUTION_PLAYBOOK.md) first, then this.

---

Task B3 — reposition the marketing landing page (`app/[lang]/page.tsx`) per
`MARKET_STRATEGY.md` §2.1 and `ROADMAP.md` v2 §0.2.

**Brand name is "Fondas"** (decided in B2 — do NOT write "Fonda" as the product
name; the design system is separately named "Signal").

Positioning: *"Fondas runs your hotel's front-office admin — the inbox, the
morning, the chasing — no matter which PMS you use."* Lead with the email
assistant; the briefing is the emotional hook but framed as one output of Fondas
knowing your hotel, not the product.

## Current state (already in the repo — reuse, don't reinvent)

- `app/[lang]/page.tsx` (267 lines): Nav → Hero (centered, `BriefingPreviewWindow`)
  → Trust bar (`INTEGRATIONS = ["MEWS","Apaleo","Gmail"]`) → Features
  (`FEATURES` from `lib/features.ts`, two-col with briefing preview) → ROI stats
  (4 `STATS`) → dark CTA → Footer.
- Preview component: `components/marketing/briefing-preview-window.tsx` — it
  provides the "app window chrome." **Mirror it** to build the new
  `EmailDraftPreviewWindow`.
- Copy lives in dictionaries: `dictionaries/en.json`, `es.json`, `ca.json`,
  loaded via `loadDictionary` / `dict.*`. Every string on the page is a dict key.
- Feature source of truth: `lib/features.ts` (`FEATURES` array). Reorder here.
- Design constraints: `FONDA_DESIGN_IDENTITY.md` — keep the two-line headline
  rhythm (§3), Geist, the single navy accent, soft corners, light only.

## Steps

1. **Hero** — rewrite `dict.hero.headlineLine1/Line2` + `subhead` in all three
   languages to lead with the inbox + morning bundle and the buyer (the GM),
   never the technology. No "AI" in the headline; the word may appear at most
   once on the whole page, factually. Keep the two-line rhythm.
2. **New first visual** — build `components/marketing/email-draft-preview-window.tsx`
   mirroring `BriefingPreviewWindow`'s chrome: show a guest email with a ready
   drafted reply. Place it as the hero's product visual (email draft first),
   with the existing `BriefingPreviewWindow` following it lower on the page.
3. **Feature order** in `lib/features.ts` and the features section: email
   assistant first, briefing second, check-in chasing, chat.
4. **Bundle section** — add a quiet "one layer, not six subscriptions" block: a
   3×2 grid of the jobs Fondas bundles (guest replies, morning brief, ETA
   chasing, ask-anything, pre-arrival messages, daily signal). No competitor
   names on the public site.
5. **Integrations stay honest** — MEWS, Apaleo, Gmail only (the existing
   `INTEGRATIONS` array). Don't add Outlook/Booking.com/SiteMinder yet.
6. **Stats** — keep the four-stat section but reframe around inbox + morning
   (time in inbox, brief at 6:30, one price €199 — no invented precision).
7. **i18n** — all new/changed copy in en + es + ca, same quality in all three.
   Write the Spanish and Catalan as a native hotelier would say it, not literal
   translation.

Run `npm run lint`. In your summary, show me the three hero variants (en/es/ca)
so I can approve the copy.

## Acceptance check

Open `/es` — hero reads inbox-first in natural Spanish; the first product visual
is the email draft (not the briefing); no unshipped integrations named.

Then tick B3 `- [x] Done` in EXECUTION_PLAYBOOK.md.
