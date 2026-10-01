# gtm/ — everything go-to-market

_Created 23 September 2026. Start here._

Every document about who Fondas sells to, what it says and how it closes a hotel lives in this folder. **Priority is not decided here** — it lives only in `ROADMAP.md` at the repo root.

## What's in the folder

| File | Use it for | Authority on |
|---|---|---|
| `PILOT_PLAYBOOK.md` | Anything you say or send to a prospect: walk-ins, reception, phone, email, LinkedIn, WhatsApp, the demo, objections, the close, the pilot agreement, onboarding, the day-30 ask | **Every script.** No other file keeps a copy of a pitch line |
| `PILOT_SPRINT.md` | The current fortnight, 23 Sep – 6 Oct, day by day | The selling calendar — inside the priority `ROADMAP.md` §1 sets |
| `pitch/GUION_60S.md` | The 60-second door pitch (ES/CA/EN), used with the [Fondas Sixty Seconds](https://claude.ai/artifact/YWgnwHMNBpUEYQx4sgySkj) pass | The door version of the playbook; derives from it |
| `pitch/Fondas_una_pagina_{ES,CA,EN}.pdf` | The one-pager you leave behind or forward to an owner | — (see known issue 1) |
| `POSITIONING_V3.md` | What Fondas is, the site's messaging, the proof plan, the voice (§9) | Positioning and voice. **Wins over `GTM_STRATEGY.md` where they differ** |
| `GTM_STRATEGY.md` | Market, competitors, ICP, pricing and how to frame it, legal triggers, the raise, metrics, risks | Market, ICP, pricing, metrics |
| `Fondas_Outreach_Tracker.xlsx` | The pipeline — 40 hotels, one row each | The list. **Gitignored**: the repo is public and this holds prospects' contact details. Never commit it |

**Related, kept elsewhere:** `SITE_REDESIGN_V3.md` (the marketing-site build spec, root) · `COMINGSOON_CONTENT.md` (roadmap tile copy, root) · `brand/linkedin/` (the LinkedIn page setup and images) · `docs/archive/` (retired: `FONDA_MARKETING_VOICE.md`, `fonda-positioning-gtm.html`).

## How the documents fit

```
ROADMAP.md (root) ── when, and what comes first
      │
      ├── GTM_STRATEGY.md ── why this market, this buyer, this price
      │       └── POSITIONING_V3.md ── what we say we are (wins on conflict)
      │
      └── PILOT_SPRINT.md ── this fortnight, day by day
              └── PILOT_PLAYBOOK.md ── exactly what to say and send
                      └── pitch/ ── the door version and the leave-behinds
```

**The rule.** A line of pitch copy lives in `PILOT_PLAYBOOK.md` and nowhere else; other files point to it by section. If you find a script, a demo sequence or an objection answer somewhere else, it's stale — fix the playbook, then replace the stray copy with a pointer.

## Known issues

1. **The one-pager PDFs are out of date — don't print them as they are.** Since 23 Sep they contradict the pitch: they say *30 días gratis* (founding pilots are 60), open with *«Todo resuelto antes de que llegues»* (morning-only), and The box *«Qué llega durante el piloto»* lists pre-arrival extras, the rate signal in the brief and the brief by WhatsApp. `ROADMAP.md` schedules none of them inside a pilot's 30 days (§3.6 "Later"; the rate cache follows the sprint). The PDFs were exported from Chromium and have no source in the repo; the corrected text is now `PILOT_PLAYBOOK.md` Appendix A (*«En camino»*, *herramienta* instead of *capa*, Apaleo and the daily export, the founding price, a `fondas.app` contact). Regenerate the three PDFs from it before printing — or, for this week's envelopes, strike *«durante el piloto»* by hand and write *«en camino»*.
2. **The LinkedIn images** carry *«Nosotros nos encargamos del resto»*, from the retired v2 hero. Not false, just not the current line; replace when the images are next touched. The page's text was rewritten on 23 Sep (`brand/linkedin/LINKEDIN_SETUP.md`).
3. **Contact address.** Sales material should come from a `fondas.app` mailbox that receives mail, not iCloud.
4. **Three versus four, on purpose.** The site and the door pitch say *los tres primeros hoteles*; the sprint aims to sign four because one pilot usually goes quiet.
5. **A price above €199** was discussed on 21 Sep and not decided. The pricing questions at the day-30 review (playbook §11) are how it gets decided. Founding hotels stay at €149 whatever happens.
6. **The [Fondas Sixty Seconds](https://claude.ai/artifact/YWgnwHMNBpUEYQx4sgySkj) screens** were written for the morning-first door pitch. `pitch/GUION_60S.md` was rewritten on 23 Sep to cover the whole day and the founding offer; check the five screens' copy matches before you use them at a door.

## What changed on 23 September

| Before | Now |
|---|---|
| `GTM_STRATEGY.md`, `POSITIONING_V3.md`, `Fondas_Outreach_Tracker.xlsx` in the repo root | Here. File names unchanged, so every `§` reference still resolves |
| `brand/pitch/` | `gtm/pitch/` |
| Scripts in three places: `GTM_STRATEGY.md` §4.7–4.13, `POSITIONING_V3.md` §5, `brand/pitch/GUION_60S.md` | One place: `PILOT_PLAYBOOK.md`. The old sections are pointers; the door script points to the playbook |
| `FONDA_MARKETING_VOICE.md` — mostly retired, one live section | Archived to `docs/archive/`; its surviving §2 is now `POSITIONING_V3.md` §9, cleaned of the retired pricing and offers scope |
| `GTM_STRATEGY.md` Part 10, §3.3 and §4.5 — priorities and milestones that contradicted `ROADMAP.md` | Pointers to `ROADMAP.md` |
| The LinkedIn page copy, still selling rate-setting and guest offers | Rewritten to the live product |
| The 21 Sep sprint (a Claude doc) | `PILOT_SPRINT.md`, re-dated to start 23 Sep and routed around La Mercè |
| The pitch sold "the first hour" / "the morning", and a 30-day free pilot | **The whole daily operativa plus the trajectory** (playbook §0.1, `POSITIONING_V3.md` §10): 60-day founding-hotel pilots with everything shipped in that time, a day-30 review, €149/month for life from day 61. The playbook, door pitch, one-pager text, `GTM_STRATEGY.md` §1.1, §3.2 and Part 8, and `ROADMAP.md` §4 all follow |
