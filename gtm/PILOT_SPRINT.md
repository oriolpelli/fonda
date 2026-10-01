# Fondas — The Pilot Sprint, 23 September – 6 October 2026

_Owner: Oriol · Written 21 Sep, re-dated 23 Sep · The day-by-day of the selling fortnight._

**Goal:** 80 hotels touched, 10 demos done, 3–4 founding hotels agreed in writing and 2 live and receiving briefs by **Tuesday 6 October**. The selling window closes around 15 October (`GTM_STRATEGY.md` §4.4).

**How this file relates to the others.** `ROADMAP.md` §1 sets the priority: until 6 October selling comes first and code changes are limited to demo blockers and live-pilot fixes. This file is the calendar for that. What to say at each step is `PILOT_PLAYBOOK.md`; the list is `Fondas_Outreach_Tracker.xlsx`.

---

## 1. Where things stand

**The product is not the problem.** Seven surfaces are live (Home, Ask, Morning brief, Arrivals & departures, Communications, Guests, ⌘K) on three data sources — MEWS, Apaleo and the Google Sheet/CSV import — with Gmail drafting working and the site live in three languages. `ROADMAP.md` §0 says it plainly: the product is further ahead than the distribution.

**The pipeline has not been opened.** The tracker was built on 26 August with 40 qualified hotels; on 23 September all 40 still read `found`. The August and September milestones didn't fail because the funnel underperformed — no messages went out. An untested funnel isn't a failed one, and that is the good news.

**The Sheet source removes the PMS gate for the first pilots.** A hotel on Opera, Cloudbeds, Amenitiz or anything else can pilot from a daily arrivals export. That roughly triples who you can talk to this fortnight.

## 2. Why it's worth two weeks of your full attention

You can't decide whether Fondas is worth it from your desk. Ten demos answer that, and you can have ten by 2 October.

The problem is real. Spanish hotels invoiced more than ever in 2025 (RevPAR €129.9, +6.3%) with GOP margins flat or below 2019, because labour costs grew faster than revenue; urban hotels run 32–34% GOP and depend on labour-cost management ([Hosteltur](https://www.hosteltur.com/173142_muchos-hoteles-facturan-mas-que-nunca-pero-con-margenes-mas-reducidos.html)). 75% of Spanish hospitality businesses struggle to hire in 2026 ([El Español](https://vandal.elespanol.com/random/es-oficial-la-hosteleria-en-espana-esta-en-crisis-y-el-75-de-los-negocios-sufre-para-contratar-personal/42001.html)). The one thing a hotel can't buy more of is a competent person's hour; Fondas sells those back.

You're the right person to sell it. The code is now the cheap part. What's scarce is a director saying yes, and you come from hospitality, say *operativa* rather than *API*, are twenty minutes from twenty-two target lobbies, and write to directors in their language. Nobody else selling to a 30-room Barcelona boutique will ever stand at its desk.

A founder's morale follows the pipeline, not the codebase. Zero contacts produce zero signal, and zero signal feels exactly like *maybe it isn't worth it*. That feeling isn't information about Fondas — it's the absence of information. The first reply changes it.

The downside is bounded. `ROADMAP.md` §4 carries the kill criterion (fewer than 8 paying hotels by end of Q1 2027 after 100+ qualified contacts). This is a two-week experiment with a written pass/fail, on a product that already exists.

**Until 6 October, don't:** write new specs, redesign, start a new surface, or rewrite docs. If you feel the pull to open `APP_UX_PROMPTS.md`, send five more messages instead.

## 3. The funnel — three lanes

| Lane | Who | Touches | Replies | Demos | Pilots |
|---|---|---|---|---|---|
| 1. Warm | Everyone you know in hospitality, hotel tech, F&B, consulting — ask for an intro, not a demo (playbook **E6**) | 20 | 10 | 4 | 2 |
| 2. Walk-in | The 22 Barcelona hotels, loops A and B (playbook §2.1) | 22 | 8 | 4 | 1–2 |
| 3. Digital + phone | 10 Madrid + 9 coastal/other-city from the tracker, plus ~20 new names | 40 | 5 | 2 | 0–1 |
| **Total** | | **~80** | **~23** | **~10** | **3–4** |

Lane 3 uses published cold-email benchmarks (1.5–2.5% meetings per send, [Cleverly](https://www.cleverly.co/blog/cold-email-strategy-for-b2b-saas)) lifted by the phone follow-up. Lanes 1 and 2 have no published benchmark; those numbers are judgement.

**Qualification for the first four,** by weight: the director or owner decides and handles guest email personally; Barcelona or drivable, so setup happens at their desk; 20–80 rooms; Gmail (Outlook pilots without the inbox); any PMS, MEWS or Apaleo preferred. Out: chain-affiliated, under 15 rooms, a shared non-Gmail inbox nobody owns.

**~20 new names** (one hour, Friday): Gremi d'Hotels de Barcelona members; MEWS and Apaleo customer stories filtered to Spain (a named PMS is a confirmed integration); followers of the Fondas LinkedIn page. Add with `Source` filled.

**The coastal hold is over.** The nine Costa Brava, Girona, Valencia, Seville, San Sebastián and Málaga hotels go out this week; Mas de Torrent, Alàbriga and Nord 1901 get *«subo yo»*.

## 4. Product — only these, only this fortnight

| Item | Time | Why |
|---|---|---|
| Apply migrations 0023 and 0024 | 15 min | Ask and Guests fail without them; both are in the demo |
| Seed the demo hotel with realistic Spanish guest names | 1 h | Sandbox names make a demo feel fake |
| Run the full demo twice, laptop then phone | 1 h | The director reads the brief on a phone |
| Five green mornings in `RELIABILITY.md`, starting today | 60 s a day | The reliability sentence you say to a director |
| An OAuth test user for every booked demo | 5 min each | Gmail connect fails live otherwise |
| Fix whatever a demo or a live pilot breaks | as needed | — |

## 5. The calendar

**La Mercè runs Thu 24 – Sun 27 September.** Hotels are full and directors are on the floor, so the Barcelona walk-ins start Monday 28. Walk-in window: **11:45–13:30** (playbook §2.1).

| Day | Selling | Product | Touched by evening |
|---|---|---|---|
| **Wed 23** | Write the 20-name warm list; send 5 warm asks (E6). Print 22 envelopes: one-pager (fix the *«durante el piloto»* box first), sample brief, sticky note | Migrations 0023/0024. Reliability day 1 | 5 |
| **Thu 24** · La Mercè | No walk-ins. Research directors' names for loop B (10) and fill the tracker. 5 warm asks. Write the pilot agreement from playbook §9.3 | Seed demo data; run the demo twice. Reliability day 2 | 10 |
| **Fri 25** · La Mercè | 10 cold emails (E3): Madrid ×10. 5 warm asks. LinkedIn notes to all. Research loop A names. ~20 new names into the tracker | Reliability day 3 | 25 |
| **Mon 28** | **Loop B walk-ins ×5** + E1/E2 before 21:00. 9 coastal emails (E3). Phone the warm asks with no reply | Reliability day 4 | 39 |
| **Tue 29** | **Loop B ×5** + same-day emails. Phone Madrid (day 4). First demos | Reliability day 5 — five green mornings | 44 |
| **Wed 30** | **Loop A ×5** + same-day emails. Phone Monday's walk-ins (day 2–4). Demos | OAuth test users for booked demos | 49 |
| **Thu 1 Oct** | **Loop A ×5** + singles (Brummell, Primero Primera). Demos. **First setup** (playbook §10), WhatsApp thread open | Read pilot #1's brief before they do, every morning | 56 |
| **Fri 2** | E4 to everyone at day 7. 10 new names by email. Demos. Setup #2. **Week review** | — | 66 |
| **Mon 5** | Second visits to directors never met (day 7–10). E4/E5. 10 new names. Demos. If pilot #2 is agreed: **book the lawyer** | — | 76 |
| **Tue 6** | The last 5 warm asks and final touches. **Sprint review.** Start `PILOT_FEEDBACK.md` | — | ~80 · 10 demos · 3–4 agreed · 2 live |

**Every weekday, the non-negotiables:** 08:00 reliability check; five new contacts before 10:00; every follow-up due that day sent; walk-ins on any Barcelona day; tracker updated by 17:30. Miss one and it was a building day, whatever else got done.

## 6. If it isn't working

**Friday 2 October with fewer than 5 replies from ~65 touches** means one of three things, and none of them is the product:

1. **The message isn't reaching the director** → more walk-ins and phone, ask reception for the name and email every time.
2. **The opener isn't landing** → lead with the printed brief and one labour sentence (playbook §6), nothing else.
3. **The list is wrong** → three days of warm intros only.

Change one variable at a time. Don't open Claude Code to fix a sales problem.

**If a hotel says yes early,** everything else waits: set up within 48 hours of the yes.

## 7. After 6 October

Pilots are 60-day founding pilots (playbook §0.1, §9). Day 30 — around 1 November for pilots that start on 1 October — is the money conversation: continue from day 61 at the founding price. Day 60 is the decision, and first invoices land around 1 December; the legal entity starts the week pilot #2 lands, which is in time.

**Because the pitch sells the trajectory, the weekly release train becomes part of the promise** (`ROADMAP.md` §4). From 7 October, ship something a pilot can see every week, and let their requests and the locked-tile clicks set the order.

**Success on 15 October** (`GTM_STRATEGY.md` Part 11): three hotels using Fondas daily, one quotable *«se lo enseñé al propietario»* moment, written feedback and a real draft-acceptance number.
