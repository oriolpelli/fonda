# Fondas — Positioning & GTM v3

_Owner: Oriol · 17 September 2026 · Status: proposal, pending one decision (§1.5)_

**What this amends.** `FONDA_MARKETING_VOICE.md` §1–§4 (the "AI manager" repositioning) is **retired** by this document. `GTM_STRATEGY.md` stays the source of truth for market, ICP, pricing and funnel; this file replaces its **§3.1 (positioning)**, **§4.7 (outreach sequence copy)**, **§4.8 (the demo)**, **§4.9 (objections)** and **§4.13 (the one-pager)**. Everything else in that file stands.

**Why now.** We're inside the Sep 7 – Oct 15 window — the best selling window of the year per §4.4. The page and the pitch need to say the same true thing before the outreach wave lands.

---

## 0. The diagnosis

### 0.1 There is a gap between what the page claims and what the product does

Live today in `dictionaries/*.json`:

> `hero.subhead` — "An AI manager for your hotel — it **prices your rooms against the competition**, **drives upgrades and extras**, **sends guests offers tailored to their stay**, and briefs you each morning."

Live today in the product (`GTM_STRATEGY.md` §1.2):

> morning brief · email assistant (drafts, review-before-send) · check-in-time chasing · ask-anything chat. MEWS wired; Apaleo code-complete but unproven. Gmail only.

There is no rate engine, no comp-set feed, no offer engine. Three of the four things the hero promises cannot be demoed. A GM who reads that line and then sits through the 20-minute demo experiences the demo as a **downgrade**. In a small industry where a badly-timed first impression is expensive (§4.4), a badly-*sized* first impression is worse.

**This is the real problem.** It isn't a wording problem, and no new headline fixes it on its own. The rule below does.

### 0.2 "AI manager" is also structurally the wrong category word

Independent of the claim gap, the category noun works against us:

- **It is a displacement frame.** A *manager* is a person with authority. The moment you claim it, the buyer evaluates you against a human they already employ or can't afford — and a €199/mo product loses that comparison every time. It also invites the question that kills boutique deals: *"¿esto sustituye a mi recepcionista?"*
- **It contradicts our own guardrail.** `FONDA_MARKETING_VOICE.md` §2 forbids "runs itself / on autopilot" and insists the human keeps the judgment calls — then the hero claims the job title of the person making them.
- **It is the platforms' language, not ours.** Apaleo ships "Copilot"; Mews raised $300M for "agentic autonomous hotel management." Fighting for the manager/copilot noun is fighting funded incumbents on their chosen ground.
- **It undersells the only thing we have that they can't.** Not authority — **neutrality and the inbox**.

### 0.3 What Otel AI actually does on its page, and what transfers

Otel's homepage (read 17 Sep 2026) works on four mechanics, none of which require their budget:

1. **Three-layer hero.** Category eyebrow (`THE OPERATING ADVANTAGE FOR HOTELS.`) → outcome headline ("The AI layer that gives your mornings back") → **one mechanism sentence** ("reads every system your hotel runs on as one hotel, then hands your team each decision with the case already made"). Never a capability list.
2. **The artefact is the argument.** The hero is a full simulated morning brief with absurd specificity — €33,512 room revenue, −€4,222 vs STLY, three executive rooms against five standard arrivals, named staff. They show; they don't describe.
3. **Every line kills one named fear.** "Nothing migrates, nothing gets replaced, even the ones with no API" · "Nothing goes live without your yes" · "Every answer shows its working" · "Trained on the job... never on your data" · "Twenty minutes, your data, no migration."
4. **Proof carries the claim.** Two named case studies, named humans with titles, odd non-round numbers (+8.6%, 110.4, ~120/mo, 2→10), ISO 27001, IHF membership, and an honest "SOC 2 still in observation."

**What does not transfer:** the category word itself (we'd be the second one saying it and lose the comparison), the 100+-integration arms race, and the results band — they have customers and we have zero. Copying a results band with invented numbers is the fastest way to lose a small industry.

### 0.4 The v3 rule

> **Every claim on the homepage must be demonstrable inside the 20-minute demo, on a hotel's own data, today — or be visibly labelled as coming during the pilot.**

Applied honestly, this rule alone recovers more conversion than any headline. It turns the demo from a shortfall into an over-delivery, which is the emotional state that converts a boutique GM.

---

## 1. The hero, decided

**Locked 17 September 2026.** English and Spanish deliberately use different nouns — we localize the category, we don't translate it.

| | Line 1 (`hero.headlineLine1`) | Line 2 (`hero.headlineLine2`) |
|---|---|---|
| **ES** | La IA que lleva la operativa, | y tú, a los huéspedes. |
| **CA** | La IA que porta l'operativa, | i tu, els hostes. |
| **EN** | The AI that runs the back of house, | so you can run the front. |

**Category line (the eyebrow above it)**

| | |
|---|---|
| **ES** | DOS PASOS POR DELANTE, CADA MAÑANA. |
| **CA** | DOS PASSOS PER DAVANT, CADA MATÍ. |
| **EN** | TWO STEPS AHEAD, EVERY MORNING. |

Cheeky, confident rather than loud, and it **names no segment and no enemy** — which matters more than it looks: other candidates either jabbed at a peer (*el hotel de al lado*, who in Barcelona is often the person who referred you) or fixed the page to one size of hotel (§1.4).

*"Juega con ventaja"* held this slot briefly and was replaced on review: three words asked too much of a reader who has been on the page for four seconds. **"Cada mañana" is what does the work** — it anchors an abstract claim to a concrete, recurring moment, so the line is understood rather than decoded. The eyebrow also stops short of restating the hero: the hero says what Fondas does, the eyebrow says what it gets you.

Dropped along the way: *"ventaja injusta"* — **unfair** carries a whiff of cheating, the wrong note two bands above a security section. Runner-up, still the most useful line in a live demo: *DOS PASOS POR DELANTE. SIN CONTRATAR A NADIE.*

### 1.4 Who the page talks to, versus who we target

**These are different, and v3 separates them deliberately.**

*Targeting* — who gets a cold email, who gets a demo, which pilots we accept — stays exactly as `GTM_STRATEGY.md` §4.3 defines it: 20–80 rooms, MEWS (Apaleo once proven), Gmail, city boutique, Barcelona and Madrid first. That focus is not a limitation, it is the whole GTM thesis (§2.3: every winner in this category started with home-region density, and nobody has taken Spain).

*Audience* — who can read the site without bouncing — is now **every hotel**. A group with twenty-three properties that lands on "para hoteles independientes" disqualifies itself in three seconds, and we never learn it existed. Inbound costs nothing to widen and the product genuinely adapts fast. Otel does the same thing: their page says "for hotels", and they sell to Irish and UK groups.

So: **narrow who we email, wide who the page talks to.** Concretely, on the site —

- The words *independiente*, *boutique* and *pequeño* come out of `footer.valueProp` and `contact.intro` (§3.2). Nothing else on the page carries them.
- The **Propiedad y grupo** card in the audience band goes from "uno o tres hoteles" to "de un hotel a veinte".
- The pricing band gains a group line, so a multi-property reader doesn't conclude the product was built for one hotel and leave.
- **The neutrality band gets stronger, not weaker.** A group running mixed PMSs across an estate is the buyer for whom *"el copiloto de tu PMS trabaja para tu PMS"* lands hardest. Same for the security band: a group has someone whose job is to ask that question.

**Two honest consequences of widening, to go in with eyes open:**

1. **Outlook.** Groups are likelier to be on Microsoft 365 and Opera than on Gmail and MEWS. A widened page will generate inbound that hits the Gmail-only wall — which is already conclusion #4 of the GTM executive summary ("the biggest addressable-market lever is Outlook"). Widening the audience raises the value of that P2 item; it doesn't create the problem.
2. **Capacity.** A twenty-property group saying yes today would break a solo founder with no billing, no DPA and no Google verification (§1.3, §3.3 P1). That is a good problem, but it is a problem: have an answer ready that buys time — start with two properties as a paid pilot — rather than declining or over-promising.



**Mechanism subline** — the sentence that makes the hero honest. It names the four surfaces that actually exist.

- **ES:** Fondas se conecta a tu PMS y al correo del hotel, y lleva las cuatro partes del día: el resumen de la mañana, los check-ins, las comunicaciones con el huésped y cualquier pregunta sobre tu hotel. Nada sale sin tu visto bueno.
- **CA:** Fondas es connecta al teu PMS i al correu de l'hotel, i porta les quatre parts del dia: el resum del matí, els check-ins, les comunicacions amb l'hoste i qualsevol pregunta sobre el teu hotel. Res no surt sense el teu vistiplau.
- **EN:** Fondas connects to your PMS and your hotel inbox, and runs the four parts of the day: the morning brief, check-ins, guest communications, and any question about your hotel. Nothing goes out without your yes.

**The four parts are the four live surfaces, verified against the code on 17 Sep.** `lib/roadmap.ts` states it outright — *"The four surfaces that were live from day one (dashboard, brief, check-ins, communications)"* — and marks `chat` as `live`. **Analytics is not one of them**: `app/[lang]/dashboard/analytics/page.tsx` renders `<ComingSoon />` and `lib/roadmap.ts` has it `coming-soon`, superseded by a Revenue dashboard that is also a stub. Analytics belongs in the "Ya en camino" band (`SITE_REDESIGN_V3.md` §3.5), not the hero.

**On "100+ connections".** Not yet, and the comment above `LIVE_INTEGRATIONS` in `page.tsx` is the reason: *"Moving a name from the second list to the first is a claim — only do it once the connection actually works in the app."* The real asset is the speed of building a connection during onboarding, and it says more than a number a GM can disprove in one question. It lives in band 2 as *"MEWS, Apaleo y Gmail, conectados hoy. ¿Usas otra cosa? La conectamos durante el alta."* When a count is genuinely earned, that band is where it goes.

### 1.1 Why this line

- **It is a division of labour, not an autonomy claim.** *"La IA que lleva la operativa"* sounds as big as "AI manager" but promises something different: a split of the work, not a transfer of authority. The second half does that work — it is the pre-answer to *"¿esto sustituye a mi recepcionista?"*, the question v2's hero was inviting.
- **"Operativa" is already our word.** `authAside.headline` in all three dictionaries reaches for it. It is what a Spanish GM calls the daily running of the hotel. No jargon, no loanword, no translationese.
- **It is elastic in the right direction.** *La operativa* grows as the product grows — pre-arrival extras and the rate signal fit under it without rewriting the hero. *La primera hora* would not have.
- **English and Spanish diverge on purpose.** EN uses *back of house / front of house* because English hotels say that; ES/CA use *la operativa / los huéspedes* because Spanish hotels don't. A literal translation of either direction produces a line nobody would say aloud.

### 1.2 What it commits us to

1. **The subhead does the honesty work.** Read alone, *"lleva la operativa"* is wide. Read with the subhead underneath it, it is precise. The two are one unit — never ship the headline with a shortened subhead.
2. **"Operativa" has to visibly mean more than the brief.** Bands 3 and 4 of the page (`SITE_REDESIGN_V3.md`) exist to prove it: the real brief, then the real drafted reply.
3. **Nothing about rate or revenue appears above the "Ya en camino" band.** That is the §0.4 rule, and this hero doesn't need it.

### 1.3 Paths not taken

Recorded so they don't get relitigated in three weeks:

| Rejected | Why |
|---|---|
| "El relevo / the morning handover" as the category line | Too narrow, and not cheeky enough to earn the slot. |
| "El director con IA" / "The AI manager" (v2) | Displacement frame; invited the receptionist question; claimed three capabilities the product doesn't have (§0.1). |
| "La capa" / "the layer" in ES/CA | *Capa* is tech jargon in Spanish and Catalan — a hotelier hears geology. English may keep layer-family wording; Spanish may not. |
| "La primera hora" / "your first hour back" | Undersells. Fondas covers the whole daily operation, not one hour. |
| "El relevo de cada mañana" | Good word, wrong slot — it narrows the category to mornings. Available later as a section eyebrow if you want it. |
| "...that gives your mornings back" | Otel's line, in Otel's language. Safe in Spain, unsafe in any English deck or fundraise. |

## 2. The website

The band-by-band page architecture, the design deltas against the Signal system, the new components, three-language copy for every new band, and the paste-ready Claude Code phases all live in **`SITE_REDESIGN_V3.md`**. This file stays positioning, proof and go-to-market.

## 3. The string swap

Mechanical: apply by key, invent nothing, keep tokens (`{year}`, `{brand}`, `{price}`) intact. Files: `dictionaries/en.json`, `dictionaries/es.json`, `dictionaries/ca.json`.

### 3.1 Hero

| Key | ES | CA | EN |
|---|---|---|---|
| `hero.badge` | Dos pasos por delante, cada mañana | Dos passos per davant, cada matí | Two steps ahead, every morning |
| `hero.headlineLine1` | La IA que lleva la operativa, | La IA que porta l'operativa, | The AI that runs the back of house, |
| `hero.headlineLine2` | y tú, a los huéspedes. | i tu, els hostes. | so you can run the front. |
| `hero.subhead` | {brand} se conecta a tu PMS y al correo del hotel, y lleva las cuatro partes del día: el resumen de la mañana, los check-ins, las comunicaciones con el huésped y cualquier pregunta sobre tu hotel. Nada sale sin tu visto bueno. | {brand} es connecta al teu PMS i al correu de l'hotel, i porta les quatre parts del dia: el resum del matí, els check-ins, les comunicacions amb l'hoste i qualsevol pregunta sobre el teu hotel. Res no surt sense el teu vistiplau. | {brand} connects to your PMS and your hotel inbox, and runs the four parts of the day: the morning brief, check-ins, guest communications, and any question about your hotel. Nothing goes out without your yes. |
| `hero.ctaPrimary` | Pedir acceso | Demanar accés | Get early access |
| `hero.ctaSecondary` | Ver un resumen real → | Veure un resum real → | See a real brief → |

> **`hero.headlineLine2` carries the accent colour** in `page.tsx` (the two-tone h1). Check the ES line still breaks where intended at `md:whitespace-nowrap` — *"y tú, a los huéspedes."* is short enough; the EN line is the long one.
>
> **`{brand}` no longer appears in the headline.** `HeadlineWithBrand` in `app/[lang]/page.tsx` splits `headlineLine2` on the token. With no token present it renders the plain string — verify that path, it has never been exercised.

### 3.2 Anchor lines

| Key | ES | CA | EN |
|---|---|---|---|
| `meta.title` | Fondas — La IA que lleva la operativa de tu hotel | Fondas — La IA que porta l'operativa del teu hotel | Fondas — The AI that runs your hotel's back of house |
| `contact.intro` | *Phrase swap only:* replace "para hoteles independientes y boutique" with "con hoteles de todos los tamaños". | *Phrase swap only:* replace "per a hotels independents i boutique" with "amb hotels de totes les mides". | *Phrase swap only:* replace "for independent and boutique hotels" with "with hotels of every size". |
| `meta.description` | Fondas lee tu PMS y el correo del hotel y te deja el día preparado: el resumen escrito antes de que abras, las respuestas a tus huéspedes redactadas para que las revises y las horas de llegada ya confirmadas. Sobre el PMS que ya usas, sin migrar nada. | Fondas llegeix el teu PMS i el correu de l'hotel i et deixa el dia preparat: el resum escrit abans que obris, les respostes als teus hostes redactades perquè les revisis i les hores d'arribada ja confirmades. Sobre el PMS que ja fas servir, sense migrar res. | Fondas reads your PMS and the hotel inbox and leaves the day ready: the brief written before you open, guest replies drafted for your review, arrival times already confirmed. On top of the PMS you already run, with nothing to migrate. |
| `footer.valueProp` | La IA que lleva la operativa de tu hotel. | La IA que porta l'operativa del teu hotel. | The AI that runs your hotel's back of house. |
| `footer.rights` | © {year} Fondas. El trabajo que no se ve. | © {year} Fondas. La feina que no es veu. | © {year} Fondas. The work nobody sees. |
| `auth.signupDesc` | Conecta tu PMS y el correo del hotel. Mañana por la mañana ya estará hecho. | Connecta el teu PMS i el correu de l'hotel. Demà al matí ja estarà fet. | Connect your PMS and the hotel inbox. By tomorrow morning it's done. |
| `authAside.headline` | La operativa del hotel, hecha. | L'operativa de l'hotel, feta. | The back of house, handled. |
| `bundle.eyebrow` | Todo en un sitio | Tot en un lloc | All in one place |
| `bundle.headline` | Una herramienta, no seis suscripciones. | Una eina, no sis subscripcions. | One tool, not six subscriptions. |
| `bundle.lead` | Las tareas que se comen el día de un hotel, resueltas en un solo sitio — porque {brand} conoce tu hotel una vez y lo aprovecha en todo. | Les feines que es mengen el dia d'un hotel, resoltes en un sol lloc — perquè {brand} coneix el teu hotel un cop i ho aprofita en tot. | The jobs that eat a hotel's day, handled in one place — because {brand} learns your hotel once and uses it everywhere. |
| `cta.eyebrow` | Cuando quieras | Quan vulguis | Ready when you are |
| `cta.headline` | Míralo funcionando con tus propios datos. | Mira-ho funcionant amb les teves pròpies dades. | See it running on your own hotel's data. |
| `cta.subhead` | Veinte minutos, tu hotel, sin migrar nada. Gratis para los tres primeros hoteles. | Vint minuts, el teu hotel, sense migrar res. Gratis per als tres primers hotels. | Twenty minutes, your hotel, nothing to migrate. Free for the first three hotels. |

> **Three v2 leftovers this sweep also clears.** `bundle.*` was built on *"Una sola capa"* — the jargon word. `authAside.headline` still said *"en piloto automático" / "on autopilot"*, the exact phrase `FONDA_MARKETING_VOICE.md` §2 forbids, sitting on the sign-up screen. `cta.subhead` promised free access to the first **20** hotels; the pilot plan is **three** (§4.2) — twenty reads as desperate.

### 3.3 Where the prompt lives

The paste-ready prompt for this swap is **`SITE_REDESIGN_V3.md` §7, Phase 0**, and the strings are mirrored there in §3.0 so the build document stands alone. Kept in one place deliberately: two copies of a string table drift, and the one on the website is the one that matters.

**Also in that sweep:** `pricing.note` and `cta.subhead` both still promise the beta free to the first **20** hotels; the pilot plan is **three** (§4.2). And `contact.intro` still says *"para hoteles independientes y boutique"* — see §1.4.

**Commit:** `feat(copy): reposition v3 — la IA que lleva la operativa`

## 4. The proof plan

The claims above are small enough to be true today — but "true" isn't "believed". These are the four cheapest pieces of proof, in the order they pay off:

1. **Put the real brief on the homepage (this week, free).** `/sample-brief` is described in §1.2 as the best top-of-funnel asset and it's behind an email gate. Ungate a full anonymised brief as band #2; keep the gate for "get tomorrow's brief for *your* hotel."
2. **The first pilot quote, week 2 (free).** Not a metric — a sentence. Per §4.11 you're collecting verbatim feedback anyway; ask permission to quote at the pilot agreement stage, not after. One named GM with a hotel name beats any adjective on the page.
3. **A public trust page (a weekend).** Otel puts `trust.otelai.com` in the footer before they have SOC 2. We can publish: what we read, what we store, where it lives, what we never do, and the deletion policy. It also pre-answers §4.9's *"¿están seguros mis datos?"* before the call.
4. **Gremi d'Hotels de Barcelona / CEHAT membership (Appendix A "what to steal").** Otel uses Irish Hotel Federation membership as a trust badge. A local association logo does more for a Barcelona GM than an ISO certificate at this stage.

**The first real number to earn:** draft acceptance (§2.4 condition 2). The day a pilot says "I send about eight in ten as they come," that sentence becomes the strongest line on the site — and it's a claim Apaleo and Mews structurally cannot match.

---

## 5. GTM refresh

### 5.1 The outreach opener

Replaces the touch-1 copy in §4.7. Rules kept: personalised, no attachment, one ask, no "IA", offer to visit.

**ES (primary)**

> **Asunto:** el resumen de mañana del [Hotel]
>
> Hola [Nombre],
>
> Soy Oriol, de Barcelona. Estoy arrancando Fondas con tres hoteles independientes de la ciudad y me gustaría que uno fuera el vuestro.
>
> Funciona así: conecta tu MEWS y tu Gmail, y cuando llegas por la mañana ya te está esperando el resumen del día —llegadas, salidas, VIPs, ETAs sin confirmar— y los correos de huéspedes redactados con la voz del hotel para que solo los revises y los envíes. Nada se envía sin tu visto bueno y no cambia nada de lo que ya usáis.
>
> ¿Te mando el resumen de mañana de un hotel de 45 habitaciones de Barcelona, para que veas exactamente de qué hablo? Si te encaja, te lo enseño en 20 minutos — o me paso por recepción, que lo tengo a mano.
>
> Un saludo,
> Oriol

**CA**

> **Assumpte:** el resum de demà de l'[Hotel]
>
> Hola [Nom],
>
> Sóc l'Oriol, de Barcelona. Estic arrencant Fondas amb tres hotels independents de la ciutat i m'agradaria que un fos el vostre.
>
> Funciona així: connectes el teu MEWS i el teu Gmail, i quan arribes al matí ja t'està esperant el resum del dia —arribades, sortides, VIPs, ETAs sense confirmar— i els correus dels hostes redactats amb la veu de l'hotel perquè només els revisis i els enviïs. Res no s'envia sense el teu vistiplau i no canvia res del que ja feu servir.
>
> Vols que t'enviï el resum de demà d'un hotel de 45 habitacions de Barcelona, perquè vegis exactament de què parlo? Si et quadra, te l'ensenyo en 20 minuts — o em passo per recepció, que ho tinc a prop.
>
> Una abraçada,
> Oriol

**EN** (for UK/IE-facing or English-speaking GMs)

> **Subject:** tomorrow's brief for [Hotel]
>
> Hi [Name],
>
> I'm Oriol, based in Barcelona. I'm starting Fondas with three independent hotels in the city and I'd like yours to be one of them.
>
> It works like this: connect your MEWS and your Gmail, and when you walk in the morning is already waiting — the day's brief (arrivals, departures, VIPs, unconfirmed ETAs) and your guest emails drafted in the hotel's voice, ready for you to review and send. Nothing sends without your yes, and nothing you already use changes.
>
> Can I send you tomorrow morning's brief for a 45-room Barcelona hotel, so you can see exactly what I mean? If it lands, I'll show you the rest in 20 minutes — or I'll come by reception, I'm local.
>
> Best,
> Oriol

### 5.2 The 20-minute demo, re-sequenced

Replaces §4.8. The page leads with the morning; the **demo leads with the morning too — but only for 2 minutes**, then spends its weight on the inbox. The §4.8 warning still holds: never let a GM sit through five minutes of brief and think *"mi PMS ya hace eso."*

| Min | What you do |
|---|---|
| 0–3 | *"¿Cómo es tu primera hora? ¿Dónde se te va el tiempo antes de que llegue el equipo?"* Let them describe it. Write down their words — they're your next headline. |
| 3–5 | **The brief, on their own seeded data. Two minutes, no more.** *"Esto es lo que te encuentras a las 6:45."* Read two lines aloud. It's the hook, not the product. |
| 5–12 | **The inbox.** A real guest email, the reservation pulled beside it, the draft in the hotel's voice. Edit one word live and send. *"Fondas lee tus datos y escribe esto. Tú decides qué sale."* This is the seven minutes that differentiate you. |
| 12–14 | ETA chasing and ask-anything, fast. Narrate the day, not the features. |
| 14–16 | The fragmentation close: *"Puedes pagar seis suscripciones —comunicaciones, revenue, finanzas, tareas, experiencias, CRM— o una capa que te lleva la mañana."* |
| 16–18 | *"¿Esto se parece a algo que te ahorraría tiempo?"* Then stop talking. |
| 18–20 | *"El siguiente paso es conectar tu PMS. Son 30 minutos y lo hacemos juntos. ¿Lo agendamos?"* |

**Apaleo exception:** if the prospect is on Apaleo, skip minutes 3–5 entirely and open on the inbox. Apaleo Copilot ships a brief; do not invite the comparison.
**Unchanged from §4.8:** add their Google account as an OAuth test user the day the demo is booked; seed the test hotel with realistic Spanish guest names and a plausible occupancy pattern; never say "IA".

### 5.3 The one-pager v3

Replaces §4.13. This is the page that gets forwarded to an owner who wasn't on the call, so it answers their questions, not the GM's.

> **Fondas — todo resuelto antes de que llegues**
>
> **Qué es.** Una capa sobre el PMS y el correo que ya usáis. Trabaja de noche y os deja la mañana hecha.
>
> **Qué hace hoy.**
> · Escribe el resumen del día antes de que abra recepción: llegadas, salidas, VIPs, ETAs sin confirmar, lo que necesita atención.
> · Redacta las respuestas a los correos de huéspedes con la voz del hotel, cruzando cada correo con su reserva. Las revisáis vosotros.
> · Pide automáticamente las horas de llegada sin confirmar, para que pisos vaya por delante.
> · Responde preguntas sobre el día en lenguaje normal ("¿cuántas habitaciones quedan por limpiar?").
>
> **Qué llega durante el piloto.** Extras antes de la llegada con vuestros precios · señal de tarifa en el resumen · el resumen por WhatsApp.
>
> **A qué se conecta.** MEWS por su API oficial. Gmail por OAuth, con los mismos permisos que cualquier cliente de correo. Nada que migrar.
>
> **Qué NO hace.** No modifica datos en vuestro PMS. No envía ningún correo sin vuestra revisión y aprobación. No sustituye a nadie de recepción — le quita el trabajo administrativo.
>
> **Datos.** Se guardan cifrados y alojados en la UE, se usan solo para generar vuestros resúmenes y borradores, y se borran si os dais de baja. El hotel es el responsable del tratamiento; Fondas, el encargado.
>
> **Piloto.** 30 días gratis, acceso completo, una llamada de configuración (30 min) y una de feedback. Sin contrato ni tarjeta. Después, 199 €/mes por hotel, plano — menos que una noche de habitación.
>
> **Contacto.** Oriol · oriolpelli@icloud.com · fondas.app

### 5.4 Objections, updated

The two §4.9 objections that change, plus the one v3 creates:

**"Mi PMS ya hace el resumen."** *(new — the most dangerous one, and the reason band #6 exists)*
> "Sí, y el de Apaleo está bien. La diferencia es el correo: el copiloto de tu PMS no ve tu bandeja de entrada, y ahí es donde se te va la mañana de verdad. Y si algún día tienes dos hoteles en dos sistemas, el copiloto de cada uno trabaja para su sistema. Fondas trabaja para ti."

**"¿Esto sustituye a alguien de recepción?"** *(new — the question "AI manager" was inviting)*
> "No, y no está pensado para eso. Le quita a recepción el trabajo administrativo —redactar, perseguir ETAs, cuadrar el día— para que estén con el huésped, que es lo que no se puede automatizar."

**"Ya usamos otra herramienta de informes."** *(unchanged, still works)*
> "Fondas no es una herramienta de informes — es un relevo: lee tus informes por ti y te dice qué importa hoy. La mayoría usa las dos."

**"¿Cuánto cuesta?"** *(unchanged)*
> "El piloto no cuesta nada — son los tres primeros hoteles. Después la idea son 199 € al mes, plano, sin coste por habitación. Pero esa conversación es dentro de seis semanas y depende de que te resulte útil."

---

## 6. What changes in the other docs

| Doc | Action |
|---|---|
| `FONDA_MARKETING_VOICE.md` | §1 (front office → hotel manager) and §3–§4 (hero options, anchor lines) are **superseded**. **§2 (the voice) survives intact and is still the standard** — v3 is more consistent with it than v2 was. Add a header pointing here. |
| `GTM_STRATEGY.md` | Replace §3.1, §4.7 touch 1, §4.8, §4.9, §4.13 with §1.5, §5.1, §5.2, §5.4, §5.3 of this file. Parts 1, 2, 3.2–3.4, 5–11 and the appendices are unchanged. |
| `FONDA_SANA_PROMPT_PACK.md` | Phase 7.5 is retired. The copy swap is now Phase 0, and Phases A–J of the redesign live in `SITE_REDESIGN_V3.md` §7. |
| `COMINGSOON_CONTENT.md` | Re-check against §0.4 — anything claiming pricing or offers comes out. |
| `brand/linkedin/LINKEDIN_SETUP.md` | "The AI manager for independent hotels" → "La IA que lleva la operativa de tu hotel." Drop *independent* here too (§1.4) — LinkedIn is inbound. |

---

## 7. Application plan — 14 days

The selling window closes 15 October. Sequenced so outreach starts before the page is finished. Phase letters refer to `SITE_REDESIGN_V3.md` §7.

| Day | Do | Why it's in this slot |
|---|---|---|
| 1 | `SITE_REDESIGN_V3.md` Phase 0 — string swap across en/es/ca. | Everything downstream quotes the hero. |
| 1 | `SITE_REDESIGN_V3.md` Phase A — band reorder, `comparison` retired. | Structure before decoration; no new copy needed. |
| 2 | Phases B–D — the artefact in the hero, the ungated brief, the matched reservation. | The single highest-conversion group of changes available. |

| 3 | Phases E–F — the four parts of the day, then the overnight timeline. | The timeline is the band that sells without arithmetic. |
| 4 | Phases G–H — role cards, then the three objection bands. | Kills the objections that end calls. |
| 4 | Rewrite the one-pager (§5.3) as a PDF. | It gets forwarded; it must stand alone. |
| 5 | **Outreach wave restarts with §5.1, 5 contacts/day.** | Do not wait for Phases I–J. |
| 5–10 | Demos with §5.2 sequencing. | |
| 7 | Phase I — trust page live. | Before the first owner asks. |
| 10 | Gremi d'Hotels / CEHAT membership enquiry sent. | Slow to land; start early. |
| 12 | Phase J — mobile pass and polish. | P0 in GTM §3.3: the GM reads the brief on a phone at 6:45. |
| 14 | First pilot live → ask for the quote at the agreement stage. | Proof #2 in §4. |

## 8. Decisions taken

All four open items were closed on 17 September. Recorded here so the phases can run unattended.

| Decision | Outcome |
|---|---|
| **The hero composition** | **The watercolour stays.** The parallax hero is kept as the ground; the brief window floats below the CTA row, outside the parallax, cropped by the section boundary. Two visual systems cohabit — check it on a phone before moving past Phase B. |
| **Sample data for the artefacts** | **Invented, realistic.** A fictional 45-room Barcelona hotel, invented Spanish guest names, plausible occupancy. No consent needed, nothing to scrub, ships today. Bands 3 and 4 must show the *same* hotel on the *same* night, so the hotel, date and occupancy get written down in Phase C and reused in Phase D. Swapping in a consenting pilot's real numbers later is a second pass over two components, not a rewrite. |
| **The trust page** | **Publish the full page now, stated as facts.** The controller/processor split is a statement of fact under GDPR and holds for a sole trader, so it can be said. No signed DPA is claimed, and no certification — there is no ISO and no SOC 2. |
| **Price, beta badge, comparison band, timeline photo** | **Price comes off the homepage** until billing ships (this also takes the `{price}` cell out of `stats` and the price out of the JSON-LD `Offer` — all of it is Phase 0b). **The beta marker comes out of the hero badge**, and the private beta is stated in exactly one FAQ answer instead. **The comparison band stays**, moved to sit right after the overnight timeline where the contrast does real work. **No photograph in the timeline band** — text only. |

**Two consequences worth watching, neither of which needs a decision now.**

Taking the price off the page removes a qualifier. Some of the traffic that would have self-selected out on €199 will now book a demo instead, which costs founder hours — the §5.2 demo already asks the money question at minute 16, so the filter moves from the page to the call rather than disappearing.

Fifteen bands is a long page. Every band answers a named objection, so none of them is padding, but scroll depth should be watched once it's live. If bands 6 and 7 both underperform, band 6 (`comparison`) is the one to cut — it was the marginal call in the first place.
