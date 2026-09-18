@AGENTS.md

# Fondas — Hotel AI SaaS

Fondas is a SaaS product for hotels. See `README.md` for the full overview.
The product name is **Fondas** everywhere customer-facing (wordmark, emails,
legal pages). The design system is separately named **Signal** — "Fonda" in
design-token comments and `FONDA_DESIGN_IDENTITY.md` refers to that system, not
the product, and should be left as-is.

Situational docs live in the repo root — read them when a task calls for them, not by default:

- `ROADMAP.md` — **the only roadmap.** Priority and sequencing live here and nowhere
  else. It supersedes PATH_TO_MVP / WHATS_LEFT / LAUNCH_PUNCHLIST / FEATURE_GAPS /
  BUILD_PLAN_JULY31 / STAGE0 / F1_FOUNDER_CHECKLIST / the Dev Roadmap `.docx` and the
  two `*_START_HERE` notes. **If another document claims a priority or a build order,
  it is stale — ROADMAP.md wins.**
- `GTM_STRATEGY.md` — market, positioning, pricing, pilot outreach, the raise.
  `POSITIONING_V3.md` amends its §3.1, §4.7–4.9 and §4.13; where they differ,
  POSITIONING_V3 wins.
- `APP_UX_PROPOSAL.md` — the product IA and UX spec (two pillars, the rail, Home,
  chat, the Operation surfaces). `SITE_REDESIGN_V3.md` — the marketing site spec.
- `EXECUTION_PLAYBOOK.md` — build-task prompts and the B1–B22 task-ID map.
- `APP_UX_PROMPTS.md` — the Claude Code prompts that implement
  `APP_UX_PROPOSAL.md`, W2–W8 (prompts 1–21). Run them in `ROADMAP.md` §2's
  order; the pack itself says *how* to ask, never *when*.
- `RUNBOOK.md` — ops and go-live. `RELIABILITY.md` — the morning ritual and the
  daily log. `B1_VERIFY_RUNBOOK.md` — the brief-delivery E2E test.

# Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Start (prod build): `npm run start`
- Lint: `npm run lint`

# Tech stack

- Framework: Next.js 16.2.9 (App Router) + React 19
- Styling: Tailwind CSS 4
- Database / backend: Supabase, accessed directly via `@supabase/supabase-js`
  and `@supabase/ssr`. No Prisma or other ORM — write Supabase queries directly.
- Package manager: npm (the lockfile is `package-lock.json`; do not introduce
  pnpm or yarn).

# Workflow

- YOU MUST run `npm run lint` after a series of code changes and fix what it
  reports before considering the work done.
- Use Supabase server/client helpers correctly: `@supabase/ssr` for server
  components, route handlers, and middleware; the browser client only in client
  components. Do not mix them.
- Do not add new dependencies without flagging it first; prefer libraries already
  in use.
- Commit messages should be descriptive. Don't force-push to shared branches.

# Code style

- ES modules (`import`/`export`), not CommonJS.
- Prefer React Server Components by default; add `"use client"` only when a
  component needs interactivity or browser APIs.
- Follow the patterns in neighboring files rather than introducing new ones.

# Design

All visual and design decisions for Fonda — color, typography, spacing, radius,
shadows, component styling, and page layout — MUST follow the **current** design
spec, v3 "Fonda × Sana", which lives in `FONDA_SANA_REDESIGN.md`.

YOU MUST read `FONDA_SANA_REDESIGN.md` before writing or changing any UI —
components, pages, or styles. It is deliberately not auto-loaded into every
session, so open it with the Read tool at the start of a UI task.

The system in one line: one grotesque typeface (Geist + Geist Mono), a neutral
light grey (`#EEEEEE`) page ground with white cards floating on top — warmth
carried in the surfaces, borders and ink, not the page — colorless chrome (no
navy in nav, active states, or chips), color reserved for content (gradient hero
cards plus one accent inside data viz), soft-cornered controls (10px, no pills),
a slim icon-only left rail, light only.

`FONDA_DESIGN_IDENTITY.md` is the previous system (v2 "Signal"). Keep it for
background and history — it still explains the type scale, spacing rhythm, and
the one-accent discipline the v3 system inherits. But it is **not** the
authority: where the two conflict, **FONDA_SANA_REDESIGN.md wins** for all
app/product and marketing UI.

When the design spec conflicts with existing component styles, the spec wins —
update the component to match it.

# Safety & boundaries

- IMPORTANT: Never commit secrets. `.env*` files and Supabase keys must never be
  staged or committed. The service-role key is server-only — never expose it to
  the client or ship it in a client component.
- This is guest-facing hotel software: treat PII (guest names, contact details,
  booking and payment data) as sensitive — never log it in plaintext or return it
  in client-side responses.
- Never run destructive database or migration commands without explicit
  confirmation.
- Rely on Supabase Row Level Security for data access; don't bypass it with the
  service-role key as a shortcut.
