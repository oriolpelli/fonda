# Fondas — Website & Marketing Redesign v3

_Owner: Oriol · 17 September 2026 · Status: **final** — ready to execute_

**What this implements.** The hero, category line and anchor strings decided in `POSITIONING_V3.md` §1 and §3, plus the page architecture that makes those claims land. Informed by a full read of `otelai.com` on 17 Sep 2026 (`POSITIONING_V3.md` §0.3).

**What this does NOT change.** `FONDA_DESIGN_IDENTITY.md` v2.0 "Signal" stands: no new colours, no new fonts, no new tokens, no new motion vocabulary. Every band is built from the section shell, `Eyebrow`, `SquareMarker`, `Reveal`, `Button` and the card treatments that exist today. **A re-architecture, not a re-skin.**

**Primary file.** `app/[lang]/page.tsx` (876 lines today). All copy lives in `dictionaries/{en,es,ca}.json` — no hardcoded strings, ever.

**This file is self-sufficient.** Every string the redesign needs is in §3, including the hero and anchor lines (§3.0). A fresh Claude Code session needs this document and nothing else; `POSITIONING_V3.md` explains *why* and is worth reading, but is not required to execute.

**How to run it.** One phase per session, one commit per phase, review the diff before moving on. Do not batch phases — each one has its own acceptance criteria, and a failed batch is hard to unpick. Every phase is a single commit, so `git revert` is the rollback.

**The hero this page is built around:**

> **DOS PASOS POR DELANTE, CADA MAÑANA.**
> **La IA que lleva la operativa, y tú, a los huéspedes.**
> Fondas se conecta a tu PMS y al correo del hotel, y lleva las cuatro partes del día: el resumen de la mañana, los check-ins, las comunicaciones con el huésped y cualquier pregunta sobre tu hotel. Nada sale sin tu visto bueno.

---

## 0. The five rules we took from Otel

Their mechanics, restated as constraints for this page.

| # | Rule | What it means here |
|---|---|---|
| **R1** | **The artefact is the argument.** | Otel's hero is a full morning brief with €33,512, −€4,222 vs STLY, named staff. They show; they don't describe. Our best asset — a real brief — is behind an email gate at `/sample-brief` while the first product pixel sits ~1,500px down the page. That is the biggest conversion leak on the site. |
| **R2** | **Three-layer hero.** | Category eyebrow → outcome headline → one mechanism sentence naming what it connects to and what it runs. Never a capability list. |
| **R3** | **Every band kills one named fear.** | A band that doesn't answer a real objection gets cut. That's why `comparison` is retired below. |
| **R4** | **Eyebrows are the structural spine.** | Reading only the eyebrows top to bottom should give you the whole argument. Write the fourteen as a sequence before writing any one of them. |
| **R5** | **Odd numbers, or no numbers.** | Otel's figures are +8.6%, 110.4, ~120/mo, 2→10 — odd, attributable, verifiable, and theirs. We have zero customers, so we ship **product facts** (6:30, 90s, €199) and **no traction claims at all** until pilot #1 produces one with a hotel name attached. |

**Not copied:** their category line, the 100+-integration count, and any results band.

---

## 1. The band map

| # now | Band (current) | `page.tsx` | → | # new | Action |
|---|---|---|---|---|---|
| 1 | hero | 312 | → | **1** | **Rewrite** — new copy + the artefact (Phase B) |
| 2 | works-with | 389 | → | **2** | Keep + add the connection line (Phase A) |
| 3 | howItWorks | 437 | → | **5** | **Absorbed** — becomes the three-step strip above the overnight timeline (Phase F) |
| 4 | featuresSection (bento) | 472 | → | — | **Retire** — absorbed by band 6 |
| 5 | emailShowcase | 529 | → | **4** | **Promote + upgrade** (Phase D) |
| 6 | showcase (briefing) | 557 | → | **3** | **Promote + ungate** (Phase C) |
| 7 | stats | 581 | → | **12** | Move down; the `{price}` cell is replaced (Phase 0b) |
| 8 | bundle | 625 | → | **7** | **Merge** into `sections` (Phase E) |
| 9 | comparison | 660 | → | **6** | **Keep and move up** — decided 17 Sep, sits right after the timeline |
| 10 | faq | 743 | → | **14** | Keep |
| 11 | pricing | 805 | → | **13** | Keep, now **before** the FAQ; price figure removed (Phase 0b) |
| 12 | cta | 847 | → | **15** | Re-copy |
| — | — | — | → | **5** | **NEW** — `nightShift`, the overnight timeline (Phase F) |
| — | — | — | → | **8** | **NEW** — `audience` |
| — | — | — | → | **9** | **NEW** — `onYourSide` |
| — | — | — | → | **10** | **NEW** — `security` |
| — | — | — | → | **11** | **NEW** — `comingSoon` |

**Why `comparison` stays.** The spec first proposed retiring it, on the grounds that it argues by description where bands 3 and 4 argue by demonstration. Kept by decision, and moved to sit directly after the overnight timeline — where the contrast does real work rather than competing with the artefacts. Trim its overlapping rows (see band 6).

**Fifteen bands is a long page.** That is a deliberate trade: every band answers a named objection (R3), and a GM who scrolls all of it is a GM who is close to buying — but watch the scroll depth once it's live. If bands 6 and 7 both underperform, band 6 is the one to cut.

**Why `featuresSection` and `bundle` merge.** They make the same argument twice — four capabilities, then "one tool not six subscriptions". Band 6 does both in one: the four real product sections, framed as the anti-fragmentation close.

**The eyebrow spine, top to bottom (ES):**

> DOS PASOS POR DELANTE → FUNCIONA CON → EL RESUMEN → LAS COMUNICACIONES → MIENTRAS EL HOTEL DUERME → LA DIFERENCIA → LAS CUATRO PARTES DEL DÍA → PARA QUIÉN ES → DE TU LADO → SEGURIDAD → YA EN CAMINO → LOS NÚMEROS → PRECIO → PREGUNTAS → CUANDO QUIERAS

---

## 2. Band specs

Shared shell, unchanged:

```tsx
<section className="border-t border-border px-6 py-24 md:px-8">
  <div className="mx-auto max-w-[1120px]">
    <Reveal className="grid gap-8 pb-10 md:grid-cols-2 md:items-end">
      <Eyebrow>{dict.X.eyebrow}</Eyebrow>
      <h2 …>{dict.X.headline}</h2>
      <p …>{dict.X.lead}</p>
    </Reveal>
    …
  </div>
</section>
```

### Band 1 — Hero

Copy from `POSITIONING_V3.md` §3.1. Structure: eyebrow → two-tone h1 → mechanism subhead → two CTAs → **artefact**.

The artefact is the change. Otel puts the product directly under the CTA row, cropped by the viewport edge so it reads as "there's more".

**Proposed composition** — preserves the watercolour, which `FONDA_DESIGN_IDENTITY.md` §7 v2.2 protects as a deliberate exception:

- Headline block stays where it is, over the parallax scrim.
- Below the CTA row, `BriefingPreviewWindow` floats at `max-w-[1120px]`, its **lower ~30% cut by the section boundary**. The scrim resolves behind it into `--fonda-bg`.
- Chrome: existing card treatment — `rounded-[18px] bg-card shadow-card` plus hairline border.
- **No parallax on the window.** It is the one still object in a moving hero; that contrast is the point.
- Phone: full width minus the 24px gutter, crop reduced to ~15% so two lines of brief prose stay legible.

⚠️ **Decision required** (`POSITIONING_V3.md` §8.3). The alternative is retiring the parallax hero and going product-only. The above keeps the brand asset *and* satisfies R1.

### Band 2 — Funciona con

Keep the existing trust bar. Add one line underneath: the honest answer to "do you connect to what I use".

`LIVE_INTEGRATIONS` = MEWS, Apaleo, Gmail · `ON_REQUEST_INTEGRATIONS` = Outlook. The comment above those constants is the honesty contract for the whole site. **Do not add a connection count here.** When a real count is earned, this is the band it goes in.

### Band 3 — El resumen (promoted, ungated)

Currently `showcase` at 557. Moves directly under the trust bar and shows a **complete anonymised brief** — not a teaser.

- Full `BriefingPreviewWindow`, real prose, realistic Spanish guest names, a plausible occupancy pattern for a 45-room Barcelona hotel.
- Under it, one line and one link → `/sample-brief`, which keeps its email gate for the **personalised** version.
- The gate moves from the generic brief to the personalised one. That single change is worth more than any headline on this page.

### Band 4 — Las comunicaciones (promoted, upgraded)

Currently `emailShowcase` at 529. `EmailDraftPreviewWindow` should show three things at once, the way Otel's compose panel does: **the guest's email · the matched reservation · the draft**. If the component renders only the draft today, adding the matched-reservation column is the highest-value component work in this spec — it is the visual proof of the moat (`GTM_STRATEGY.md` §2.2: the inbox is what no PMS copilot can see).

One `SquareMarker` line underneath: *"Nada se envía sin tu visto bueno."*

### Band 5 — Mientras el hotel duerme (NEW — absorbs `howItWorks`)

**The single most persuasive band on the page.** Otel's version turns a background cron job into a feeling: a vertical timeline from 11PM to 7AM, one row per task, each with a chip and a timestamp, revealing as you scroll. You finish it thinking *it works while I sleep and I don't have to think about it.*

Structure, top to bottom:

1. **The three `howItWorks` steps, compacted into a strip** — Conecta · Trabaja de noche · Te lo encuentras hecho. This keeps R3's job on the setup fear ("live in an afternoon") without spending a whole band on it, which is why `howItWorks` is absorbed here rather than kept separate.
2. **The timeline**: seven rows, 23:00 → 09:00, hour label in a left column, title and chip in a card row. Copy in §3.6.
3. **The kicker** — one line, the economic argument stated plainly: *"Todo esto, sin una hora extra ni una persona más en plantilla."* This is the sentence the whole band exists to earn. Say it as **work nobody had to stay up for**, never as people you no longer need — the displacement frame is what v2's hero got wrong (`POSITIONING_V3.md` §0.2).
4. **The honesty note** underneath the kicker, in muted text at `--fonda-text-3`.

**What this band is actually for.** A GM deciding whether to sign does not buy "AI". They buy an answer to *what would it cost me to have someone do this?* The timeline answers it without arithmetic: seven things happened between midnight and nine, nobody worked late, nobody came in early, and the payroll line didn't move. That is the same argument the `stats` band makes with €199, and the same one `sections` makes with "six subscriptions" — but this is the one that lands in the body rather than the spreadsheet.

**Why ours beats theirs.** Otel's timeline stops at 7AM with the pickup report. Ours runs to **09:00**, where Fondas chases the arrival times that are still missing — so the story continues past the moment the GM walks in, which is the truer and warmer ending. And the real schedule is more impressive than the drama: `vercel.json` has PMS sync every 15 minutes, the inbox read every 5, the brief delivered at `brief_send_hour` (default 07:00 in the hotel's timezone) and the check-in chase at 09:00. Every row is a real job.

**The honesty note is not optional.** Otel writes *"A composite night, but every catch is real and every line traces to source."* Ours says the times are examples, that Fondas syncs every fifteen minutes and reads the inbox every five, and that the brief arrives at the hour the hotel chooses. Without that line this band is a claim, and §0.4 does not allow claims.

**Motion.** Scroll-triggered stagger only, using the existing `Reveal` component with its `index` prop — roughly 120ms between rows. This is **not** a second exception to Signal §7: staggered reveal is already the site's motion vocabulary, and the parallax remains the only exception. No autoplay, no loop, no infinite animation — it plays once as the band enters the viewport and then sits still. Under `prefers-reduced-motion` every row renders immediately with no stagger and no transform.

**Layout.** Desktop: two columns — headline block left (sticky through the band's scroll if it's cheap to do), timeline right. **The left column is text only** — no photograph. Otel puts a still of an unmade bed there; decided against, because the only honest source would be the existing brand photography and stock would cheapen the one band on the page that has to feel true. Phone: the hour label moves above each row, one column, no sticky.

**Chips.** Existing badge treatment (Signal §5.4). Muted, not accent — the chip is a detail, the row title is the message.

### Band 6 — La diferencia (kept)

`comparison`, unchanged copy — "La misma mañana, de dos maneras". **Kept by decision on 17 Sep**, after the spec initially proposed retiring it.

It earns its slot here, immediately after the overnight timeline, better than it did in its old position at line 660. The timeline shows the night *with* Fondas; this band shows the same morning *without* it. Back to back, description stops competing with demonstration and starts completing it — the reason the band looked redundant before was its placement, not its content.

One change: it must not repeat lines that bands 3, 4 and 5 have already shown. If `fondas3` ("horas de llegada reclamadas automáticamente") is now a row on the timeline, cut it here — five rows that overlap the previous three bands read as padding. Three sharp rows beat five soft ones.

### Band 7 — Las cuatro partes del día (merge of `featuresSection` + `bundle`)

The four **live** product surfaces, framed as the anti-fragmentation close. Verified against `lib/roadmap.ts` on 17 Sep: *"The four surfaces that were live from day one (dashboard, brief, check-ins, communications)"*, plus `chat` marked `live`.

1. **Resumen matutino** · 2. **Check-ins** · 3. **Comunicaciones** · 4. **Pregunta lo que quieras**

Layout: one card holding four cells with internal hairlines — the same containment treatment as `stats` (the comment there explains why: four loose cells float on the grey ground). Full copy in §3.1.

**Analytics and Revenue are not here.** `app/[lang]/dashboard/analytics/page.tsx` renders `<ComingSoon />`. They belong in band 10.

### Band 8 — Para quién es (NEW)

Otel segments by role, not by feature. Three cards: **Propiedad y grupo · Dirección · Recepción**. Copy in §3.2. The existing `Vignette` system carries over — one vignette per role instead of per feature.

The first card is written for one hotel **or twenty** (`POSITIONING_V3.md` §1.4). Nothing on this page says *independiente*, *boutique* or *pequeño* — a multi-property reader must never conclude the product was built for someone smaller than them and leave.

### Band 9 — De tu lado (NEW)

Kills *"mi PMS ya hace eso"* on the page instead of in the call. Eyebrow, headline, lead, three `SquareMarker` bullets. **No card, no illustration** — it is the only band on the page that is nothing but words, and that is where its weight comes from.

### Band 10 — Seguridad (NEW)

The highest-value steal in the redesign: it reframes the data objection as a problem the buyer already has. Headline + lead left, three cells right (the `stats` card treatment at 3 cells), link out to the trust page.

### Band 11 — Ya en camino (NEW)

Honest momentum, and the home for everything that isn't live: analytics and revenue, pre-arrival extras, WhatsApp delivery, Outlook. Lighter ground, no card shadow, so it reads as "not yet" at a glance.

**Copy rule, enforced in review: future tense in all three languages, no exceptions.** A present-tense line here is a claim, and claims belong above this band or nowhere.

### Band 12 — Los números

`stats`, moved down, content unchanged: 6:30, 90s, €199, setup time. Product facts, not traction. **No hotel count, no customer logo, no percentage** until a pilot produces one (R5).

### Bands 13–15 — Precio · Preguntas · Cuando quieras

Pricing gains `pricing.groupLine` (§3.7) under the flat price, so a group reader sees that multi-property is a supported case rather than an afterthought. It matches the Group tier in `GTM_STRATEGY.md` §3.2 (€149/property from the second). `pricing.note` drops "los primeros 20 hoteles" for "los tres primeros hoteles del piloto".

Pricing moves above the FAQ: someone who has read ten bands wants the number before they want the small print. FAQ keeps the honest data language already in `faq.a5`. The CTA mirrors Otel's de-risked close — *twenty minutes, your data, nothing to migrate.*

---

## 3. New dictionary namespaces

Add to all three dictionaries. Written natively per language — the Spanish is the market language and is not a translation of the English.

### 3.0 Hero and anchor strings (Phase 0)

The decided copy from `POSITIONING_V3.md` §3, inlined here so this document stands alone. Keep every `{brand}`, `{year}` and `{price}` token intact.

| Key | ES | CA | EN |
|---|---|---|---|
| `hero.badge` | Dos pasos por delante, cada mañana | Dos passos per davant, cada matí | Two steps ahead, every morning |
| `hero.headlineLine1` | La IA que lleva la operativa, | La IA que porta l'operativa, | The AI that runs the back of house, |
| `hero.headlineLine2` | y tú, a los huéspedes. | i tu, els hostes. | so you can run the front. |
| `hero.subhead` | {brand} se conecta a tu PMS y al correo del hotel, y lleva las cuatro partes del día: el resumen de la mañana, los check-ins, las comunicaciones con el huésped y cualquier pregunta sobre tu hotel. Nada sale sin tu visto bueno. | {brand} es connecta al teu PMS i al correu de l'hotel, i porta les quatre parts del dia: el resum del matí, els check-ins, les comunicacions amb l'hoste i qualsevol pregunta sobre el teu hotel. Res no surt sense el teu vistiplau. | {brand} connects to your PMS and your hotel inbox, and runs the four parts of the day: the morning brief, check-ins, guest communications, and any question about your hotel. Nothing goes out without your yes. |
| `hero.ctaPrimary` | Pedir acceso | Demanar accés | Get early access |
| `hero.ctaSecondary` | Ver un resumen real → | Veure un resum real → | See a real brief → |
| `meta.title` | Fondas — La IA que lleva la operativa de tu hotel | Fondas — La IA que porta l'operativa del teu hotel | Fondas — The AI that runs your hotel's back of house |
| `meta.description` | Fondas se conecta a tu PMS y al correo del hotel y te deja el día preparado: el resumen escrito antes de que abras, las respuestas a tus huéspedes redactadas para que las revises y las horas de llegada ya confirmadas. Sobre el PMS que ya usas, sin migrar nada. | Fondas es connecta al teu PMS i al correu de l'hotel i et deixa el dia preparat: el resum escrit abans que obris, les respostes als teus hostes redactades perquè les revisis i les hores d'arribada ja confirmades. Sobre el PMS que ja fas servir, sense migrar res. | Fondas connects to your PMS and your hotel inbox and leaves the day ready: the brief written before you open, guest replies drafted for your review, arrival times already confirmed. On top of the PMS you already run, with nothing to migrate. |
| `footer.valueProp` | La IA que lleva la operativa de tu hotel. | La IA que porta l'operativa del teu hotel. | The AI that runs your hotel's back of house. |
| `footer.rights` | © {year} Fondas. Dos pasos por delante. | © {year} Fondas. Dos passos per davant. | © {year} Fondas. Two steps ahead. |
| `auth.signupDesc` | Conecta tu PMS y el correo del hotel. Mañana por la mañana ya estará hecho. | Connecta el teu PMS i el correu de l'hotel. Demà al matí ja estarà fet. | Connect your PMS and the hotel inbox. By tomorrow morning it's done. |
| `authAside.headline` | La operativa del hotel, hecha. | L'operativa de l'hotel, feta. | The back of house, handled. |
| `cta.eyebrow` | Cuando quieras | Quan vulguis | Ready when you are |
| `cta.headline` | Míralo funcionando con tus propios datos. | Mira-ho funcionant amb les teves pròpies dades. | See it running on your own hotel's data. |
| `cta.subhead` | Veinte minutos, tu hotel, sin migrar nada. Gratis para los tres primeros hoteles. | Vint minuts, el teu hotel, sense migrar res. Gratis per als tres primers hotels. | Twenty minutes, your hotel, nothing to migrate. Free for the first three hotels. |
| `pricing.note` | Gratis para los tres primeros hoteles del piloto. | Gratis per als tres primers hotels del pilot. | Free for the first three pilot hotels. |
| `contact.intro` | *Phrase swap only:* "para hoteles independientes y boutique" → "con hoteles de todos los tamaños". | *Phrase swap only:* "per a hotels independents i boutique" → "amb hotels de totes les mides". | *Phrase swap only:* "for independent and boutique hotels" → "with hotels of every size". |


### 3.0b Price and beta (Phase 0b)

**Decided 17 Sep: the €199 figure comes off the homepage** until billing ships, and the hero badge drops the beta marker. Both were live when Phase 0 ran, so this is a separate follow-up commit rather than a re-run.

| Key | ES | CA | EN |
|---|---|---|---|
| `pricing.price` | Un precio | Un preu | One price |
| `pricing.priceUnit` | por alojamiento y mes — todo incluido | per allotjament i mes — tot inclòs | per property, per month — everything included |
| `pricing.lead` | Sin tarifas por usuario, sin cobro por correo, sin niveles sorpresa. Todo lo que hace {brand} va incluido, a un único precio por alojamiento. Escríbenos y te lo decimos. | Sense tarifes per usuari, sense cobrament per correu, sense nivells sorpresa. Tot el que fa {brand} va inclòs, a un únic preu per allotjament. Escriu-nos i t'ho diem. | No per-user fees, no per-email charges, no surprise tiers. Everything {brand} does is included, at one price per property. Talk to us and we'll tell you. |
| `stats.priceTop` | Nada que migrar | Res a migrar | Nothing to migrate |
| `stats.priceValue` | 0 | 0 | 0 |
| `stats.priceLabel` | sistemas que cambiar, ni nada que reaprender | sistemes per canviar, ni res per reaprendre | systems to change, nothing to relearn |

**Why the `stats` cell changes too.** That band's fourth cell rendered `{price} €`. Removing the price from the pricing band while it still shouts €199 two bands earlier would be worse than leaving it everywhere. The replacement keeps an odd, specific number (R5) and spends it on the migration fear instead.

**The JSON-LD must match.** `app/[lang]/page.tsx` line ~281 emits an `Offer` with `priceCurrency: PRICE_CURRENCY`. If the page no longer states a price, the structured data must not either — drop the price fields from the offer rather than leaving markup that contradicts the page.

**Where beta lives now.** With the badge marker gone, the private-beta status must appear in exactly one place: an FAQ answer. `pricing.note` and `cta.subhead` already say "los tres primeros hoteles del piloto", which implies it; the FAQ should state it plainly so nobody feels they discovered it late.

### 3.1 `sections` (band 7)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | Las cuatro partes del día | Les quatre parts del dia | The four parts of the day |
| `headline` | Cuatro partes del día, un solo sitio. | Quatre parts del dia, un sol lloc. | Four parts of the day, one place. |
| `lead` | Puedes pagar seis suscripciones —comunicaciones, revenue, tareas, finanzas, experiencias, CRM— o tener las cuatro cosas que de verdad te comen la mañana en una sola herramienta, que además ya conoce tu hotel. | Pots pagar sis subscripcions —comunicacions, revenue, tasques, finances, experiències, CRM— o tenir les quatre coses que de debò et mengen el matí en una sola eina, que a més ja coneix el teu hotel. | You can pay for six subscriptions — comms, revenue, tasks, finance, experiences, CRM — or have the four things that actually eat your morning in one tool that already knows your hotel. |
| `i1Title` | Resumen matutino | Resum matinal | Morning brief |
| `i1Desc` | El día escrito antes de que abras: llegadas, salidas, VIPs y lo que necesita tu atención. | El dia escrit abans que obris: arribades, sortides, VIPs i el que necessita la teva atenció. | The day written before you open: arrivals, departures, VIPs, and what needs you. |
| `i2Title` | Check-ins | Check-ins | Check-ins |
| `i2Desc` | Las horas de llegada pedidas y confirmadas solas, para que pisos vaya por delante. | Les hores d'arribada demanades i confirmades soles, perquè pisos vagi per davant. | Arrival times chased and confirmed on their own, so housekeeping stays ahead. |
| `i3Title` | Comunicaciones | Comunicacions | Communications |
| `i3Desc` | Cada correo de huésped con la respuesta redactada y la reserva delante. Enviar, lo decides tú. | Cada correu d'hoste amb la resposta redactada i la reserva al davant. Enviar, ho decideixes tu. | Every guest email with the reply drafted and the booking beside it. Sending is your call. |
| `i4Title` | Pregunta lo que quieras | Pregunta el que vulguis | Ask anything |
| `i4Desc` | Ocupación, llegadas, cómo pinta la noche. En lenguaje normal, sobre tus propios datos. | Ocupació, arribades, com pinta la nit. En llenguatge normal, sobre les teves pròpies dades. | Occupancy, arrivals, how tonight looks. Plain language, on your own data. |

### 3.2 `audience` (band 8)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | Para quién es | Per a qui és | Who it's for |
| `headline` | El mismo hotel, tres mañanas distintas. | El mateix hotel, tres matins diferents. | One hotel, three different mornings. |
| `lead` | La misma información, haciendo un trabajo distinto para cada uno. | La mateixa informació, fent una feina diferent per a cadascú. | The same information, doing a different job for each. |
| `ownerRole` | Propiedad y grupo | Propietat i grup | Owners & groups |
| `ownerSub` | De un hotel a veinte | D'un hotel a vint | From one hotel to twenty |
| `ownerPromise` | Verlos todos sin pedirlo. | Veure'ls tots sense demanar-ho. | See them all without asking. |
| `ownerB1` | Un resumen por hotel, a la hora que elijas. | Un resum per hotel, a l'hora que triïs. | One brief per hotel, at the hour you choose. |
| `ownerB2` | Sin esperar al informe del lunes, tengas dos hoteles o veinte. | Sense esperar l'informe del dilluns, tinguis dos hotels o vint. | No waiting for Monday's report, whether you run two hotels or twenty. |
| `ownerB3` | Los mismos números que ve tu director. | Els mateixos números que veu el teu director. | The same numbers your GM is working from. |
| `ownerB4` | Una sola herramienta aunque cada hotel lleve un PMS distinto. | Una sola eina encara que cada hotel porti un PMS diferent. | One tool even when each hotel runs a different PMS. |
| `gmRole` | Dirección | Direcció | General Managers |
| `gmSub` | El hotel, día a día | L'hotel, dia a dia | The property, day to day |
| `gmPromise` | Entrar sabiendo. | Entrar sabent. | Walk in knowing. |
| `gmB1` | El resumen escrito antes de que abras. | El resum escrit abans que obris. | The brief written before you open. |
| `gmB2` | Llegadas, VIPs y ETAs sin confirmar, antes del turno. | Arribades, VIPs i ETAs sense confirmar, abans del torn. | Arrivals, VIPs and unconfirmed ETAs, before the shift. |
| `gmB3` | Lo que necesita tu mañana, no todo lo que pasó. | El que necessita el teu matí, no tot el que va passar. | What your morning needs, not everything that happened. |
| `gmB4` | Pregunta lo que quieras sobre el día, en lenguaje normal. | Pregunta el que vulguis sobre el dia, en llenguatge normal. | Ask anything about the day, in plain language. |
| `deskRole` | Recepción | Recepció | Front desk |
| `deskSub` | El correo y las llegadas | El correu i les arribades | The inbox and arrivals |
| `deskPromise` | La bandeja, ya contestada. | La safata, ja contestada. | The inbox, already answered. |
| `deskB1` | Cada correo con la respuesta redactada y la reserva delante. | Cada correu amb la resposta redactada i la reserva al davant. | Every email with the reply drafted and the booking beside it. |
| `deskB2` | Con la voz del hotel, no con la de un robot. | Amb la veu de l'hotel, no amb la d'un robot. | In your hotel's voice, not a robot's. |
| `deskB3` | Las horas de llegada pedidas solas. | Les hores d'arribada demanades soles. | Arrival times chased on their own. |
| `deskB4` | Enviar, siempre lo decides tú. | Enviar, sempre ho decideixes tu. | Sending is always your call. |

### 3.3 `onYourSide` (band 9)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | De tu lado | Del teu costat | On your side |
| `headline` | El copiloto de tu PMS trabaja para tu PMS. | El copilot del teu PMS treballa per al teu PMS. | Your PMS's copilot works for your PMS. |
| `lead` | {brand} trabaja para ti. Se apoya sobre MEWS, Apaleo y el correo que ya usas — y si algún día tienes dos hoteles en dos sistemas, sigue siendo una sola herramienta. | {brand} treballa per a tu. Es recolza sobre MEWS, Apaleo i el correu que ja fas servir — i si algun dia tens dos hotels en dos sistemes, continua sent una sola eina. | {brand} works for you. It sits on MEWS, Apaleo and the inbox you already use — and if you ever run two hotels on two systems, it's still one tool. |
| `b1` | Nada que migrar, nada que tu equipo tenga que reaprender. | Res a migrar, res que el teu equip hagi de reaprendre. | Nothing to migrate, nothing for your team to relearn. |
| `b2` | Un solo sitio aunque cada hotel lleve un sistema distinto. | Un sol lloc encara que cada hotel porti un sistema diferent. | One place, even when each hotel runs a different system. |
| `b3` | Si cambias de PMS, {brand} se queda. | Si canvies de PMS, {brand} es queda. | Change your PMS and {brand} stays. |

### 3.4 `security` (band 10)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | Seguridad | Seguretat | Security |
| `headline` | Tu equipo ya usa IA. Solo que en un chat público. | El teu equip ja fa servir IA. Només que en un xat públic. | Your team is already using AI. Just not safely. |
| `lead` | Ahora mismo alguien de recepción está pegando el correo de un huésped en un chat gratuito para redactar la respuesta en inglés. {brand} le da la misma rapidez dentro de tu propio entorno y sobre los datos de tu hotel. | Ara mateix algú de recepció està enganxant el correu d'un hoste en un xat gratuït per redactar la resposta en anglès. {brand} li dona la mateixa rapidesa dins del teu propi entorn i sobre les dades del teu hotel. | Right now someone on your front desk is pasting a guest's email into a free chatbot to write the reply in English. {brand} gives them the same speed inside your own environment, on your hotel's data. |
| `i1Title` | Cifrados y alojados en la UE | Xifrades i allotjades a la UE | Encrypted, EU-hosted |
| `i1Desc` | Los datos de tus huéspedes se guardan cifrados, en servidores europeos. | Les dades dels teus hostes es guarden xifrades, en servidors europeus. | Your guests' data is stored encrypted, on European servers. |
| `i2Title` | Solo para tu hotel | Només per al teu hotel | Only for your hotel |
| `i2Desc` | Se usan únicamente para generar tus resúmenes y tus borradores. Nunca para entrenar nada. | S'utilitzen únicament per generar els teus resums i els teus esborranys. Mai per entrenar res. | Used solely to produce your briefs and drafts. Never to train anything. |
| `i3Title` | Se borran si te vas | S'esborren si marxes | Deleted when you leave |
| `i3Desc` | Te das de baja y se eliminan. El hotel es el responsable del tratamiento; {brand}, el encargado. | Et dones de baixa i s'eliminen. L'hotel és el responsable del tractament; {brand}, l'encarregat. | Cancel and it's erased. The hotel is the data controller; {brand} is the processor. |
| `cta` | Cómo tratamos tus datos → | Com tractem les teves dades → | How we handle your data → |

### 3.5 `comingSoon` (band 11)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | Ya en camino | Ja en camí | On the way |
| `headline` | Lo que llega durante el piloto. | El que arriba durant el pilot. | What lands during the pilot. |
| `lead` | Escrito en futuro a propósito: hoy no lo hace. Cuatro cosas en construcción, que llegan mientras dure tu piloto. | Escrit en futur a propòsit: avui no ho fa. Quatre coses en construcció, que arriben mentre duri el teu pilot. | Written in the future on purpose: it doesn't do these today. Four things in build, landing while your pilot runs. |
| `i1Title` | Analítica y revenue | Analítica i revenue | Analytics and revenue |
| `i1Desc` | El cuadro de mando de ingresos y la analítica del hotel. Primero llegará una señal en el resumen cuando una noche vaya floja: una señal, no un motor de precios. | El quadre de comandament d'ingressos i l'analítica de l'hotel. Primer arribarà un senyal al resum quan una nit vagi fluixa: un senyal, no un motor de preus. | The revenue dashboard and hotel analytics. First will come a line in the brief when a night is running soft: a signal, not a pricing engine. |
| `i2Title` | Extras antes de la llegada | Extres abans de l'arribada | Pre-arrival extras |
| `i2Desc` | Los borradores previos a la llegada incluirán tus propios extras con precio: late checkout, desayuno, parking. Un late checkout a la semana paga {brand}. | Els esborranys previs a l'arribada inclouran els teus propis extres amb preu: late checkout, esmorzar, pàrquing. Un late checkout a la setmana paga {brand}. | Pre-arrival drafts will include your own paid extras with prices: late checkout, breakfast, parking. One late checkout a week pays for {brand}. |
| `i3Title` | El resumen por WhatsApp | El resum per WhatsApp | The brief on WhatsApp |
| `i3Desc` | Donde de verdad lo vas a leer a las 6:45. | On de debò el llegiràs a les 6:45. | Where you'll actually read it at 6:45. |
| `i4Title` | Outlook | Outlook | Outlook |
| `i4Desc` | Para los hoteles que no están en Gmail. | Per als hotels que no són a Gmail. | For the hotels that aren't on Gmail. |

### 3.6 `nightShift` (band 5)

| Key | ES | CA | EN |
|---|---|---|---|
| `eyebrow` | Mientras el hotel duerme | Mentre l'hotel dorm | While the hotel sleeps |
| `headline` | Trabaja de noche. Tú llegas y ya está hecho. | Treballa de nit. Tu arribes i ja està fet. | It works the night. You arrive and it's done. |
| `lead` | A las siete es una sola lista: qué ha pasado, qué necesita tu atención y qué ya está resuelto. Cada línea sale de tus propios datos. | A les set és una sola llista: què ha passat, què necessita la teva atenció i què ja està resolt. Cada línia surt de les teves pròpies dades. | By seven it's one list: what happened, what needs you, and what's already handled. Every line comes from your own data. |
| `r1Time` | 23:00 | 23:00 | 11 PM |
| `r1Title` | Sincroniza tu PMS | Sincronitza el teu PMS | Syncs your PMS |
| `r1Chip` | Cada 15 min | Cada 15 min | Every 15 min |
| `r2Time` | 00:30 | 00:30 | 12:30 AM |
| `r2Title` | Lee el correo que ha entrado | Llegeix el correu que ha entrat | Reads the mail that came in |
| `r2Chip` | Cada 5 min | Cada 5 min | Every 5 min |
| `r3Time` | 02:00 | 02:00 | 2 AM |
| `r3Title` | Cruza cada correo con su reserva | Creua cada correu amb la seva reserva | Matches each email to its booking |
| `r3Chip` | Nombre, fechas, tarifa | Nom, dates, tarifa | Name, dates, rate |
| `r4Time` | 04:00 | 04:00 | 4 AM |
| `r4Title` | Redacta las respuestas con la voz del hotel | Redacta les respostes amb la veu de l'hotel | Drafts the replies in your hotel's voice |
| `r4Chip` | 9 borradores | 9 esborranys | 9 drafts |
| `r5Time` | 06:00 | 06:00 | 6 AM |
| `r5Title` | Escribe el resumen del día | Escriu el resum del dia | Writes the day's brief |
| `r5Chip` | Llegadas, salidas, VIPs | Arribades, sortides, VIPs | Arrivals, departures, VIPs |
| `r6Time` | 07:00 | 07:00 | 7 AM |
| `r6Title` | El resumen, en tu bandeja | El resum, a la teva safata | The brief, in your inbox |
| `r6Chip` | Antes de que abras | Abans que obris | Before you open |
| `r7Time` | 09:00 | 09:00 | 9 AM |
| `r7Title` | Pide las horas de llegada que faltan | Demana les hores d'arribada que falten | Chases the arrival times still missing |
| `r7Chip` | Pisos, por delante | Pisos, per davant | Housekeeping, ahead |
| `kicker` | Todo esto, sin una hora extra ni una persona más en plantilla. | Tot això, sense una hora extra ni una persona més a la plantilla. | All of it, without an hour of overtime or one more person on payroll. |
| `note` | Una noche cualquiera, con horarios de ejemplo. {brand} no solo trabaja de noche: sincroniza tu PMS cada quince minutos y lee el correo cada cinco. El resumen llega a la hora que tú elijas. | Una nit qualsevol, amb horaris d'exemple. {brand} no només treballa de nit: sincronitza el teu PMS cada quinze minuts i llegeix el correu cada cinc. El resum arriba a l'hora que tu triïs. | One ordinary night, with example times. {brand} doesn't only work at night: it syncs your PMS every fifteen minutes and reads the inbox every five. The brief arrives at the hour you choose. |

Every row maps to a real scheduled job in `vercel.json`: `/api/sync` (\*/15), `/api/cron/emails` (\*/5), `/api/cron/briefing` (\*/15, delivering at `brief_send_hour`, default 7, in the hotel's timezone) and `/api/cron/checkin` (09:00). **If a job changes, this band changes.**

### 3.7 Additions to existing namespaces

| Key | ES | CA | EN |
|---|---|---|---|
| `trust.connectLine` | MEWS, Apaleo y Gmail, conectados hoy. ¿Usas otra cosa? La conectamos durante el alta. | MEWS, Apaleo i Gmail, connectats avui. En fas servir un altre? El connectem durant l'alta. | MEWS, Apaleo and Gmail, connected today. Using something else? We build the connection during onboarding. |
| `showcase.gateLine` | Este es el resumen de un hotel de 45 habitaciones. | Aquest és el resum d'un hotel de 45 habitacions. | This is the brief for a 45-room hotel. |
| `showcase.gateCta` | ¿Quieres el de mañana para el tuyo? → | Vols el de demà per al teu? → | Want tomorrow's for yours? → |
| `emailShowcase.approvalLine` | Nada se envía sin tu visto bueno. | Res no s'envia sense el teu vistiplau. | Nothing sends without your yes. |
| `pricing.groupLine` | ¿Varios hoteles? El precio por alojamiento baja a partir del segundo. Escríbenos. | Diversos hotels? El preu per allotjament baixa a partir del segon. Escriu-nos. | More than one property? The per-property price drops from the second. Talk to us. |

### 3.8 Namespaces deleted

`comparison.*` (band retired) · `featuresSection.*` and `bundle.*` (absorbed by `sections`). `features.*` and `lib/features.ts` stay **only** if the FAQ still reads them — check before deleting.

---

## 4. Design deltas within Signal

No new tokens. Everything composes what v2.0 already defines.

| Delta | Detail |
|---|---|
| **Hero artefact** | The one structural change. Product window over the lower edge of the parallax hero, cropped by the section boundary. Existing card treatment, no new shadow. |
| **Proof-window pair** | `BriefingPreviewWindow` and `EmailDraftPreviewWindow` are a deliberate pair: same chrome, radius, shadow **and width — both full-bleed at `max-w-[1120px]`, copy above rather than beside** (decided at Phase D; three panes cannot fit a 7fr column, and band 3 matched to keep the pair true). They are bands 3 and 4, and the eye should read them as one argument in two parts. |
| **Where the marketing ground applies** | `.marketing-surface` is a page-shell class, not a per-band one, and it is deliberately scoped: **warm** on `/`, `/sample-brief`, `/contact`, plus `/privacy`, `/terms`, `/newsletter/confirm`, `/newsletter/unsubscribe` and the 404 — every route a prospect can reach from the site. **Neutral** on `/(auth)/*` and `/onboarding/*`, which are the app side and keep `--fonda-bg`; the split-screen brand panel carries the transition. **Phase I's `/trust` joins the warm set** — it is linked from the security band and the footer. The class sets the raw `--fonda-bg` token rather than only `--background`, which is what carries the warm ground into the hero scrim's `color-mix()` stops without editing `hero-parallax.tsx`. |
| **One marketing ground** | **The band alternation is retired (17 Sep).** It alternated `--fonda-bg` (#EEEEEE, neutral grey) with `--fonda-surface-2` (#F6F3EE, warm greige) — a change of *temperature*, not value, which read as the page changing its mind rather than as rhythm, and left the single grey band looking like a mistake. The whole marketing surface — landing page, works-with strip, hero scrim resolve, footer — is now one warm ground, `#F6F3EE`. Everything else in the palette is warm (borders #E2DDD3, inset #E4E0D7, text #1C1A16), so the neutral ground was the outlier. Separation between bands comes from the `border-t` hairlines and the vertical padding, as it does on the reference site. `--fonda-bg` is **not** changed globally: the dashboard keeps the neutral ground. Consequence: any nested well that used `#F6F3EE` *inside a band* (rather than inside a white window) now needs a different fill. `comingSoon` still carries no card shadow — visually "not yet". |
| **Eyebrow discipline** | Every band carries one: mono, uppercase, `tracking-[0.14em]`, two to four words, `--fonda-text-3`. **Two deviations, both deliberate, both hero-only (17 Sep):** the hero eyebrow uses `--fonda-text-2`, because `--fonda-text-3` over the watercolour's worst pixel measures 4.26:1 and fails AA — `--fonda-text-2` holds 5.88:1 on the same pixel; and below `sm` the hero badge alone drops to 11px/0.08em, because the eyebrow copy is long enough to wrap inside its pill at 360px. Section eyebrows keep 12px/0.14em and `--fonda-text-3` everywhere. Do not "harmonise" these back. |
| **`SquareMarker` over icons** | Bands 8 and 10 use the navy square. Signal §6 prefers this; the new bands must not introduce an icon set. |
| **Containment** | Any multi-cell group (bands 6, 9, 11) is one card with internal hairlines — never loose cells on the grey ground. The comment in the `stats` block explains why; it applies to all three. |
| **Mobile** | 24px gutter, no horizontal scroll, hero artefact legible for two lines. GTM §3.3 lists the mobile pass as **P0**: the GM reads the brief on a phone at 6:45, and that moment *is* the pitch. |
| **Motion** | `Reveal` only, with its existing `index` stagger. The parallax stays the single exception (Signal §7 v2.2). |

---

## 5. Components

| File | Action |
|---|---|
| `app/[lang]/page.tsx` | Reorder bands; delete `comparison` and `featuresSection`; add four new sections; rework the hero composition. |
| `components/marketing/briefing-preview-window.tsx` | Used in the hero **and** band 3. Add a `variant` prop (`hero` = cropped, `full` = complete) — do not fork the component. |
| `components/marketing/email-draft-preview-window.tsx` | Add the matched-reservation column beside the draft. Highest-value component work here. |
| `components/marketing/hero-parallax.tsx` | Unchanged. The artefact sits **outside** it — never on the parallax layer. |
| `components/marketing/vignettes.tsx` | Unchanged — the artwork is fine as it is. `FEATURE_VIGNETTES` lived in `page.tsx`, not here, and went out with the bento in Phase A; band 8 declares its own role→vignette map in `page.tsx` (§9.1, 13). |
| `lib/features.ts` | Keep only if the FAQ still reads it (see §3.7). |
| `lib/roadmap.ts` | **Source of truth for band 10.** Anything `coming-soon` there must not be claimed above band 10 on the site. |
| `dictionaries/{en,es,ca}.json` | Phase 0 copy swap (§3.0) + six new namespaces (§3.1–§3.7) + three deletions (§3.8). |
| `app/[lang]/(legal)/trust/` | New trust page (Phase H). |

---

## 6. Guardrails

Violating any of these is a bug, not a style choice.

1. **No hardcoded copy.** Every string ships through `dictionaries/*.json` in all three languages, or it doesn't ship.
2. **No traction claims.** No hotel count, no customer logo, no percentage — until a real pilot produces one with a name attached.
3. **No connection count.** `LIVE_INTEGRATIONS` and `ON_REQUEST_INTEGRATIONS` stay as they are. Moving a name between them is a product claim, not a copy edit.
4. **`lib/roadmap.ts` governs the site.** If a surface is `coming-soon` there, it cannot appear above band 10 here. Today that means **analytics, revenue, finance, operations, front-desk, oversight, sales-marketing and concierge are not claimed on the landing page.**
5. **`comingSoon` stays in the future tense**, in all three languages, forever.
6. **The hero subhead never gets shortened** below the four live surfaces. It is what makes the headline honest (`POSITIONING_V3.md` §1.2).
7. **WCAG AA holds**, especially hero text over the watercolour — the existing code comments document measured ratios. Re-measure if the scrim changes.
8. **The parallax is the only motion exception.** The overnight timeline uses `Reveal`'s existing stagger, which is the site's normal motion vocabulary — it is not a second exception, and it must not become one.
9. **Never the word "capa"** in ES/CA copy, and never *director* / *manager* as the category noun in any language.
10. **No segment words on the landing page.** *Independiente*, *boutique*, *pequeño* and their EN/CA equivalents come out (`settings.propertyTypePlaceholder` is a form hint and stays). Outbound targeting stays narrow — that lives in `GTM_STRATEGY.md` §4.3, not on the site. See `POSITIONING_V3.md` §1.4.

---

## 7. Claude Code phases

Paste one at a time. Each ends with a diff review and its own commit.

| Phase | What it does | Touches | Judgment needed |
|---|---|---|---|
| **0** | Hero and anchor copy swap | dictionaries only | none — mechanical ✅ run |
| **A-fix** | Restore `comparison` if Phase A was run from the draft that cut it | `page.tsx`, dictionaries | none |
| **0b** | Price off the homepage, beta out of the badge | dictionaries, `page.tsx`, JSON-LD | none — decided 17 Sep |
| **A** | Reorder bands, retire `comparison` and the bento, add the connection line | `page.tsx`, dictionaries | none — mechanical |
| **B** | The brief in the hero | `briefing-preview-window.tsx`, `page.tsx` | none — decided: keep the watercolour, float the window over it |
| **C** | Ungate the sample brief | `page.tsx`, dictionaries | none — invented data, fictional 45-room Barcelona hotel |
| **D** | Matched reservation beside the draft | `email-draft-preview-window.tsx` | none — same fictional hotel, same night as band 3 |
| **D-fix** | Pair the windows, add the sample-hotel fixture, add the brief request form | `page.tsx`, `lib/sample-hotel.ts`, `/sample-brief`, dictionaries | none — decided 17 Sep |
| **E** | The four parts of the day | `page.tsx`, dictionaries | none |
| **F** | The overnight timeline | `page.tsx`, dictionaries | none |
| **G** | Role cards | `page.tsx`, `vignettes.tsx`, dictionaries | none |
| **I** | Trust page — **runs before H** | new route, footer, sitemap | none — full page, stated as facts, no DPA claimed |
| **H** | On your side · Security · Coming soon | `page.tsx`, dictionaries | none |
| **J** | Mobile, accessibility, the `{brand}` token path | everything | none |

**Every decision in this table is closed as of 17 Sep** — the phases run end to end without stopping. Two things still need care rather than a call: C and D must invent the *same* hotel on the *same* night, and Phase B has two visual systems cohabiting, so check it on a phone before moving on.

### Phase 0 — the copy swap

```text
Phase 0 — marketing copy v3. Apply the strings in SITE_REDESIGN_V3.md §3.0 to
dictionaries/en.json, dictionaries/es.json and dictionaries/ca.json. Change ONLY
these keys, use the EXACT text given per language, and touch no other key:

  hero.badge, hero.headlineLine1, hero.headlineLine2, hero.subhead,
  hero.ctaPrimary, hero.ctaSecondary,
  meta.title, meta.description,
  footer.valueProp, footer.rights,
  auth.signupDesc, authAside.headline,
  cta.eyebrow, cta.headline, cta.subhead,
  pricing.note,
  contact.intro (phrase swap only — replace the named phrase, keep the rest of
  the sentence exactly as it is)

Keep all JSON structure, key names and interpolation tokens ({year}, {brand},
{price}) valid and intact. Keep the informal tú/tu register. Add or remove no
keys.

Note that hero.headlineLine2 no longer contains {brand}. HeadlineWithBrand in
app/[lang]/page.tsx splits that string on the token; verify it renders a
template with no token correctly before shipping — that path has never been
exercised.

Acceptance: all three files parse as valid JSON; git diff touches only the keys
above; and `grep -i` across the three dictionaries returns zero hits for
"director con IA", "director amb IA", "AI manager", "piloto automático",
"pilot automàtic", "on autopilot", "front office", "capa de operaciones",
"independiente", "independent hotels" and "boutique" — except
settings.propertyTypePlaceholder, which is a form hint and stays. Show me the
diff for all three files.
```
**Commit:** `feat(copy): reposition v3 — la IA que lleva la operativa`



### Phase A-fix — restore the comparison band

_Only needed if Phase A was run from the draft that retired `comparison`. Check first: if `grep -c comparison app/[lang]/page.tsx` returns 0, run this._

```text
Phase A-fix — restore the comparison band. An earlier version of this spec told
you to delete it; that decision was reversed. Nothing has been committed, so
HEAD still has everything.

1. Recover the comparison.* key block from git for all three dictionaries —
   `git show HEAD:dictionaries/es.json` (and en.json, ca.json) still contains it.
   Re-insert the block into dictionaries/{es,en,ca}.json with the same key names
   and values.

2. Recover the comparison <section> JSX from `git show HEAD:app/[lang]/page.tsx`
   and re-insert it into app/[lang]/page.tsx, keeping every explanatory comment
   that travelled with it. Place it AFTER howItWorks and BEFORE bundle, so the
   order is:

   1 hero · 2 works-with · 3 showcase · 4 emailShowcase · 5 howItWorks ·
   6 comparison · 7 bundle · 8 stats · 9 pricing · 10 faq · 11 cta

3. Re-fix the alternating section ground so the two-band pulse still reads with
   the band reinserted.

4. Trim the rows that now duplicate what other bands SHOW rather than describe.
   Delete the arrival-times pair (manual3 / fondas3) — Phase F puts that on the
   overnight timeline — and the morning-brief pair (manual5 / fondas5), which
   band 3 shows in full. Keep rows 1, 2 and 4. Remove the deleted keys from all
   three dictionaries rather than leaving them orphaned, and renumber the
   remaining keys so they stay contiguous.

Acceptance: the comparison band renders in all three locales with three rows;
no orphaned comparison.* keys; the section order matches the list above; all
three dictionaries parse as valid JSON.
```
**Commit:** `fix(site): restore the comparison band, trimmed to three rows`

### Phase 0b — price and beta

```text
Phase 0b — take the price off the homepage. Apply the strings in
SITE_REDESIGN_V3.md §3.0b to dictionaries/en.json, es.json and ca.json:

  hero.badge (drop "· Beta privada" / "· Private beta"),
  pricing.price, pricing.priceUnit, pricing.lead,
  stats.priceTop, stats.priceValue, stats.priceLabel

Then in app/[lang]/page.tsx: the pricing band must no longer render a euro
figure — the big number becomes pricing.price as plain text with priceUnit
beneath it, and the existing "Habla con nosotros" button stays as the action.
The stats band's fourth cell renders the new strings.

Also remove the price fields from the JSON-LD Offer emitted around line 281, so
the structured data does not state a price the page no longer states. Leave the
rest of the Product markup intact. PRICE_MONTHLY_EUR in
app/[lang]/(legal)/company.ts stays — it is still the real number, just not
public.

Finally, make sure the private-beta status is stated plainly in exactly one FAQ
answer, in all three languages, since the hero badge no longer carries it.

Acceptance: `grep -rn "199" app/ components/ dictionaries/` returns nothing
outside company.ts; no euro figure renders anywhere on the landing page; the
JSON-LD validates and states no price; one FAQ answer states the beta.
```
**Commit:** `feat(copy): take the price off the homepage until billing ships`

### Phase A — reorder, retire, reconnect

```text
Phase A — page architecture. In app/[lang]/page.tsx, reorder the landing
sections to this exact sequence:

  1 hero · 2 works-with · 3 showcase (briefing) · 4 emailShowcase ·
  5 howItWorks · 6 comparison · 7 bundle · 8 stats · 9 pricing · 10 faq · 11 cta

Delete the `featuresSection` bento entirely, along with its featuresSection.*
keys in dictionaries/en.json, es.json and ca.json. Before deleting it, check
whether lib/features.ts and the features.* keys are still read by the FAQ or
bundle; if they are, leave both in place.

KEEP the `comparison` section — an earlier draft of this spec retired it and
that decision was reversed. Move it to sit right after howItWorks (which Phase F
later replaces with the overnight timeline), and trim any of its rows that
duplicate what bands 3, 4 and 5 already show: three sharp rows beat five soft
ones.

Move whole <section> blocks — do not rewrite their internals, and preserve every
explanatory comment with the block it describes. Alternate the section ground
between --fonda-bg and --fonda-surface every two bands, keeping the existing
border-t hairlines.

Then add trust.connectLine (SITE_REDESIGN_V3.md §3.6) to all three dictionaries
and render it as a single centred line under the works-with integration chips.
Do NOT add a connection count anywhere.

Acceptance: renders in all three locales with no missing-key warnings;
`grep -ri featuresSection app/ components/ dictionaries/` returns nothing; the
comparison band still renders, in its new position; the diff touches only
page.tsx and the three dictionaries.
```
**Commit:** `refactor(site): reorder landing bands, retire the bento`

### Phase B — the artefact in the hero

```text
Phase B — hero composition. Add a `variant?: "hero" | "full"` prop to
components/marketing/briefing-preview-window.tsx, defaulting to "full". In
"hero", the window renders at max-w-[1120px] with its lower portion clipped by
the parent section boundary — about 30% on desktop, about 15% on phones, so at
least two lines of brief prose stay legible at 360px.

Decided: the watercolour STAYS. Do not retire HeroParallax and do not replace
the painting with a gradient.

In app/[lang]/page.tsx render <BriefingPreviewWindow variant="hero" /> in the
hero section BELOW the CTA row and OUTSIDE <HeroParallax>. It must not sit on
the parallax layer and must not move on scroll. Use the existing card treatment
(rounded-[18px] bg-card shadow-card plus the hairline border). No new tokens, no
new shadow, no new motion.

Acceptance: no horizontal scroll at 360px; hero text still passes WCAG AA over
the watercolour — the measured ratios in the existing comments must still hold;
the window is static while the parallax moves behind it.
```
**Commit:** `feat(site): put the brief in the hero`

### Phase C — ungate the brief

```text
Phase C — band 3. Render the full BriefingPreviewWindow (variant="full") in the
showcase section with complete brief prose for a 45-room Barcelona hotel:
realistic Spanish guest names and a plausible occupancy pattern. The hotel is
FICTIONAL and the data INVENTED — do not use real reservation data, and do not
describe it as anonymised real data. Nothing truncated, nothing blurred, no
email gate.

Write down the hotel name, the date and the occupancy you invent: Phase D must
reuse exactly the same hotel on exactly the same night.

Underneath, add showcase.gateLine and showcase.gateCta from
SITE_REDESIGN_V3.md §3.7 to all three dictionaries and render them as one line
plus a link to /sample-brief, which keeps its gate for the personalised version.

Acceptance: the generic brief is fully readable with no interaction;
/sample-brief still gates the personalised one; all three locales render.
```
**Commit:** `feat(site): ungate the sample brief`

### Phase D — the communications artefact

```text
Phase D — band 4. Upgrade components/marketing/email-draft-preview-window.tsx
so it shows three things at once, left to right: the guest's incoming email, the
matched reservation pulled from the PMS (guest name, room type, dates, status),
and the drafted reply. On phones the three stack in that order.

Use invented but realistic Spanish data consistent with the brief in band 3 —
the SAME fictional hotel on the SAME night, reusing the guest names and room
types that already appear there. A reader comparing the two windows must see one
hotel, not two. Add emailShowcase.approvalLine (§3.7) to all three
dictionaries and render it as a single SquareMarker line beneath the window.

Match the chrome of BriefingPreviewWindow exactly: same radius, shadow, border
and max width. These two windows are a deliberate pair.

Acceptance: three panes visible at >=1024px, stacked below; all three locales
render; identical chrome to the briefing window.
```
**Commit:** `feat(site): show the matched reservation beside the draft`

### Phase D-fix — the pair, the fixture, and the missing gate

_Three things surfaced by Phase D. Run before Phase E._

```text
Phase D-fix. Three items, in order.

1. MAKE BANDS 3 AND 4 A REAL PAIR.
Band 4 had to go copy-above-window because three panes don't fit in a 7fr
column. Approved — and band 3 now matches it: section header stays two-column,
but the BriefingPreviewWindow goes full width at max-w-[1120px], same as band 4.
The two windows then share chrome AND width, which is what "a deliberate pair"
in this spec means. The six brief rows also stop being cramped at 625px.

Check the result at 1024 and 1280: three full-width windows now appear in the
first four bands (hero cropped, band 3 complete, band 4 three panes). That is
intended — one frame, three different fills. If it reads as monotonous, fix it
with the existing ground alternation, not by changing the widths back.

2. ONE SAMPLE HOTEL, IN ONE PLACE.
Right now the fictional hotel is defined in at least four files: the homepage
bands say Hotel Pati Blau / 45 rooms, app/[lang]/sample-brief/content.ts says
Hotel Miravent / 42 rooms, and the dictionaries carry "45 rooms" at two places
and "42 rooms" at another. That is why the gate line promises 45 and the page
delivers 42, and it will drift again next phase.

Create a single fixture — lib/sample-hotel.ts — exporting the canonical
invented hotel: name, room count, city, the date of the sample night, and the
guest names used in bands 3 and 4 (Elena Vidal, the Aguirre-Miralles). Use
Hotel Pati Blau, 45 rooms, Barcelona, since the homepage bands already commit
to it and they are the more-read surface. Rewrite sample-brief/content.ts to
read from the fixture, and replace every hardcoded room count in the three
dictionaries with an interpolation token fed from it, exactly as {price} works
today.

Acceptance: `grep -rn "42" ` finds no room count anywhere; `grep -rni miravent`
returns nothing; one hotel name and one room count across the homepage,
/sample-brief and all three locales.

3. THE GATE THAT WAS NEVER THERE.
Phase C moved "the gate" from the generic brief to the personalised one, but
/sample-brief has no gate and never did. So the homepage brief is now ungated
and nothing on the site captures an email. Do NOT gate the sample — a static
sample behind a form converts badly and it is the thing that proves the
product. Instead, put the ask underneath it.

Add a request form at the bottom of /sample-brief: hotel name, first name,
email, submit. Copy: ES "¿Quieres el resumen de mañana para tu hotel?" with
"Te lo preparo yo y te lo mando por la mañana. Sin conectar nada." — write the
CA and EN natively, add all strings to the three dictionaries under
sampleBrief.request*.

Reuse the existing newsletter pipeline (lib/newsletter.ts and
components/marketing/newsletter-form.tsx) rather than building new storage:
same double opt-in, one extra required field for the hotel name, and a distinct
source tag so these leads are separable from newsletter signups. Do not add a
new table or a new email provider.

Acceptance: the form submits and stores in all three locales; the hotel-name
field is required; leads are distinguishable from newsletter signups by source;
the sample brief itself remains fully readable with no interaction.
```
**Commit:** `fix(site): pair the proof windows, one sample-hotel fixture, add the brief request form`

### Phase E — the four parts of the day

```text
Phase E — band 7. Replace the `bundle` section with a `sections` band using the
copy in SITE_REDESIGN_V3.md §3.1. Add the `sections` namespace to
dictionaries/en.json, es.json and ca.json with the EXACT strings given, keeping
the {brand} token where it appears, then delete the bundle.* keys.

Layout: eyebrow, headline and lead in the standard two-column header, then ONE
card containing four cells with internal hairlines — the same containment
treatment as the stats band, and for the same reason documented in its comment.
Two columns on desktop, one on phones.

These four are the live surfaces, per lib/roadmap.ts. Do not add analytics,
revenue, finance, operations, front-desk, oversight, sales-marketing or
concierge to this band — they are coming-soon and belong in band 10.

Acceptance: all three locales render; no bundle.* keys remain referenced;
nothing coming-soon appears in this band.
```
**Commit:** `feat(site): the four parts of the day, in one place`

### Phase F — the overnight timeline

```text
Phase F — band 5. Replace the howItWorks section with a `nightShift` band using
the copy in SITE_REDESIGN_V3.md §3.6. Add the `nightShift` namespace to
dictionaries/en.json, es.json and ca.json with the EXACT strings given, keeping
the {brand} token in `note`. Keep the howItWorks.* keys — its three steps are
reused as a compact strip at the top of this band (Conecta · Trabaja de noche ·
Te lo encuentras hecho), not as their own section.

Layout, desktop: two columns. Left holds the eyebrow, headline, lead and the
three-step strip; right holds a seven-row timeline, rows r1–r7, each as an hour
label in a narrow left gutter plus a card row containing the title and a chip.
A hairline runs vertically through the hour gutter, connecting the rows. Phone:
one column, hour label above each row, no gutter rule.

Motion: reveal the rows on scroll using the existing Reveal component with its
index prop, about 120ms of stagger. No autoplay, no loop, no infinite animation
— it plays once as the band enters the viewport and then sits still. Under
prefers-reduced-motion, render every row immediately with no stagger and no
transform. Do NOT introduce a new animation library or any scroll-linked
transform beyond what Reveal already does.

Chips use the existing badge treatment, muted rather than accent.

Render nightShift.kicker directly beneath the timeline, at body size and full
contrast — it is the band's closing argument, not a caption. Then
nightShift.note underneath it in --fonda-text-3. The note is required, not
decorative: it is what makes a dramatised timeline honest. Do not ship the band
without both lines.

Acceptance: all three locales render; both the kicker and the note are present; prefers-reduced-motion
disables the stagger; no new animation dependency in package.json; no horizontal
scroll at 360px; every row's time and chip matches vercel.json and
app/api/cron/briefing/route.ts.
```
**Commit:** `feat(site): the overnight timeline`

### Phase G — role cards

```text
Phase G — band 8. Add an `audience` band after `sections` with three role cards
— Propietario, Dirección, Recepción — using the copy in SITE_REDESIGN_V3.md
§3.2. Add the `audience` namespace to all three dictionaries with the EXACT
strings given.

Each card: role label, sub-label, promise as the card headline, four
SquareMarker bullets, then the existing Button in its secondary variant linking
to /signup. Remap FEATURE_VIGNETTES in components/marketing/vignettes.tsx to one
vignette per role.

Acceptance: three cards stack cleanly at 360px; all three locales render; no
orphaned featuresSection.* references anywhere in app/ or components/.
```
**Commit:** `feat(site): segment by role instead of by feature`

### Phase H — the three objection bands

```text
Phase H — bands 9, 10, 11. Add three sections after `audience`, in this order:
onYourSide, security, comingSoon. Copy from SITE_REDESIGN_V3.md §3.3 (onYourSide), §3.4 (security) and
§3.5 (comingSoon). Add those three namespaces to all three dictionaries with the
EXACT strings given, keeping the {brand} token where it appears.

Layout:
 - onYourSide: text only. Eyebrow, headline, lead, three SquareMarker bullets.
   No card, no illustration, no icons.
 - security: headline and lead on the left, three cells on the right in a single
   card with internal hairlines (stats treatment), plus the cta link to /trust.
 - comingSoon: the lighter ground, no card shadow, four items. It must read as
   "not yet" at a glance.

Every comingSoon string must be in the FUTURE tense in all three languages.
Reject any present-tense line in review.

Acceptance: all three locales render with no missing keys; comingSoon is future
tense throughout; no horizontal scroll at 360px; no new icon set introduced; the
security band's cta resolves to the /trust page built in Phase I, with no 404.
```
**Commit:** `feat(site): add on-your-side, security and coming-soon bands`

### Phase I — trust page

```text
Phase I — trust page. Add a localised page at /trust under app/[lang]/(legal)/
covering: what Fondas reads, what it stores, where it is hosted, what it never
does, the deletion policy, and the controller/processor split. Source the
wording from POSITIONING_V3.md §4 and the existing faq.a5 — "stored encrypted,
EU-hosted, used only to produce your briefs and drafts, deleted on offboarding".

Decided: publish the full page now, stated as facts. The controller/processor
split is a statement of fact under GDPR and holds for a sole trader, so say it.
Do NOT claim a signed DPA, and claim no certification we do not hold — there is
no ISO and no SOC 2 here. Say what is true: what we read, what we store, where
it is hosted, what we never do, and what happens on offboarding.

Link it from the footer, and add it to the sitemap and the hreflang alternates.
Do not try to wire the security band's cta — that band does not exist yet;
Phase H wires its own link to this page when it ships.

Acceptance: reachable in all three locales; no certification claimed; sitemap
and hreflang updated; the security band's cta resolves.
```
**Commit:** `feat(site): add trust page`

### Phase J — mobile, accessibility, and the token path

```text
Phase J — final pass across the whole landing page at 360px and 390px. No
horizontal scroll anywhere, 24px side gutters, the hero artefact legible for at
least two lines of prose, tap targets >=44px, and every text/background pair at
WCAG AA — re-measuring the hero over the watercolour if the scrim changed in
Phase B.

Also verify HeadlineWithBrand in app/[lang]/page.tsx renders correctly for a
headlineLine2 that contains NO {brand} token, since the v3 hero no longer uses
it. That code path has never been exercised.

Produce a 360px screenshot of every band.

Two gaps carried forward from E-pre-fix, close them here:
 - /newsletter/confirm and /newsletter/unsubscribe were AA-measured in their
   invalid-token state only (5 elements each). Measure the other states —
   success, already-confirmed, expired — since these are the landing pages of
   the sample-brief conversion flow.
 - /onboarding could not be measured directly (auth-guarded, redirects to
   /login); its neutral ground was confirmed from source. Measure it signed in.

Acceptance: screenshots for all fifteen bands; zero contrast failures; every
state of both newsletter routes measured; /onboarding measured signed in; the
no-token headline path exercised and correct.
```
**Commit:** `fix(site): mobile and accessibility pass for v3`

---

## 8. Verification checklist

- [ ] All three dictionaries parse as valid JSON; no missing-key warnings in any locale.
- [ ] `grep -i` across the dictionaries: zero hits for *capa*, *director con IA*, *director amb IA*, *AI manager*, *piloto automático*, *pilot automàtic*, *on autopilot*, *front office*.
- [ ] Every claim on the page is demonstrable in the 20-minute demo (`POSITIONING_V3.md` §0.4) or sits inside `comingSoon`.
- [ ] Nothing marked `coming-soon` in `lib/roadmap.ts` is claimed above band 10.
- [ ] `comingSoon` is future tense in ES, CA and EN.
- [ ] `nightShift.kicker` and `nightShift.note` are both on the page, and every timeline row still matches the schedules in `vercel.json`.
- [ ] No traction number and no connection count anywhere on the site.
- [ ] **No price figure on the marketing surface.** `/terms` is the one deliberate exception: it is a contract, and a billing clause that states no price is a worse document than one that does. `PRICE_MONTHLY_EUR` therefore has exactly two readers — `company.ts` and the Terms billing clause — and if the price ever changes, Terms changes with it.
- [ ] Every prospect-reachable route carries `.marketing-surface`; no warm-to-grey seam on any footer link.
- [ ] The JSON-LD `Offer` states no price.
- [ ] The private beta is stated in exactly one FAQ answer.
- [ ] No *independiente* / *boutique* / *pequeño* anywhere on the landing page or in the footer.
- [ ] `LIVE_INTEGRATIONS` and `ON_REQUEST_INTEGRATIONS` unchanged unless a connection actually shipped.
- [ ] The fourteen eyebrows, read in order, tell the story on their own.
- [ ] 360px screenshots of every band, no horizontal scroll.
- [ ] WCAG AA across the page, hero included — re-checked against `--fonda-surface-2` as the light band ground, not white.
- [ ] `FONDA_DESIGN_IDENTITY.md` §2 records `--fonda-surface-2` as a band ground.
- [ ] Migration 0021 is applied in every environment the site is deployed to, not just the one checked.
- [ ] `hello@fondas.app` receives mail and the footer has no dead links (GTM §3.3, both P0).
- [ ] Read the ES hero, the ES category line, the ES security headline and the nightShift kicker aloud to one hotelier before the outreach wave restarts.
- [ ] Every phase is its own commit, so any single band can be reverted without unpicking the rest.

---

## 9. Execution log — read this first in a new session

_Last updated 18 September 2026. Branch `site/v3-redesign`, base commit `c911403`, head `d91fe6f`. Not merged to `main` — production still serves the old site._

**Done:** Phase 0 · 0b · A · A-fix · B · C · D · D-fix · E-pre · E-pre-fix · E · F · G · I · H — all verified by computed style and AA-swept.
**Next:** **Phase J**, the last one. Then merge to `main`. *(I and H were deliberately swapped — the security band's cta points at `/trust`, so building the page first meant the link never dangled. `/trust` also joined the `.marketing-surface` warm set.)*

All fifteen bands are built. A cold session needs this file and nothing else — every string is in §3. Start with: *"Read SITE_REDESIGN_V3.md, including §9. Phases 0 through I are done; run Phase J."*

> **Standing rule for every phase, whether or not the prompt repeats it.**
> The session is cleared between phases, so this log is the only memory that survives. Before committing a phase, update §9: move it from **Next** to **Done**, add anything you decided along the way to §9.1 with its reason, and add anything you could not verify to §9.3. A deviation that isn't written here will be silently reverted by the next session, which will be reading the phase prompt and nothing else.
>
> Commit doc updates separately from code, as Phase E did (`09f9ff8` then `a2f476d`) — it keeps each phase's code diff readable.

### 9.1 Decisions already taken — do not undo these

Each was made deliberately, and several reverse an earlier draft of this same document. A fresh session reading only the phase prompts could plausibly "fix" any of them back.

| | Decision |
|---|---|
| **1** | **The `comparison` band stays** (band 6, after the overnight timeline), trimmed to three rows. An earlier draft retired it; that was reversed. |
| **2** | **One warm marketing ground.** `.marketing-surface` = `#F6F3EE` on every prospect-reachable route. The per-band alternation is retired. `--fonda-bg` is untouched at `:root` — the dashboard stays neutral. §4. |
| **3** | **Two hero-only eyebrow deviations**: `--fonda-text-2` (AA over the watercolour) and 11px/0.08em below `sm` (the badge wrapped at 360px). Section eyebrows keep 12px/0.14em and `--fonda-text-3`. §4. |
| **4** | **Bands 3 and 4 are full-width with copy above**, not copy-beside-window. Three panes don't fit a 7fr column, and band 3 matched so the pair stays true. |
| **5** | **No price figure on the marketing surface.** `/terms` is the one deliberate exception — it is a contract, and a billing clause naming no price is a worse document. `PRICE_MONTHLY_EUR` has exactly two readers: `company.ts` and that clause. |
| **6** | **`lib/sample-hotel.ts` is the only definition of the sample hotel** — Hotel Pati Blau, 45 rooms, Barcelona, with the guests and the night. Bands 3 and 4 and `/sample-brief` all read from it. Never hardcode a hotel name, room count or date again. |
| **7** | **Last-touch attribution** on `newsletter_subscribers.source`: a newsletter subscriber who later requests a brief flips to `sample_brief`. `sample_requested_at` is the reliable lead marker. |
| **8** | **`lib/roadmap.ts` governs the landing page.** Anything `coming-soon` there cannot be claimed above the `comingSoon` band. Today that rules out analytics, revenue, finance, operations, front-desk, oversight, sales-marketing and concierge. |
| **9** | **The three-step strip keeps the full `howItWorks` steps — titles *and* descriptions.** Phase F's prompt names them as "Conecta · Trabaja de noche · Te lo encuentras hecho", which is the gist, not copy: §3 ships no strings for the strip. The existing descriptions are the only place the setup fear is still answered ("Unos minutos, una sola vez"), so they stay. `howItWorks.eyebrow`, `.headline` and `.lead` are now unread — the band uses `nightShift`'s — but the keys stay in all three dictionaries in case the strip ever grows a heading. |
| **10** | **Band 5's stagger is `index={i * 2}`, not `index={i}`.** `Reveal`'s step is 60ms and §3.6 asks for ~120ms, so the rows double the index rather than the shared component changing for one band. The reduced-motion block in `globals.css` now also zeroes `transition-delay` — a CSS `!important` beats Reveal's inline delay, so the stagger is *disabled* under reduced motion rather than merely invisible. |
| **11** | **No sticky left column in band 5**, though §2 allowed it "if it's cheap". It isn't: a `position: sticky` descendant of `Reveal` is fragile for the reason reveal.tsx's own comment gives, and the two columns are close enough in height that sticky would buy almost nothing. |
| **12** | **Band 5's chips fill with `--fonda-surface-2`, not the `--fonda-surface` of Signal §5.4.** The badge spec assumes a chip on the page ground; these sit inside a white card, where a white fill is a no-op. `--fonda-text-2` on `#F6F3EE` measures 6.9:1, and the hairline still holds the pill's shape. |

| **13** | **`FEATURE_VIGNETTES` was never in `vignettes.tsx`.** Phase G's prompt says to remap it there; it lived in `page.tsx` and went out with the bento in Phase A. The artwork component is untouched — band 8 declares its own `AUDIENCE` map with a vignette per role: `arch` for Propiedad y grupo, `coffee` for Dirección, `key` for Recepción. Navy is spent once across the three, by the key's fob (`vignettes.tsx` reserves the accent for `key` and `sail`), so the row keeps the one-accent rule. These are the only vignettes left on the site — the footer's olive went in E-pre-fix, which was a footer call, not a retirement of the system. |
| **14** | **Band 8's cards carry `hero.ctaPrimary` as their CTA label.** §3.2 ships no CTA string for a band whose spec asks for a button. Reusing the label the page already says for `/signup` beats inventing a fourth wording, and it needs no new key in three dictionaries. If band 8 ever earns its own verb, add `audience.cta` — do not hardcode one. |
| **15** | **Three across only at `lg`, not `md`.** At `md` the 1120px cap leaves ~224px a column, which puts most of the twelve bullets on three lines. Below `lg` the cards stack full width, and the CTA goes auto-width there (`self-stretch sm:self-start lg:self-stretch`) — a stretched button on a 960px card is a metre of fill around two words. On a phone it is full width again, which is the thumb-friendly read. |
| **16** | **The card sub-label is plain text, not a second eyebrow.** Mono uppercase there would have put four eyebrow-shaped strings in one band and diluted the spine §4 asks the eyebrows to be. The band's one eyebrow is "Para quién es". |
| **17** | **Band 8's buttons are `size="lg"`.** Every other button on the landing page is, and the default `h-10` is 40px — under the 44px tap target Phase J has to certify. |
| **18** | **The trust page is LOCALISED; `/privacy` and `/terms` stay English-only.** Its copy lives in the new `trustPage` namespace in all three dictionaries. The English-only rule on the other two is about *legal text needing professional translation*; `/trust` is not legal text, it is the answer to *"¿están seguros mis datos?"* asked by a GM reading Spanish, and it is where band 10's cta sends them. It renders no `legal.englishNotice`. The namespace is `trustPage`, not `trust` — `trust` was already the works-with band. |
| **19** | **The footer's Security link now points at `/trust`, not `/privacy#security`.** Same question, plain words, in the reader's language, and the trust page links on to the policy for anyone who wants the legal version. The `#security` id stays declared on the privacy page; it simply has no footer link pointing at it any more. `footer.cookies` still goes to `/privacy#cookies`. No new dictionary key was needed — `footer.security` already said "Seguridad". |
| **20** | **The page states, out loud, that we hold no ISO 27001 and no SOC 2.** §7 said to claim no certification we do not hold; the page goes one step further and names their absence in a short "Lo que todavía no tenemos" section, because a GM who has to ask has already assumed the worst. Do not add a badge, a seal or a "compliant with" line here unless the certificate exists. |
| **21** | **Every claim on `/trust` is checked against code, not against the pitch.** The read-only line is true because Apaleo's scopes are `reservations.read rateplans.read setup.read` and MEWS is called only on `getAll` endpoints; "nothing sends without a person" is true because `sendReply` is a server action behind a button; "disconnect erases the credentials that moment" is true because `PMS_CREDENTIAL_COLUMNS` nulls them in the same update, with the synced rows purged in the same step if the box is ticked. **If any of those change, the matching line on `/trust` changes with them** — the page header comment says so too. |
| **22** | **`/trust` sits in the `(legal)` route group, so it wears the reduced legal chrome**, not the marketing header and footer that `/contact` wears. The group layout already applies `.marketing-surface`, so it joins the warm set for free, and the wordmark + language switcher + "Inicio" is enough of a way back for a page a reader arrives at mid-decision. Sitemap priority is 0.5 — above the legal pages' 0.3, because it has real search intent. |
| **23** | **Band 9's three bullets are a LIST, not cells — no card.** §2 says band 9 has no card; §4 lists band 9 among the multi-cell groups that must be contained in one card with internal hairlines. The two only conflict if the bullets are cells. They are one stacked column hanging off the lead, which needs no container, so both rules hold. **Do not turn them into a three-across grid** — the moment they become cells, §4's containment rule bites and the band loses the thing §2 says gives it its weight. |
| **24** | **Band 11 reads as "not yet" by ELEVATION, not by ground.** §2 asked for a "lighter ground", which was written while the page still alternated band grounds; that alternation was retired in §4 decision 2, so the surviving instruction is "no card shadow". The band is one container with internal hairlines, a hairline outline, **no fill and no shadow** — the exact ranking the comparison band already uses for its by-hand column ("floats as a white card" vs "sits back at ground level"). No fill rather than white-without-shadow: a white card with its shadow removed just looks like a card that lost its shadow. Measured: `box-shadow: none`, `background: rgba(0,0,0,0)`, 1px `#e2ddd3` hairlines. |
| **25** | **Band 11's marker is the navy square HOLLOW** — same 7px, same 2px radius, `border` instead of `background`. It is the one mark on the page that says "not yet" without words, and it introduces no icon set (§4). Drawn inline in the band rather than added as a `SquareMarker` variant: the filled square means *live* on four other bands, and giving the shared component a prop that means the opposite would make it ambiguous everywhere it is used. |
| **26** | **Band 10's cta and `/trust`'s outbound link share one treatment** — ink, `underline decoration-border underline-offset-4`, ink on hover, the same as `showcase.gateCta`. Not accent: §4 keeps navy for content and never for chrome. The arrow lives inside the dictionary string in all three languages, so it travels with the translation instead of being glued on in JSX. |
| **27** | **`comingSoon`'s headline and lead use the Spanish/Catalan present-for-future** ("Lo que **llega** durante el piloto", "que **llegan** mientras dure tu piloto"). These are §3.5's own strings, shipped verbatim, and the tense is carried by the line between them — *"Escrito en futuro a propósito: hoy no lo hace."* The future-tense rule bites on the four ITEM descriptions, which are future throughout (`llegará`, `incluirán`, `lo vas a leer`). Do not "fix" the headline into a future tense that no one says out loud. |

### 9.2 Environment state

- **Migration `0021_sample_brief_requests.sql` is applied** to the live Supabase project (`newsletter_subscribers.source`, `hotel_name`, `sample_requested_at`). Verified with real submissions in all three locales, rows since deleted. If a separate Supabase project backs any preview environment, it needs the migration too.
- The branch is **not** merged to `main`, so production still serves the old site. Merge after Phase J.

### 9.2b Rulings on Phase F's open items (18 Sep)

**The nav label stays "Cómo funciona" — this is settled, not outstanding.** The band it points at is now titled "Mientras el hotel duerme", but a nav label's job is to predict what the reader will find, not to match the heading. "Cómo funciona" predicts an explanation and the band contains one — the three setup steps are right at the top of it. The evocative title would make a worse nav item, because a scanner reading the header can't tell what it leads to. Do not rename the label or the `#how` anchor.

**The chips wrapping between 1024–1279px is Phase J's, and the fix is a layout one.** Three of seven chips take a second line at that range, which breaks the rhythm of seven equal rows at a very common laptop width. When Phase J fixes it: move the chip below the title at that breakpoint, or reduce the hour gutter — **do not shorten the chip strings.** "Cada 15 min" and "Cada 5 min" are the two rows that prove Fondas never stops, and abbreviating them costs the band its most surprising fact.

### 9.3 Still open

- ~~`/trust` does not exist yet (Phase I).~~ **Shipped** — `app/[lang]/(legal)/trust/page.tsx`, live in all three locales, in the sitemap with hreflang. Phase H's `security.cta` links to it with `localizedHref(locale, "/trust")`.
- Fifteen bands is long, and all fifteen are now built. Watch scroll depth once live; if bands 6 and 7 both underperform, band 6 is the one to cut.
- The `stats` band (12) is the one band with **no eyebrow**, against §4's "every band carries one". Pre-existing, not introduced by H. The spine still reads without it — fourteen eyebrows, hero badge included, exactly as §8's checklist expects. Decide in Phase J whether to give it one or to write the exception down.
- Two measurement gaps carried into Phase J: the newsletter routes were AA-checked in their invalid-token state only, and `/onboarding` was confirmed from source rather than measured (auth-guarded). Neither is believed to be a problem; both are unverified.
- Between 1024 and 1279px, three of the timeline's seven chips wrap onto a second line inside their card, so those rows sit taller than the rest. Measured, not broken — the band is legible and the hour stays centred on its row. It resolves itself at 1280+ and below 1024; fix it only if the tablet read bothers someone, and fix it by moving the two-column split to `xl`, not by shrinking the chip.
- The header and footer still label the `#how` anchor "Cómo funciona", which now lands on a band whose eyebrow reads "Mientras el hotel duerme". Deliberate for now — the strip inside it *is* the how-it-works answer, and §3 ships no new `nav` string. Revisit with the nav pass in Phase J.
