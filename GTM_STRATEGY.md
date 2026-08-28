# Fondas — Go-to-Market Strategy

_The single source of truth for market fit, positioning, pricing, pilot outreach, and the raise. Owner: Oriol · Last updated 26 August 2026 · Status: MVP built, pre-pilot, first outreach wave underway._

**This document replaces and consolidates** the ten planning docs that came before it — `GO_TO_MARKET.md`, `MARKET_STRATEGY.md`, `PILOT_OUTREACH.md`, `LAUNCH_PLAN.md`, `COMPETITOR_LANDSCAPE.md`, `Fondas_GTM_Strategy_Consolidated.docx`, and the two June `.docx` plans (Pilot Outreach, MVP Launch Plan). Product and engineering execution lives separately in `EXECUTION_PLAYBOOK.md` and the build roadmaps — this file is strategy, market, and go-to-market only.

> **Where you are on the calendar (26 Aug 2026):** the plan below is written from an Aug 1 standing start. As of today you are in the **Aug 24 – Sep 4 window** — the season is winding down, GMs are surfacing, and demos start to land. The `Fri 28 Aug` milestone (4+ demos done, 1 pilot onboarding) is this week. Judge the funnel in September, not on any single quiet August day.

---

## Executive summary

Fondas is an AI front-office layer for the general manager of an independent hotel. It connects to the property's PMS (MEWS today; Apaleo built but unproven — see §1.4) and to Gmail, and delivers four surfaces that work together: a **morning brief**, an **email assistant** that drafts guest replies in the hotel's voice, **check-in-time chasing**, and an **ask-anything hotel chat**. The MVP is built, wired end-to-end, deployed, and reliable enough to demo. What remains is to harden it commercially, prove product-market fit with three live pilots, and convert the first paying hotel.

**The five conclusions this document reaches:**

1. **Ship pilots now.** Every quarter the platforms iterate, the independent-layer window narrows. The MVP is good enough; perfection is the enemy.
2. **Lead with the inbox, not the brief.** The morning briefing is now a native PMS feature (Apaleo Copilot ships it; Mews will). The guest inbox is the surface no PMS copilot can see — that is the moat.
3. **Close the real gaps before charging, not before piloting.** Free pilots need only reliability and a clean demo. Billing, rate-limiting, a DPA, and Google verification are hard gates before the first euro — not before the first pilot.
4. **The biggest addressable-market lever is Outlook.** "We use Outlook" disqualifies plausibly half the ICP. Microsoft 365 support is likely worth more than a third PMS.
5. **Beat the VC's hardest question in advance.** "Why won't Mews / Apaleo / Otel eat you?" The answer is one crisp sentence: *different buyer, different surface (the inbox), different market (Spain / Southern-EU, ES/CA), one-fifth the price — and they validate the category.*

**The one-sentence verdict.** The market is real and fundable, the product is genuinely built, and the positioning is right — but the original wedge ("AI morning briefings") has been absorbed by the PMS platforms, PMF is still unproven (zero pilots live), and the go-to-market is starting from near-zero in the worst month of the year. This is a **conditional yes**: the winning position is *"the PMS-independent AI front-office layer for the independent GM, anchored on the inbox"* — not the briefing.

---

## Part 1 — Where Fondas stands today

### 1.1 The product in one line

> Fondas gives an independent hotel's GM their first 90 minutes back every morning — the inbox drafted, the day briefed, the arrivals chased, and any question answered — across whichever PMS they run, at a flat price a single owner can say yes to in one call.

### 1.2 What has actually been built (verified against the codebase)

This is not aspirational. Each item is present in the git history and the Supabase schema.

**The four core surfaces — all live:**

| Surface | What it does | State |
|---|---|---|
| **Morning brief** | Daily prose summary — arrivals, departures, VIPs, unconfirmed ETAs, things needing attention. Emailed at a configurable hour, in EN/ES/CA. History view retained. | Live |
| **Email assistant** | Reads guest email in Gmail, links it to the reservation, drafts a reply in the hotel's voice for the GM to review, edit, and send. Single ranked inbox with urgency sorting. | Live |
| **Check-in-time chasing** | Automatically nudges guests for expected arrival time to keep housekeeping ahead. | Live |
| **Ask-anything hotel chat** | Plain-language questions over the hotel's own data (occupancy, arrivals, who's late). | Live |

**The platform underneath:**

- **PMS integrations.** MEWS is fully wired end-to-end (sync, briefings, chat). A complete Apaleo client also exists (OAuth, credential storage, reservation fetch) — see the reconciliation note in §1.4.
- **Gmail.** OAuth with minimal scopes (read + send). Drafts are never sent without GM approval.
- **Hotel profile, tone & upsells.** Per-hotel voice settings and configurable paid extras (late checkout, breakfast, transfer, parking with prices) injected into drafts and chat.
- **Reliability & observability.** One-command morning reliability check, cron observability, Sentry error alerting, database backups.
- **Security & tenancy.** Postgres row-level security per hotel, server-side-only provisioning (no client INSERT path), PMS/mailbox tokens encrypted at rest and hidden from client selects. Notably strong for this stage.
- **The website ("Signal" redesign).** Landing positioned on "AI software for hotels", watercolour hero, feature bento, comparison table, flat €199 pricing, grouped FAQ, SEO (OG image, JSON-LD, sitemap, hreflang), split-screen auth, stepped onboarding, real double-opt-in newsletter, EN/ES/CA throughout, WCAG-AA.
- **The sample-brief lead magnet.** A public `/sample-brief` page — the best top-of-funnel asset; it demonstrates rather than describes.

### 1.3 What is deliberately NOT built yet

Sensible scoping — but it defines exactly the gate between "can pilot" and "can charge" (see §3.4).

- **Billing / Stripe** — no way to take money.
- **Rate limiting & per-hotel AI spend caps** — the Anthropic-backed routes are unmetered.
- **Automated tests / CI** — no safety net on the briefing or sync paths.
- **Google OAuth verification** — not submitted; pilots work via manually-added test users.
- **Outlook / Microsoft 365** — Gmail only.
- **Two open build tasks** — the mobile pass and moving PMS connection into onboarding, plus the website punch-list.
- **Legal entity & DPA** — operating as an individual; no lawyer-drafted data-processing agreement yet.

### 1.4 Reconciliation — three contradictions across the old docs, resolved

Consolidating ten planning docs surfaced three internal contradictions. A source of truth has to settle them:

**① Is Apaleo connected or not?**
The old GTM doc said "Apaleo is not connected yet — don't promise it." The June launch plan said "real MEWS and Apaleo integrations," and the codebase contains a full 468-line Apaleo client with OAuth, credential storage, and reservation fetch. **Resolution:** the Apaleo integration is built at the library level but its end-to-end pilot-readiness (onboarding wiring, a real synced Apaleo hotel, a brief generated from Apaleo data) is unverified. Before any Apaleo outreach, run one real Apaleo property through sync → brief. Until that passes, treat Apaleo as **"code-complete, unproven"** — don't disqualify it in the ICP, but don't demo on it blind.

**② Do we store guest data, or discard it?**
The old pilot-outreach doc claimed "we don't store reservation data — we use it and discard it." The schema stores reservations and customer profiles in Supabase. **Resolution:** we **do** store, encrypted and EU-hosted, to generate briefings. Every outward claim and the pilot agreement must say so honestly: *"stored encrypted, EU-hosted, used only to produce your briefings, deleted on offboarding."* A GDPR-conscious owner's IT person will catch a false "we discard it," and that kills trust instantly.

**③ Fonda or Fondas?**
The wordmark, the domain (fondas.app), the consent screen, and the code once disagreed. **Resolution (already applied):** the customer-facing brand is **Fondas** everywhere. The design system stays separately named **"Signal."** A traditional *fonda* is a Spanish inn — that story is free brand equity in Spain; put it on an About page.

---

## Part 2 — Does the MVP have real market fit?

### 2.1 The market is with you (2026)

- **82% of hotels are expanding AI use in 2026** (up from 63% in 2024); 85% expect to spend ≥5% of IT budget on AI.
- **41% of independent European hotels already use AI**, and another 16% plan to; independents specifically favour tools that are quick to deploy and quick to deliver value — exactly Fondas's shape.
- **Independents hold ~58% of Spain's hospitality market**; growth is in upper-tier urban properties (143 new openings in 2025) — precisely the ICP.
- The pain is structural: **47% of European accommodations cite skilled-staff shortage** as a top barrier; front desk is the second-hardest role to fill. A GM doing admin at 6:45am is the norm.
- Capital is flowing: hospitality tech drew **$1B+ across ~40 startups** in the last year, roughly half at pre-seed/seed/Series A.

**But the money and adoption cluster where Fondas deliberately isn't:** 92% of hotels are using or implementing guest-messaging AI. Guest-facing chat is saturated; the GM-facing back office is still open — with one big caveat below.

### 2.2 The wedge shifted — the single most important strategic fact

Between the June launch plan and today, two platform moves landed:

- **Apaleo Copilot launched (March 2026), native in the PMS** — generates a daily morning briefing (arrivals, departures, no-shows, upgrades), chat-driven ops, accepts uploaded SOPs. Available to Apaleo's **1,000+ properties**.
- **Mews OS (Unfold 2026)** — **$300M raised (Jan 2026)** explicitly for "agentic AI for autonomous hotel management." Shipped Mews Agent (autonomous guest messaging across WhatsApp/SMS/OTA/email), Mews BI, RMS, natural-language automations.

**"Morning briefing on your PMS data" is no longer a product; it's a feature.** Pitching it head-on to an Apaleo GM now invites "my PMS already does that." Any strategy that leads with the briefing as the *product* is competing with free.

**What the PMS vendors structurally cannot own survives, and it's substantial:**

- **The inbox.** Guest email lives in Gmail/Outlook, not the PMS. Reading real guest mail, cross-referencing the booking, and drafting a reply in the hotel's voice is invisible to Apaleo Copilot and outside Mews Agent's remit for independents on other stacks. **This is the deepest moat.**
- **Cross-PMS neutrality.** A 1–3-property owner with one hotel on MEWS and one on Apaleo gets one Fondas — or two vendor copilots. *"Your PMS's copilot works for your PMS. Fondas works for you."*
- **Editorial quality + GM-first workflow.** A brief that reads like a trusted night manager's handover note is a craft moat platform copilots don't prioritise.
- **Local depth.** ES/CA/EN native, GDPR-native posture, a founder who can sit in a Barcelona lobby. Munich-based Apaleo and Amsterdam-based Mews don't do that for a 40-room hotel in Gràcia.

### 2.3 The competitive landscape

The field is fragmenting into funded point solutions — which is itself the pitch: **nobody owns the independent GM's whole morning.** Threat legend: 🔴 direct · 🟡 adjacent · 🟢 low/validating.

| Player | What they are | Threat to Fondas |
|---|---|---|
| **Apaleo Copilot** | Native PMS morning brief + chat ops, launched Mar 2026, 1,000+ properties. | 🔴 Direct on the briefing. Absorbed the old wedge. |
| **Mews OS / Mews Agent** | $300M raised; autonomous guest messaging + BI, building the whole layer Fondas sits in. | 🔴 Direct on chat + messaging for Mews hotels. |
| **Otel AI** (Dublin) | PMS-independent "AI co-worker" for independent hotels; department agents, flows, morning brief. €2.8M raised, Irish/UK groups. | 🔴 Direct on thesis, different segment (full-service, has a revenue manager). No guest inbox. See Appendix A. |
| **Altek AI** (Oslo) | Autonomous guest comms (email, chat, WhatsApp, voice) that execute, not just draft. 37 hotels, $500k pre-seed, Nordics. | 🔴 Rising — sits on the inbox moat, guest-side & autonomous. See Appendix B. |
| **happyhotel / Inntelo** | AI agents for revenue management / ops. €6.5M / £500k. | 🟡 Adjacent — validate investor appetite. |
| **HiJiffy, Canary, Duve, Asksuite** | Guest messaging / journey / upsell. Saturated (92% adoption). | 🟢 Low — different buyer & job. |
| **profitize, GauVendi, Cora, ALOE, Weforguest** | FP&A, attribute selling, housekeeping ops, experiences, CRM — funded specialists, mostly Italy/DACH. | 🟢 Low — roadmap signals, not competitors. Don't build these. |

**The pattern worth internalising:** every winner started with home-region density — Otel in Ireland, Altek in the Nordics, profitize in South Tyrol, Cora/ALOE in Italy. **Nobody has taken Spain.** That is Fondas's structural opening — win Barcelona/Madrid density before widening. (Full 8-startup map in Appendix C.)

### 2.4 The honest PMF verdict

**Conditional yes.** There is a real, fundable market position — but it is *"the PMS-independent AI front-office layer for the independent hotel's GM, anchored on the inbox,"* not *"AI morning briefings."* The MVP already contains the right surfaces; what must shift is emphasis, positioning, and roadmap weighting — plus the actual proof.

**The three conditions that convert "conditional" to "confirmed":**

1. **Habit:** >70% daily brief open rate across pilots.
2. **Moat works:** >60% of drafted replies sent with only minor edits.
3. **Willingness to pay:** at least one pilot says yes to €199/mo with no discount pressure.

Until those exist, PMF is a hypothesis, not a fact. The pilots are the experiment — define pass/fail before you start (§8).

---

## Part 3 — Positioning, product priorities & pricing

### 3.1 Positioning (the single most important change)

| From (retired) | To (adopt everywhere) |
|---|---|
| "AI morning briefings for boutique hotels" — now a PMS feature. | **"Fondas runs your hotel's front-office admin — the inbox, the morning, the chasing — no matter which PMS you use."** |

Concretely:

- **Lead with the email assistant** in every pitch, demo, and the landing hero. The brief remains the emotional hook (it demos beautifully) but is framed as *one output* of Fondas knowing your hotel — not the product.
- **Sell the bundle, not surfaces.** The GM buys "my first 90 minutes back," delivered by four surfaces working together. No platform copilot bundles all four across systems.
- **Weaponise neutrality.** *"Your PMS's copilot works for your PMS. Fondas works for you."* Use it with multi-property owners and anyone burned by platform lock-in.
- **Never say "AI" in the demo.** *"Fondas reads your data and writes this."* Saying AI makes them think ChatGPT and raises their guard. This instinct is now *more* correct, since "AI copilot" is the platforms' language.

### 3.2 Pricing & packaging

| Tier | Price | For | When |
|---|---|---|---|
| **Single property** | €199 / mo flat | One hotel, 20–80 rooms. ~1 room-night/month — keep saying that. | Now (the pilot ask) |
| **Group** | €149 / property / mo (2+) + owner digest | The 1–3-property owner — the best-fit buyer; raises ACV; monetises the wedge. | When multi-property digest ships |
| **Annual** | €1,990 / yr (2 months free) | Cash-flow + churn dampener for a bootstrapper. | Once billing ships |

Hold the flat price. The independent band is €99–300, often ~€4/room; flat beats per-room above ~50 rooms and is easier to say yes to. **Don't discount the first customer** — discount the *terms* (monthly, cancel anytime, no setup fee). The pilot cohort keeps **founder pricing (€149/mo lifetime)** as the conversion carrot — cheaper than the discount conversations you'll otherwise have.

### 3.3 Feature gaps, by gate

The useful question isn't "what's missing" but "a blocker for what?" — piloting, charging, or scaling. Priorities: **P0 = before pilots · P1 = before charging · P2 = before scaling/raise.**

| Gap | Why it matters | Pri | Effort |
|---|---|---|---|
| Mobile pass not done | The GM reads the brief on a phone at 6:45am — that moment *is* the pitch. | P0 | S |
| PMS connect not in onboarding | A new hotel must reach a real preview brief in one sitting, or they drop off before value. | P0 | S |
| Website punch-list | Dead footer links + per-env SITE_URL remain. Provisional content on a live site kills credibility. | P0 | S |
| `hello@fondas.app` can't receive mail | It's the contact on the site; a bounce to a prospect is an own-goal. | P0 | XS |
| Apaleo end-to-end unverified | Code exists; no real Apaleo hotel proven through sync → brief. Don't demo blind. | P0 | S |
| Draft-acceptance measurement (edit-distance) | THE PMF metric. Until built, ask pilots directly. | P0 | M |
| Data-honesty language fix | Say "stored encrypted, EU-hosted, deleted on offboarding" everywhere. | P0 | XS |
| Billing / Stripe | No way to charge. Fine for free pilots; hard gate before the €199 ask. | P1 | M |
| Rate limiting + per-hotel spend caps | Unmetered AI routes = uncapped cost/abuse risk. | P1 | S |
| Legal entity + lawyer-drafted DPA | GDPR applies the moment guest data flows. A competent DPO will ask. | P1 | M |
| Google OAuth verification | Needed before public Gmail connect beyond test users. Weeks of lead time. | P1 | M |
| **Outlook / Microsoft 365 support** | "We use Outlook" disqualifies ~half the ICP. Highest-leverage TAM expansion. | P2 | L |
| Multi-property owner digest | Monetises the cross-PMS wedge; supports the Group tier. | P2 | M |
| Graduated autonomy (auto-send routine) | Altek executes; Fondas drafts. Needs draft → approve → auto-handle-routine or it looks dated within a year. | P2 | M |
| Pre-arrival upsell drafting | Turns Fondas from cost-saver into revenue-maker: "one late checkout a week pays for Fondas." | P2 | M |
| Automated tests / CI on money paths | No safety net for a solo founder shipping fast. | P2 | M |
| WhatsApp delivery of brief + urgent flags | Spanish GMs live in WhatsApp. Delivery channel, not a chatbot. | P2 | S |
| 3rd PMS (Cloudbeds or Amenitiz) | Roughly doubles Spanish TAM. Choose by pilot-pipeline evidence. | P2 | L |

**Priority order:** finish **P0 before any outreach demo**; re-point every surface at the inbox; sequence **P1 to the calendar** (start Google verification and the lawyer conversation the week the second pilot goes live); **hold the P2 line** — Outlook is the one P2 to pull forward if pilots keep surfacing it. Breadth before depth is how a solo founder dies.

### 3.4 What to explicitly NOT build now

Guest-facing chat (saturated, 92% adoption), revenue management (deep science, funded specialists), housekeeping/task apps, POS/accounting, booking engines, dynamic pricing, FP&A, experience marketplaces. Each now has a funded specialist; building them is how unfocused bundles happen. Where the good *ideas* from those categories fit — as signals inside surfaces Fondas already owns — see Appendix C §4.

---

## Part 4 — The go-to-market plan (pilots → first hotels → first revenue)

### 4.1 The strategy in one paragraph

Founder-led sales to a narrow ICP — independent / small-group, design-forward, 20–80-room urban hotels in Spain first, on MEWS (Apaleo once proven), on Gmail — anchored on the inbox + morning bundle, converting **3 free pilots into the first paying customers by ~October 2026.** Distribution judo on the platforms: list on Apaleo Agent Hub rather than fight it, and win the Mews independents the Mews enterprise machine ignores. A small budget goes only to channels hoteliers actually trust (Hotel Tech Report, one trade event, LinkedIn). Raise a pre-seed off retention + paying-logo proof around late-2026/early-2027 to fund Outlook, a third PMS, and the first hire.

### 4.2 Goal and funnel math

**Primary goal:** 3 hotels using Fondas daily, with at least one saying yes to €199/month.

```
40 hotels identified
 → 25 contacted
   → 10 reply
     → 6 take a demo
       → 3 onboard as pilots
         → 1+ converts to paying
```

That's ~12% contact-to-pilot — realistic for warm, personalised outreach to a tight ICP. Identify **40 rather than 30** to absorb August's lower response rate. **Cadence:** 5 contacts/day, 5 days/week.

### 4.3 Who you're targeting (ICP)

| Signal | Why it qualifies |
|---|---|
| **20–80 rooms** | Small enough that the GM does their own morning prep and email; big enough to feel overwhelmed. |
| **Independent or 1–3 properties** | No procurement, no IT department — the GM or owner decides. |
| **Uses MEWS** (Apaleo once proven) | The PMS wired end-to-end today. Don't demo on an unproven integration. |
| **Uses Gmail for operations** | The email assistant is Gmail-only until Outlook ships. |
| **4-star or design-forward** | These GMs care about output quality; a beautiful brief lands. |
| **City / urban boutique** | Busier daily ops, and reachable in August. Prioritise first. |

**Disqualifiers:** chain-affiliated (Marriott/IHG/Accor) · Opera/Cloudbeds/other PMS · Outlook or shared non-Gmail inbox · under 15 rooms.

### 4.4 The calendar problem and geography sequencing

> **August is the worst month of the year to cold-contact Spanish hotel GMs — and it's the month the plan starts in.** Coastal properties run 90–100% occupancy; their GMs work 12-hour days.

This does **not** mean waiting. It means sequencing:

| Window | Good for | Expected response |
|---|---|---|
| **Aug 3–21** | List building, first touches, warm intros, a few opportunistic city demos | Low — 5–10% |
| **Aug 24 – Sep 4** | Season winding down; GMs surface; demos start landing | Moderate |
| **Sep 7 – Oct 15** | **The real window.** Post-season reviews, budget planning, appetite for new tools | Best — push hardest here |

- **August:** Barcelona city, Madrid city — dense, reachable, high MEWS adoption.
- **September onward:** Costa Brava, Costa Daurada, Sitges, Girona + Valencia, Seville, Bilbao, San Sebastián. Coastal properties are ideal ICP but only reachable post-season. **Contacting a Costa Brava GM on 12 August burns a good lead** — in a small industry, a badly timed first impression is expensive.
- **Your advantage:** you're in Barcelona. Offer to visit. For a Costa Brava property in September, *"I can drive up Tuesday"* converts far better than a Zoom link.

### 4.5 Dated milestones

| Date | Milestone |
|---|---|
| Fri 7 Aug | 40-hotel list built, tracking sheet live, first 15 contacted. |
| Fri 14 Aug | 25 contacted; follow-up sequence running; 1–2 demos booked. |
| **Fri 28 Aug** | **4+ demos done; 1 pilot onboarding.** _(This is this week — see the calendar note at the top.)_ |
| Fri 4 Sep | **2 pilots live and receiving daily briefs.** If you hit this, you're on track. |
| Fri 18 Sep | 3 pilots live; second (coastal) outreach wave underway. |
| Fri 2 Oct | Structured feedback from all 3; case-study material collected. |
| Mid-Oct | **The €199 ask.** First paying customer. Legal entity exists or in progress. |

### 4.6 Week 1 — build the list

**Deliverable: 40 qualified hotels in a tracking sheet, 15 contacted.** Channels, in order of lead quality:

1. **Warm network first.** Anyone you know in hospitality, hotel consulting, F&B, or hotel tech. One warm intro beats 20 cold messages. Spend the first hour here.
2. **MEWS ecosystem** — MEWS publishes case studies and a marketplace; featured hotels are confirmed users. LinkedIn search `"Mews" "General Manager" Barcelona` surfaces GMs who name their PMS publicly. _(Apaleo Community + Marketplace become channels once the Apaleo integration is proven — §1.4.)_
3. **Design collections** — Design Hotels, Small Luxury Hotels, Mr & Mrs Smith, Tablet Hotels. Public member directories; filter by Spain, then size.
4. **LinkedIn direct** — `"General Manager" "boutique hotel" Barcelona` / `Madrid`. Prioritise 2nd-degree connections.
5. **Instagram** — boutique hotels are obsessive about it. `#boutiquehotelbarcelona`, `#hotelboutiquemadrid`. DMs are often read by the owner directly.

**Tracking-sheet columns:** `Hotel · City · Rooms · PMS (confirmed?) · GM name · Source · Date contacted · Status · Last touch · Next action · Notes`
**Status values:** `found → contacted → replied → demo booked → demo done → onboarding → active pilot → paying` (or `dead`).

### 4.7 The outreach sequence (four touches, then stop)

Four touches maximum. In a small industry, a fifth follow-up costs you reputation. **Write in Spanish to Spanish GMs** — English-first outreach signals you're not local, and being local is one of your few structural advantages.

```
Day 1   →  LinkedIn connection request (with note)
Day 4   →  LinkedIn message (the actual ask)
Day 11  →  Email follow-up
Day 18  →  Final note, with the sample-brief link
```

**Touch 1 — LinkedIn connection request (300 char limit)**

- **ES:** _Hola [Nombre] — estoy construyendo una herramienta de operaciones para hoteles boutique y me encantaría conectar. Estamos arrancando con 3 hoteles piloto y [Hotel] es justo el tipo de propiedad que teníamos en mente._
- **EN:** _Hi [Name] — I'm building an operations tool for boutique hotels and would love to connect. We're launching with 3 pilot hotels and [Hotel] looks like exactly the kind of property we had in mind._

**Touch 2 — LinkedIn message, day 4 (the pitch)**

> Hola [Nombre],
>
> Soy el fundador de Fondas. Hemos construido una capa que se conecta a tu PMS y a tu bandeja de entrada: redacta las respuestas a los emails de huéspedes para que las revises, y te deja el resumen de la mañana escrito a las 6:30 — llegadas, VIPs, incidencias, ETAs sin confirmar.
>
> En vez de 45 minutos sacando informes y contestando correos, lo tienes hecho antes de llegar al hotel.
>
> Estamos incorporando 3 hoteles piloto antes de abrirlo. Sin coste y sin compromiso — lo que necesito es feedback real de directores que cuiden la calidad.
>
> ¿Te encajaría una llamada de 20 minutos esta semana? Estoy en Barcelona, así que si lo prefieres me acerco.
>
> — Oriol

_Why it works: leads with the inbox (the differentiated bit) before the brief; quantifies the saving; the ask is small and concrete; scarcity without pressure; the in-person offer is a local advantage nobody else has._

**Touch 3 — Email, day 11**
Subject: `Fondas — el resumen de la mañana para [Hotel]`

> Hola [Nombre],
>
> Te dejo esto por correo por si LinkedIn se perdió entre el ruido.
>
> Fondas se conecta a tu PMS y a Gmail: redacta los borradores de respuesta a huéspedes y te escribe el resumen operativo de cada mañana — llegadas, salidas, VIPs, estado de habitaciones — listo antes de que llegues al hotel.
>
> Estamos trabajando con 3 propiedades piloto este otoño. Gratis, y la configuración la hago yo. A cambio me gustaría media hora de tu tiempo a las dos semanas para saber qué funciona y qué no.
>
> Aquí puedes ver un ejemplo real del resumen: fondas.app/es/sample-brief
>
> Un saludo,
> Oriol · oriolpelli@icloud.com · fondas.app

**Touch 4 — Day 18, close the loop**

> Hola [Nombre],
>
> Última nota por mi parte — sé que las bandejas se llenan rápido, y más en temporada.
>
> Si no es el momento, ningún problema. Vuelvo a escribirte en octubre, que suele ser mejor época para mirar herramientas nuevas.
>
> Y si te pica la curiosidad: fondas.app/es/sample-brief
>
> Mucha suerte con lo que queda de temporada.
>
> — Oriol

_Respectful, removes pressure, leaves a door open — and "I'll come back in October" is credible given the actual calendar._

### 4.8 The demo (20 minutes)

Goal is not to sell. It's to make them feel smart for taking the call.

| Min | What you do |
|---|---|
| 0–3 | Ask about their morning. *"¿Cómo es tu primera hora? ¿Dónde se te va más tiempo antes de que llegue el equipo?"* Let them describe the pain first. |
| 3–6 | **Open on the inbox** — Concierge with a real draft waiting. The differentiated moment; don't bury it. |
| 6–12 | Then the brief (read part aloud), then check-in chasing, then ask-anything chat. Narrate the day, not the features: *"Son las 6:45, abres esto…"* |
| 12–14 | The fragmentation close: *"Podrías pagar seis suscripciones — comunicaciones, revenue, finanzas, tareas, experiencias, CRM — o una capa que te lleva la mañana."* |
| 14–17 | *"¿Esto se parece a algo que te ahorraría tiempo?"* Then stop talking. |
| 17–20 | If yes: *"El siguiente paso es conectar tu PMS, son 30 minutos y lo hacemos juntos. ¿Lo agendamos?"* |

**Never say "AI."** Say *"Fondas lee tus datos y escribe esto."* **Before every demo:** add the prospect's Google account as an OAuth **test user** the day the demo is booked (verification isn't submitted, so Gmail connect will otherwise fail live), and seed the test hotel with realistic Spanish guest names and a plausible occupancy pattern so the demo feels real.

### 4.9 Objections

**"Estamos en plena temporada."**
> "Justo por eso te escribo ahora. El resumen ahorra más tiempo cuando estás al 90% y todo va rápido. La configuración la hago yo en 30 minutos, cuando mejor te venga."

**"Ya usamos otra herramienta de informes."**
> "Fondas no es una herramienta de informes — es un digest diario que lee tus informes por ti y te dice qué importa. La mayoría usa las dos."

**"Tengo que consultarlo con el propietario."**
> "Claro. Te mando una página explicando qué datos toca, qué no toca, y cómo funciona la conexión." Then send the one-pager (§4.13) and follow up in 5 days.

**"¿Están seguros mis datos?"**
> "Fondas lee de tu PMS por su API oficial, igual que tu channel manager. Los datos se guardan cifrados y alojados en la UE, solo para generar tus resúmenes, y se borran si te das de baja. Los correos se leen para clasificarlos y redactar borradores — nada se envía sin que tú lo apruebes." _(Note the corrected, honest data-handling line — see §1.4 ②.)_

**"¿Cuánto cuesta?"**
> "El piloto no cuesta nada — son los tres primeros hoteles. Después la idea son 199€ al mes, plano, sin coste por habitación. Pero esa conversación es dentro de seis semanas y depende de que te resulte útil."

### 4.10 Pilot onboarding runbook

When a demo converts, book a **30-minute screen-share** and do these in order:

1. **Before the call:** add their Google account as an OAuth test user; confirm they're on MEWS + Gmail.
2. Create their account → onboarding wizard → connect PMS → first sync.
3. **Generate a preview brief live on the call** — this is the moment they get it. Don't skip it.
4. Connect Gmail.
5. Fill **Hotel Profile & Tone together** (incl. the upsell fields with prices) — the product gets good here; do it conversationally, not as homework.
6. Set **brief recipients** (their email), **send hour**, and **language** — Spanish for Spanish GMs. An English brief kills it.
7. Open a **WhatsApp thread** before ending the call. Not email — WhatsApp. It's how you'll learn something broke.

**Then, daily for the first week:** read their brief yourself every morning *before they do*, and fix what's wrong before they report it. The highest-value hour of the whole programme. **A broken pilot is worse than a late one.**

### 4.11 During the pilot — what to measure

| Metric | Why it matters |
|---|---|
| **Draft acceptance rate** (sent unedited / minor / major / discarded) | The #1 PMF signal. Until edit-distance tracking ships, ask directly. |
| Brief opens, and whether they read it before arriving | Is it part of the morning? |
| Chat queries per week | Are they treating it as the place to ask? |
| Unprompted feature requests | Strongest possible signal — they're imagining it in their workflow. |

**Structured feedback at 2 weeks**, per pilot (15 min or 5 written questions): (1) What's wrong or missing in the brief? (2) Which drafts did you edit, and why? (3) What do you now *not* do that you used to? (4) What would make you stop using it? (5) What would you pay for it? Paste verbatim answers into a `PILOT_FEEDBACK.md` — it drives the fix cycle and becomes case-study raw material (ask permission to quote).

### 4.12 Converting to paid

**Timing:** ask at week 2–3 of an active pilot, not later. Momentum decays.

**The ask** — direct, no discount theatre:
> "Llevas tres semanas usándolo. ¿Te sirve lo suficiente como para que valga 199€ al mes? Si la respuesta es no, dime qué falta — es igual de útil para mí."

Hold €199/month flat. Don't discount the first customer — discount the *terms* (monthly, cancel anytime, no setup fee) if you need to reduce friction.

### 4.13 The one-pager (to forward internally)

**Fondas — la mañana del hotel, resuelta**

- *Qué hace:* se conecta a tu PMS (MEWS) y a Gmail. Redacta los borradores de respuesta a los correos de huéspedes usando los datos de su reserva, y te escribe cada mañana el resumen operativo — llegadas, salidas, VIPs, incidencias, ETAs sin confirmar — listo antes de que llegues.
- *Qué más:* persigue automáticamente las horas de llegada sin confirmar, y responde preguntas sobre el día ("¿cuántas habitaciones quedan por limpiar?").
- *A qué se conecta:* MEWS vía API oficial. Gmail vía OAuth, con los mismos permisos que cualquier cliente de correo.
- *Qué NO hace:* no modifica datos en tu PMS, y no envía ningún correo sin tu revisión y aprobación.
- *Datos:* se guardan cifrados y alojados en la UE, solo para generar tus resúmenes; se borran si te das de baja.
- *Condiciones del piloto:* 30 días gratis, acceso completo, una llamada de configuración, una de feedback. Sin contrato ni tarjeta.
- *Contacto:* Oriol · oriolpelli@icloud.com · fondas.app

### 4.14 Channels (ranked, with budget)

**Free / founder time — 80% of GTM until ~customer 15:**

1. **Warm network first**, then **founder-led outbound** (5 contacts/day, inbox-first pitch).
2. **The sample briefing as lead magnet.** "See tomorrow morning's brief for a 45-room Barcelona hotel" — beautiful, anonymised, behind an email gate. Your best asset costs nothing.
3. **Apaleo Agent Hub listing** (once Apaleo is proven) — native distribution to confirmed-Apaleo hotels; positions Fondas as complementary to Copilot.
4. **LinkedIn founder content, 2×/week** + genuine participation in hospitality forums.

**Paid (~€1–2k/mo total):**

5. **Hotel Tech Report vendor profile** (~€100–300/mo) — 80k+ verified reviews are the trust layer of hotelier buying. Get your first 5 pilot reviews there before budget season. *The reviews are the product; the listing is the container.*
6. **LinkedIn Sales Navigator** (~€90/mo) — the outreach engine.
7. **One trade event per quarter, attend-only** — HIP Madrid / FITUR. Walk the floor, book 10 meetings ahead. No booth (vanity spend at this stage).
8. **Occasional contract design/content** (~€300–500/mo) — case-study one-pagers, the sample-brief asset, ES/CA polish.

**Explicitly not now:** Google Ads (tiny, expensive search volume), guest-facing marketplaces, cold email at volume (small industry, reputation risk), agency PR.

---

## Part 5 — Legal & compliance (where you actually stand)

No legal entity yet; piloting first to test fit before incorporating. A defensible sequence — but be clear-eyed. **GDPR applies the moment a hotel's guest data flows through Fondas, regardless of incorporation.** The hotel is the controller, you're the processor, and Article 28 expects a written agreement.

- **Fine now:** running free pilots as an individual — no billing, no invoices, no company needed.
- **Do now:** write a plain **one-page pilot agreement** (what data is accessed — PMS reservations, Gmail messages; that it isn't used to train models; stored encrypted, EU-hosted on Supabase; sub-processors — Supabase, Anthropic, Google, Resend, Vercel, Sentry; terminable with deletion on request). Fill `company.ts` with what's true today rather than `[Fondas Technologies, S.L.]` placeholders on a live site.
- **Correctly deferred:** Google OAuth verification (pilots work as test users).

**Hard triggers — when this stops being optional:**

| Trigger | What you must have first |
|---|---|
| Charging anyone | Legal entity (SL or autónomo), invoicing, Stripe |
| A hotel's DPO asks for a DPA | Lawyer-drafted DPA |
| Opening public signups | Entity + Google verification + real legal pages + rate limiting |
| More than ~3 pilots | Entity — informal arrangements stop scaling |

**Recommendation:** book the lawyer conversation the week your **second** pilot goes live (~4 Sep), not after the third. Spanish SL incorporation takes a few weeks; starting in October means charging in November. _(Not legal advice — EU data protection is exactly where a real lawyer is worth the money.)_

---

## Part 6 — The raise track

- **What:** pre-seed, **€400–600k** (comps: Inntelo £500k, Altek $500k, Otel €2.8M). Use of funds: 18 months runway — founder salary, first engineer or GTM hire, Outlook + 2 PMS integrations, security assessment.
- **When:** informal conversations from October (investors met at budget-season events); raise formally **Jan–Mar 2027** on 15–25 paying hotels, €3–5k MRR, 3+ months cohort retention <3% monthly churn, and a signed multi-property group.
- **The narrative:** *"Platforms are building copilots for their own PMS; ~60% of Europe's hotels are independents on mixed stacks who need one layer that works for them. We own the surface the PMS can't see — the inbox — and we're the only bundle a GM opens every morning. Spain first (58% independent, underserved locally), then the EU long tail."* Mews's $300M and happyhotel's round are your **market-validation** slide, not your competition slide.
- **Who:** Spanish early-stage first (ENISA non-dilutive ~€75–300k; Lanzadera; Barcelona/Madrid hospitality angels), EU travel-tech seed funds second. A hotelier-angel is worth a discount — they're also channel.
- **Bootstrap fallback (by design):** the plan reaches ~€5–6k MRR without a raise; costs run under €1k/mo at that scale. **Raise for speed, not survival.**

---

## Part 7 — The VC audit (the eight hardest questions, with the way through)

Read as a skeptical seed investor doing diligence. Each concern is stated without softening, then answered with the concrete move. A concern with a credible answer is not a reason not to invest; an unanswered one is.

**1. Zero traction — you're pitching a hypothesis.**
Pre-seed is priced on evidence-of-insight plus speed-to-proof, not traction. The move: get to 2 live pilots by 4 Sep and one "I showed it to the owner and he loved it" moment; instrument draft-acceptance from day one so you're showing a real number, not a promise. A single pilot with >70% open rate and a quotable GM converts "hypothesis" into "early signal" — all a pre-seed needs.

**2. The platforms will eat you.**
The PMS vendors are structurally conflicted out of your core surface — neutrality is the one thing a platform can't sell, and the inbox lives outside the PMS entirely. The move: make neutrality the whole identity, target multi-property owners on mixed stacks, and watch the two triggers quarterly (Apaleo/Mews shipping inbox handling). If either does, the pre-planned pivot is up the stack to the group/owner layer — even harder for a single-PMS platform to own.

**3. Otel AI is doing your exact thesis with €2.8M more than you.**
Otel wins where there's a revenue manager, an F&B P&L, payroll, and a comp-set subscription — the 80–200-room full-service "mini-enterprise" on Opera/Guestline. Fondas wins where the GM *is* the revenue manager and the front desk. Different buyer, different price, different job. They don't touch the guest inbox; you own it. Put Otel on your validation slide with the one-line answer: *"different buyer, different surface, one-fifth the price, and they prove the category."* Then move faster than they can localise.

**4. Altek AI is already on your moat surface — and it's autonomous.**
Human-in-the-loop is a feature, not a lag, for the trust-sensitive boutique GM who won't let a bot answer a complaint in their name on day one. And Altek is guest-comms only — no GM brief, no ops digest. The move: put **graduated autonomy** on the roadmap (draft → approve → auto-handle-routine, per-category settings) so "quaint" becomes "you choose how much it handles."

**5. Solo, non-technical founder shipping AI-written code with no tests.**
The counter-evidence is already in the repo: DB-level RLS tenancy, encrypted tokens, server-side-only provisioning, a one-command reliability harness, Sentry, backups — stronger than most funded seed products. The move: close the three specific holes (rate-limiting + spend caps, tests on the money paths, 5+ green reliability mornings logged), then frame the first engineer as part of the raise.

**6. Starting outreach in the worst possible month, from zero.**
The seasonality is known, planned for, and an asset — the pain (a slammed GM at 6:45am) is most acute exactly when the tool matters most. City hotels are reachable now; coastal is held for September. The move: pre-commit to judging the funnel in September, write it down so you don't move the goalposts, and use August to seed demo data and finish P0.

**7. €199 flat, one hotel at a time — is this venture-scale?**
The €199 single-property SKU is the wedge, not the ceiling. ACV expansion: the Group tier, the Outlook unlock (plausibly doubles the reachable ICP), the third PMS (roughly doubles Spanish TAM), and pre-arrival upsell drafting that turns a cost-saver into a revenue-maker. The narrow beachhead is the standard SaaS playbook: own a segment nobody else will, then widen.

**8. Vitamin, not painkiller — will they pay after a free pilot?**
The willingness-to-pay test is built in: the ask comes at week 2–3 while momentum is high, and ≥1/3 conversion by week 6 is a pre-committed pass/fail. Engineer painkiller framing: the revenue story ("one late checkout a week pays for Fondas"), the daily-habit story (a >70% open rate means removing it is felt), and the Sean Ellis test at the ask. If they use it daily but won't pay, run 5 win/loss interviews before touching the product.

**The audit in one line:** none of the eight is fatal, and each has a concrete, pre-committed answer. The investable version isn't "we built a nice tool" — it's *"we found the one surface the platforms structurally can't own, we're proving a daily habit with pre-committed metrics, in the one European market nobody has claimed, from a founder who ships secure product at 5× leverage."* Get the two pilots and the draft-acceptance number, and this stops being a pitch and starts being a signal.

---

## Part 8 — Metrics & the PMF definition

| Metric | Target | What it proves |
|---|---|---|
| Brief email open rate | >70% daily | The habit exists. |
| Email-draft acceptance (sent ≤ minor edit) | >60% | The moat surface works. **THE #1 PMF signal.** |
| Week-4 pilot retention | 3/3 | The product delivers. |
| Pilot → paid conversion | ≥1/3 by wk 6; ≥2/3 by wk 10 | Willingness to pay. |
| Sean Ellis ("very disappointed" without it) | >40% of active GMs | The classic PMF bar. |
| Monthly logo churn (paid) | <3% | Retention proof for the raise. |
| CAC (founder-led) | <€300/customer | Payback < 2 months. |

---

## Part 9 — Risks & kill/pivot criteria

- **August response rates are poor** → expected and planned for. Judge the funnel in September; don't panic-discount or widen the ICP because a week was quiet.
- **Burning coastal leads in peak season** → hold Costa Brava / Costa Daurada until September. Deliberate, not lazy.
- **A pilot asks for a DPA you don't have** → the §5 one-page agreement covers most cases; if a property insists, be honest that the formal DPA is weeks away and offer to start in September.
- **Gmail OAuth fails live in a demo** → add every prospect as a test user the day the demo is booked; test the flow weekly.
- **MEWS-only limits the funnel** → real constraint. If ≥3 good prospects are on Apaleo, proving the Apaleo path becomes the top build task.
- **First pilot has a bad first week** → read their brief every morning before they do, for the first week.
- **Platform absorption accelerates** (Apaleo Copilot adds email; Mews ships an independent-tier agent) → double down on cross-PMS + Outlook + multi-property; if by mid-2027 both bundle credible inbox handling free, pivot the wedge to the group/owner layer.
- **Draft quality plateaus below 60% acceptance** after 2 months of tuning → narrow to briefing + chasing at a lower price (€99) and reassess.
- **Pilots use it but won't pay** (all three stall at the ask) → pricing/packaging or vitamin problem; run 5 win/loss interviews before touching the product.
- **Kill criterion:** if by end of Q1 2027 there are <8 paying hotels despite 100+ qualified contacts and two positioning iterations, the segment can't sustain the business as shaped — stop and rethink before raising or spending further.

---

## Part 10 — What to do next (the 90-day source-of-truth checklist)

**Now → first pilot (P0, ~1–2 weeks of build):**
- Finish the mobile pass and PMS-in-onboarding; clear the website punch-list; give `hello@fondas.app` an inbox.
- Prove one real Apaleo hotel end-to-end (sync → brief), or explicitly park Apaleo from outreach until then.
- Ship draft-acceptance measurement; fix the data-honesty language everywhere.
- Build the 40-hotel list + tracking sheet; seed realistic demo data; run the full demo twice (laptop + phone).

**August → 2 pilots live (by 4 Sep):**
- Execute the four-touch outreach, city hotels only, inbox-first pitch, 5/day.
- Onboard pilots via the runbook; read every brief each morning before they do; open a WhatsApp thread per pilot.
- The week the 2nd pilot lands: book the lawyer, start Spanish SL incorporation, start Google OAuth verification.

**September → 3 pilots + first revenue (P1):**
- Ship Stripe billing + rate-limiting/spend caps; get the one-page pilot agreement and DPA ready to send same-day.
- Collect 2-week structured feedback; produce one quantified case study; get first Hotel Tech Report reviews.
- Second outreach wave: coastal properties, in person where possible. Make the €199 ask at pilot week 2–3.

**October → paying customer + raise prep (P2 begins):**
- Convert ≥1 pilot to €199; if Outlook keeps recurring in the pipeline, start Microsoft 365 support.
- Open informal investor conversations at budget-season events; build the deck around the validation slide (Mews, Otel, happyhotel) and your real pilot metrics.

---

## Part 11 — What success looks like on 15 October

- 3 hotels have used Fondas daily for 2+ weeks.
- At least one "I showed the owner and he loved it" moment, with a quotable line.
- Specific written feedback on what the brief gets wrong — and a real draft-acceptance number.
- At least one hotel has said yes to €199/month.
- The legal entity exists, or is actively in progress.

If that's where you are in mid-October, everything after — building, raising, growing — gets dramatically easier to justify.

---

## Appendix A — Competitor deep dive: Otel AI (otelai.com)

_The closest true competitor to Fondas's thesis: a PMS-independent AI layer for the GM of an independent hotel. Same idea, different segment — studying it closely is more useful than fearing it._

Dublin, founded ~2025 (Paul Ryan, ex-hotel-ops CEO; Nikhil Patil, CTO; advised by Floor Bleeker, ex-CTO of Accor). Raised **€2.8M within six months of launch** (€800k pre-seed Nebular, then €2M led by Playfair, Apr 2026). Live with named Irish/UK groups (O'Callaghan Collection, Fitzpatrick Castle, Johnstown Estate, Killarney Park). ISO 27001; SOC 2 Type II expected.

**Value prop:** *"Your whole hotel, in one mind."* Six department agents (Revenue, F&B, Payroll, Operations, Procurement, Review Signals), scheduled "Flows," and a persistent "hotel brain." Case-study currency: The Alex hit ~120 rate actions/month and **+8.6% RevPAR in 3 months**. 100+ integrations (Opera, Guestline, IDeaS, Xero…), delivered wherever the team works.

**Real ICP:** full-service independents / small groups, ~80–200+ rooms, with a revenue manager, F&B outlets, payroll and a comp-set subscription — the Irish/UK "mini-enterprise" on legacy stacks. Demo-led, likely €500–1,500+/property/mo.

**What to steal:** named, quantified case studies as the entire sales engine; hotel-association membership as a trust channel (join Gremi d'Hotels de Barcelona / CEHAT); a public Trust page early; "the brain that knows your hotel" framing. **What not to copy:** the 100+-integration arms race, unpublished pricing, and six departments at once — breadth before depth is death for a solo founder.

## Appendix B — Competitor deep dive: Altek AI (Oslo)

Autonomous guest communication end-to-end — email, web chat, WhatsApp/SMS, social, **voice** — in 100+ languages, deeply integrated with PMS/booking engine. Key difference from Fondas: agents don't just draft, they **execute** (modify reservations, book services, issue confirmations). Live in **37 hotels** across Norway/Sweden/Denmark, ~$140k ARR, ~26% MoM growth; **$500k pre-seed** (StartupLab, Jan 2026) for European expansion. Two technical founders.

**Why it matters:** it's Fondas's email wedge, done guest-side and autonomous, one region over — overlap is high and rising. Differences that still favour Fondas: Altek is guest-comms only (no GM brief/digest — different buyer), Nordic-focused, and autonomy-first (many boutique GMs still want review-before-send). **Implication:** Fondas's email assistant needs a visible path from draft → approve → auto-handle-the-routine, or it looks old-fashioned within a year. Altek's numbers (37 hotels, ~$140k ARR at pre-seed) are a concrete comp for what Fondas needs to show.

## Appendix C — Broader competitor landscape & the "where everyone sits" map

_Deep dive on eight startups in two clusters: property & revenue management (Altek, GauVendi, profitize, Weforguest) and guest experience (HostyAI, ALOE, Cora, Via.ai)._

Two axes — **who it serves** (GM/back-office ↔ guest-facing) × **what it automates** (communication ↔ data/decisions):

| | Communication-centric | Data/decision-centric |
|---|---|---|
| **GM / back-office** | **Fondas** (brief + inbox + chasing) · Otel AI (reports/flows) | profitize (FP&A) · happyhotel (RMS agents) · Mews BI / Apaleo Copilot |
| **Guest-facing** | **Altek AI** (autonomous guest comms) · Weforguest (CRM+chatbot) · HostyAI (STR messaging) · Via.ai (B2B2C concierge) | GauVendi (attribute selling/RMS) · ALOE (experience commerce) · Cora (staff ops/tasks) |

**The one-line reads on the other six:** GauVendi (Frankfurt) — attribute-based selling engine; 🟢 low, a lesson not a threat. profitize (Bolzano) — FP&A for hospitality, ~150 customers in a year, €1.4M seed; 🟢 low, proves home-region density and "reads all your systems" sells fast in DACH. Weforguest (Turin) — guest-CRM bundle for Italian independents; 🟡 shows the risk of bundling too wide, too guest-side without a daily habit. HostyAI (Lisbon) — STR guest messaging; 🟢 low, a future expansion vector. ALOE (Milan) — experience/ancillary commerce; 🟡 the most useful *idea* in the batch (pre-arrival/in-stay upsell revenue). Cora (Italy) — housekeeping/task ops from €99/mo; 🟡 anchors the low end, don't build task management. Via.ai (UK) — white-label concierge for banks; 🟢 none.

**What the landscape says:** (1) the market is validated from every direction and money flows at every check size; (2) every winner starts with home-region density and **nobody has taken Spain**; (3) the fragmentation *is* the pitch — a GM otherwise faces six subscriptions; (4) autonomy is the next competitive axis in comms; (5) nobody does the editorial GM briefing; (6) €199 flat sits exactly mid-band (€99 Cora entry → €120–300 guest-comms → custom high-touch).

**Where the good ideas fit — as signals inside surfaces Fondas already owns, not new engines:** (1) **pre-arrival upsell suggestions** (from ALOE's territory) — draft pre-arrival emails including the hotel's own paid extras; no catalog, no payments; "one late checkout a week pays for Fondas." (2) **Revenue signal in the brief** (from GauVendi/happyhotel's territory) — once the rate cache lands, flag soft dates and rate position in prose; signal, not pricing engine. (3) **Guest personalization** (from the CRM cluster) — repeat-guest recognition in drafts and briefs. **Still explicitly out:** booking engines, dynamic pricing, task/housekeeping, FP&A, guest chatbots, experience marketplaces.

**Watchlist (review quarterly):** Altek (any expansion south of DACH; any GM-briefing feature) · Otel (down-market tier; Mews/Apaleo connectors; guest-email drafting) · Apaleo Copilot / Mews Agent (inbox/email handling shipped natively) · Cora / ALOE (either adds guest-email AI or a GM digest).

## Appendix D — Source documents consolidated

This file supersedes the following for GTM purposes; they are retired (deleted from the tree — git history preserves them):

- `GO_TO_MARKET.md` (27 Jul) — outreach calendar, sequence, demo, onboarding, legal, conversion. → Part 4–5.
- `MARKET_STRATEGY.md` (4 Jul, + Otel appendix) — market analysis, PMF verdict, positioning shift, reweighted roadmap, raise track. → Parts 2–3, 6, Appendix A.
- `PILOT_OUTREACH.md` (3 Jul) — ICP, channels, outreach sequence, funnel math. → Part 4.
- `LAUNCH_PLAN.md` (3 Jul) / `Fonda_MVP_Launch_Plan.docx` (30 Jun) — current-state review, security findings, staged roadmap, pricing benchmark. → Parts 1, 3.
- `Fonda_Pilot_Outreach_Strategy.docx` (Jun) — the original pilot-outreach plan. → Part 4.
- `COMPETITOR_LANDSCAPE.md` (8 Jul) — the 8-startup deep dive + the map. → Appendices B, C.
- `Fondas_GTM_Strategy_Consolidated.docx` (31 Jul) — the previous consolidation attempt. → fully absorbed here.

**Kept separate (not GTM strategy):** `EXECUTION_PLAYBOOK.md` (paste-ready build-task prompts), the product/build roadmaps (`ROADMAP.md`, `BUILD_PLAN_JULY31.md`, `PATH_TO_MVP.md`, `Fonda_MVP_Dev_Roadmap.docx`), the design system docs, the website punch-list, the marketing-voice guide, and the daily/ops runbooks.

_Sources for market figures, competitor funding, and buyer behaviour are retained in git history in the original `MARKET_STRATEGY.md` and `COMPETITOR_LANDSCAPE.md` reference sections._
