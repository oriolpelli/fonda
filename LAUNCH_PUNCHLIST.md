# Fondas — Pre-launch punch list

Everything deliberately shipped as a **placeholder or follow-up** during the Signal redesign, so nothing provisional goes live by accident. Grouped by urgency.

---

## 🔴 Must fix before launch

- [ ] **Social proof is fake.** `socialProof.*` in `dictionaries/{en,es,ca}.json` are placeholder quotes, names ("Name to confirm"), properties and metrics. Replace with real design-partner quotes, then **remove the visible "Placeholder" chip, the `border-dashed` logo outlines, and the `°`/"to confirm" markers** in `app/[lang]/page.tsx`. Also swap the 5 placeholder logo chips for real hotel logos.
- [ ] **Newsletter is inert by design.** The footer capture has no `<form>` and a `type="button"` submit. Before it collects anything: add a server action + **double opt-in + a privacy line** (guest/marketing email is PII under `CLAUDE.md`).
- [ ] **`NEXT_PUBLIC_SITE_URL` on preview/staging.** Without it, non-prod deploys emit canonicals + hreflang + JSON-LD `@id`s pointing at `https://fondas.app` (production). Set it per-environment. (Documented in `.env.example`.)
- [ ] **Run the real build + eyeball all locales.** `npm run build`, then check `/en`, `/es`, `/ca` render styled with hero, illustration, social proof, comparison, footer, mobile menu, pricing.
- [ ] **Confirm `hello@fondas.app` is monitored** — it's the pricing "Talk to us" `mailto:` and the JSON-LD contact.

## 🟡 Should do soon

- [ ] **Footer placeholder links.** ~9 still `href="#"` with the `°` marker (Pricing is already `#pricing`). Wire real hrefs as pages ship: About, Careers, Contact, Press, Help centre, Changelog, Cookies, Security, Integrations. A **`/contact` page** would also give the pricing CTA a real home.
- [ ] **Price single-source has three hand-synced copies.** `COMPANY.priceMonthly` feeds the marketing figure via `t()`, but **Stripe** and the `COMPANY.price` prose must be updated by hand when the price changes. Keep them in step.
- [ ] **Feature bento → real product crops.** The vignettes are decorative (Set A). For concrete proof, swap in real cropped screenshots of each of the four surfaces (audit #5) — especially check-in and chat, which have no showcase band.
- [ ] **Product showcase.** Replace the hand-built windows with a **real Morning-Brief screenshot** + optional 2-min demo video (audit #6).
- [ ] **Reduced-motion check on the parallax hero.** Verify it renders fully **static** under `prefers-reduced-motion: reduce` (no transforms, full-opacity text).
- [ ] **Hero final QA.** Confirm "The admin runs itself." holds one line on desktop, the villa is ~70vw and wider than the phrases, and the **navy headline line stays legible** over the larger illustration (deepen the scrim if it fights the pool).
- [ ] **OG image spot-check.** Confirm the 1200×630 card renders in Geist on a real Slack/X unfurl for all three locales.

## 🟢 Nice to have / later

- [ ] **Auth verify-email step:** add "Open Gmail / Outlook" provider shortcuts (audit #13).
- [ ] **Onboarding:** wrap in the split-screen brand panel and end on a "Connect your PMS & inbox" CTA into the dashboard (audit #14).
- [ ] **Comparison copy:** the "Late arrivals surface in the brief, not at the door" row is my wording, not yours — review it.
- [ ] **Site IA for SEO:** real `/features`, `/customers`, `/resources` pages so the broader "AI software for hotels" positioning has room (audit #16).
- [ ] **Sentry:** confirm it's configured for production (via `instrumentation.ts`, per `next.config.ts`).

---

## ✅ Done in this redesign

Hero repositioned to **"AI software for hotels"** (broadened off "independent") · **La Casa** watercolour hero + **scroll parallax** (two-tone headline, reduced-motion-safe) · **Set A vignettes** · how-it-works · features bento · email + brief showcase bands · ROI stats · "Status quo vs Fondas" comparison · grouped FAQ · flat **€199/property** pricing · multi-column footer · mobile nav · split-screen auth · progressive onboarding · SEO (OG image, JSON-LD, sitemap/robots, hreflang) · WCAG-AA contrast + focus rings + skip link · `FONDA_DESIGN_IDENTITY.md` amended (v2.1 illustration, v2.2 parallax, AA text-3).

_Design references: `design/vignettes.html` (vignette source of truth) · `design/la-casa-hero.html` · `design/hero-parallax-prototype.html` · `fonda-mobbin-audit.html` · `fonda-positioning-gtm.html`._
