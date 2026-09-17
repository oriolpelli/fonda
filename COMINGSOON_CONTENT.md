# Fondas — Coming-Soon Page Content

Copy for the coming-soon pages, so each unreleased section previews the real
capability behind it instead of a bare "Coming soon". Inspired by the TH1.ai
"28 agents that run a hotel" breakdown (which Fonda's roadmap is modelled on),
but written fresh in Fonda's own voice — nothing lifted, and everything stays
under the honest "Coming soon" eyebrow.

**Per page, three parts:**
- **Lead** — one sentence: what this will do. (Can replace the current
  `roadmap.blurb.<key>`.)
- **Will do** — 3–4 short, concrete capability lines (the "small detail" of what
  it'll be able to do).
- **What's next** — one line on what ships after it / what it connects to, so the
  page also sells the sequence.

English canonical below; Claude Code translates each to `es` and `ca` in the
existing dictionary voice. Live surfaces (Morning Brief, Check-in, Communication)
are not here — they already have real pages.

---

## Front Desk

### Front Desk › Dashboard  `front-desk`
**Lead:** The whole front desk on one screen — arrivals, messages waiting, and the few things that still need a person, pulled together as they happen.
**Will do:**
- Today's arrivals, in-house guests and departures at a glance
- Every channel's unanswered messages in one queue
- The handful of items only a human should touch, surfaced first
**What's next:** Each front-desk tool below — information, concierge, reputation — plugs into this view as it ships.

### Front Desk Information  `front-desk-info`
**Lead:** One source of truth for the desk — house facts, policies, and the guest context that makes service feel personal.
**Will do:**
- A house knowledge base every reply draws from, so answers stay consistent
- Living guest profiles: preferences, history and key dates, built up each stay
- A short pre-arrival brief on notable guests for whoever's on shift
**What's next:** Feeds Communication and Concierge, so every guest touch already knows who it's talking to.

### Concierge  `concierge`
**Lead:** A concierge that actually closes the loop — books restaurants, private chefs and transfers on the guest's behalf, and chases each to confirmed.
**Will do:**
- Requests from phone, WhatsApp, email and the desk, handled in one place
- Books the provider, tracks the reply, follows up until it's confirmed
- A day-of check — flight number in hand — and a note back to the guest
**What's next:** In-house messaging (WhatsApp included), so guests reach the concierge the moment they think of something.

### Reputation Analysis  `reputation`
**Lead:** Every review across Booking, Google, TripAdvisor and Vrbo read, themed and answered — so your score stops being a mystery.
**Will do:**
- An on-brand reply drafted for each review, in the guest's language
- Recurring themes surfaced, so you see what's actually moving the score
- Angry reviews flagged for a human before anything is published
**What's next:** Response goes automatic within 24h — the speed that actually lifts ranking and conversion.

---

## Revenue

### Revenue › Dashboard  `revenue`
**Lead:** Rate, occupancy and pickup in one place — the numbers behind every pricing call, and where the revenue tools report in.
**Will do:**
- Live pace vs last year, by date and room type
- The rate moves made, each with its reasoning
- Pickup, channel parity and upsell revenue side by side
**What's next:** Pricing, forecasting, parity and upsell switch on below, each writing into this view.

### Revenue Management  `revenue-management`
**Lead:** Airline-style pricing discipline around the clock — a recommended rate for every future night, rebuilt as bookings land.
**Will do:**
- Reprices continuously against pace, pickup and your comp set
- Publishes inside guardrails you set — rate floor, max daily move, parity band
- Minimum-stay and gap-night rules that protect your big nights
**What's next:** Demand Forecasting feeds it competitor rates, events and weather, so it prices the market, not just your own pace.

### Demand Forecasting  `demand-forecasting`
**Lead:** Where demand is heading by date — competitor rates, local events and weather turned into a forecast you can price against.
**Will do:**
- Rate-shops nearby hotels and watches the local events calendar
- Forecasts demand night by night, with each signal's contribution shown
- Feeds pricing — and F&B ordering — so both read the same forward view
**What's next:** Plugs into Revenue Management, closing the one gap in rule-based pricing: outside signal.

### OTA Parity  `ota-parity`
**Lead:** Every channel watched for the two things that quietly bury a listing — rate parity breaks and thin content.
**Will do:**
- Round-the-clock checks across Booking, Expedia, Airbnb and more
- Parity breaks and content gaps flagged the day they appear
- The fix drafted and the channel resynced on your approval
**What's next:** Polices what pricing and marketing produce, keeping every listing consistent and ranked.

### Upsell AI  `upsell-ai`
**Lead:** The right offer to the right guest before arrival — spa, dinner, a transfer, late checkout — paid in one tap.
**Will do:**
- A warm, personal pre-arrival offer matched to each guest
- Secure payment links, or a branded page guests browse themselves
- Every sale charged, logged to the folio and confirmed automatically
**What's next:** Room Upgrade AI adds paid upgrades on top, freeing cheaper rooms to resell.

### Room Upgrade AI  `room-upgrade-ai`
**Lead:** Empty better rooms turned into paid upgrades — priced to what each guest will pay, hands-free.
**Will do:**
- Scans the book for guests in lower-tier rooms
- Offers a right-priced upgrade inside a sane band
- Moves the room, adjusts the rate and confirms on accept
**What's next:** Frees the cheaper rooms — which sell better last-minute — lifting occupancy on top of the fee.

---

## Sales & Marketing  `sales-marketing`

**Lead:** The commercial engine for direct business — chasing the high-value deals and running demand-aware marketing, without a full sales-and-marketing team.
**Will do:**
- Group, multi-room and VIP leads chased through their whole lifecycle
- Events and weddings run from enquiry to BEO to follow-up
- On-brand campaigns and ad budgets tuned to occupancy gaps
- Direct-booking funnel leaks found, priced in euros and A/B-tested
**What's next:** First lead nurture and events, then marketing and social, then funnel optimisation.

---

## Operations

### Operations › Dashboard  `operations`
**Lead:** Today's operation on one screen — who's on, what's open, and what's blocking a clean handover.
**Will do:**
- Staffing vs forecast load for the day
- Room-turn status and open maintenance at a glance
- Covers, stock and supplier orders in view
**What's next:** Staff, housekeeping, F&B and procurement plug into this view as they ship.

### Staff  `staff`
**Lead:** A rota built from forecast occupancy and real workload, not gut feel — with its labour cost attached.
**Will do:**
- Rotas from forecast occupancy, room-turn load and the restaurant book
- Legal, contract and fairness rules kept as hard constraints
- Swap requests and sick-day rebalancing handled for you
**What's next:** A daily briefing layer — the rota decides who works, the briefing tells them what matters today.

### Housekeeping / Maintenance  `housekeeping`
**Lead:** Cleaning routes built from the day's arrivals and departures, and maintenance tickets that never hide in an inbox.
**Will do:**
- An optimal cleaning route from arrivals, departures and stayovers
- Maintenance tickets logged from guest messages and triaged with context
- Turn-time tracked and engineering holds visible on the room board
**What's next:** Protects same-day re-sells by keeping room readiness and repairs on one board.

### F&B  `fnb`
**Lead:** The restaurant floor optimised — seating, pacing, no-show prediction — synced with the rooms business it feeds.
**Will do:**
- Seating plan, covers pacing and turn times
- No-show prediction and walk-in vs reservation balance
- Synced with concierge and guest bookings
**What's next:** Ties into procurement, so covers on the book size tomorrow's orders.

### Procurement / Supply  `procurement`
**Lead:** Orders sized to real occupancy, not habit — with the reasoning on every line and price creep flagged.
**Will do:**
- Reads coming occupancy and covers to size each stock line
- Caps perishables at forecast, so waste can't creep back in
- Sends routine orders to suppliers automatically (the daily bakery run)
**What's next:** Shares the same forecast the pricing engine uses, so ops and revenue read one number.

---

## Finance

### Finance › Dashboard  `finance`
**Lead:** Revenue, cost and cash in one view — the property's P&L without the spreadsheet.
**Will do:**
- Revenue (PMS), expenses and web traffic pulled together
- Ask any numbers question in plain language, get a chart back
- Board-ready exports on demand
**What's next:** Invoice filing, reporting and disputes plug in below to keep the numbers current.

### Reporting / Audit  `finance-reporting`
**Lead:** Night-audit and owner reporting generated and reconciled — PMS against the ledger, mismatches flagged.
**Will do:**
- A one-page owner report built for you every week
- PMS reservations reconciled against the finances sheet
- Revenue leakage caught inside a rolling window, while it's still fixable
**What's next:** Invoice capture and procure-to-pay feed it, keeping the books audit-ready with near-zero effort.

### Chargeback  `chargeback`
**Lead:** Disputes caught early and packaged to win — the evidence assembled and the response drafted before the deadline.
**Will do:**
- Detects chargebacks and disputes as they land
- Assembles the evidence pack: booking, comms, policy, signatures
- Drafts the response, held for your review before submission
**What's next:** Lifts your dispute win-rate and recovers a share of what's currently written off.

---

## Oversight / Management

### Oversight › Dashboard  `oversight`
**Lead:** The owner's view across every property and every Fondas agent, in one place.
**Will do:**
- Each property scored on the same yardstick, weekly
- A ranked fix list per GM
- Portfolio questions answered in seconds, with charts
**What's next:** AI management and team activity plug in, so you can see and steer the whole operation.

### AI Management  `ai-management`
**Lead:** See and steer what Fondas' AI is doing on your behalf — what it drafted, sent and decided — with a supervisor watching the rest.
**Will do:**
- A live board: replies sent unchanged, edit rate and hand-off rate per agent
- A supervisor that pulls any agent off the field before a bad message ships
- Pause or resume any agent on command
**What's next:** Agents earn autonomy as their edit rate falls — you turn each up as it proves itself.

### Team Activity  `team-activity`
**Lead:** What each seat — reception, back office — is handling right now, and how much Fondas is taking off their plate.
**Will do:**
- A live view of who (human or agent) is handling what
- Where human edits cluster, so the knowledge base gets fixed
- How much routine work is running hands-free, per seat
**What's next:** A coaching loop reads every human edit and sharpens the whole roster week over week.

---

## Note on framing

Every page keeps the existing "Coming soon" eyebrow — nothing here claims a
feature is live. The copy is original and generic to hotel operations; it takes
the *shape* of TH1's agent roster (which the product is openly modelled on) but
none of its wording. If you'd rather soften the roadmap language (e.g. drop a
"What's next" line that commits to sequence), it's a per-key edit.
