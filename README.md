# Fonda

Hotel operations SaaS for independent hotel GMs (20–200 rooms).

Core surfaces:

- **Morning AI briefing** — a daily summary of what needs attention
- **AI email assistant** — draft and triage guest email
- **Check-in time chasing** — automatically confirm guest arrival times
- **Hotel query chat** — ask anything about your hotel in plain language

## Stack

- **Next.js 16** (App Router). Note: Next.js 16 renamed Middleware to **Proxy**
  (`proxy.ts` at the project root) — see `proxy.ts`.
- **Supabase** for auth (email/password) and database
- **shadcn/ui** + **Tailwind CSS v4** for components
- **Inter** typeface, primary brand colour `#1A56DB`

## Getting started

```bash
cp .env.example .env.local   # fill in your Supabase + API keys
npm install
npm run dev
```

Then open http://localhost:3000.

You need a [Supabase project](https://supabase.com/dashboard). Copy the project
URL and anon key into `.env.local`. Email/password auth is enabled by default in
Supabase. For local development without email confirmation, disable
"Confirm email" under Authentication → Providers → Email.

## Project structure

```
app/
  (auth)/            Login & signup (route group, no URL segment)
    actions.ts       Server Actions: login / signup / logout
    login/           /login
    signup/          /signup
  dashboard/         Protected area (guarded by proxy.ts + layout check)
  layout.tsx         Root layout (Inter font, metadata)
  page.tsx           Marketing landing page
components/
  ui/                shadcn/ui primitives (button, input, label, card)
  auth/              Auth form
  brand/             Wordmark
lib/
  supabase/          client (browser), server (RSC/actions), proxy (session)
  features.ts        The four product surfaces
  utils.ts           cn() helper
types/               Shared domain types
proxy.ts             Session refresh + /dashboard guard (Next.js 16 "Proxy")
```

## Database

The schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
`hotels`, `users`, `briefings`, `emails`, `checkin_chasers`, `hotel_settings`.

Apply it with the Supabase CLI (`supabase db push`) or by pasting the file into
the Supabase **SQL Editor**.

**Tenancy & RLS.** Every row belongs to one hotel, and a user belongs to one
hotel. Row-Level Security restricts all reads to the caller's hotel, resolved
via the `public.current_hotel_id()` helper (a `SECURITY DEFINER` function — this
is what lets the `users` policy reference its own table without recursion).
Owner-only and self-only rules are layered on top for writes.

**Provisioning is server-side.** There's deliberately no client `INSERT` policy
on `hotels` or `users` — a user could otherwise attach themselves to any hotel.
Create the hotel + first user row from a trusted context using the
`service_role` key (which bypasses RLS), e.g. during onboarding.

## Auth flow

- Unauthenticated requests to `/dashboard/*` are redirected to `/login` by
  `proxy.ts` (with a `redirectTo` param), and again by the dashboard layout as
  defense-in-depth.
- Authenticated users visiting `/login` or `/signup` are sent to `/dashboard`.
- `lib/supabase/server.ts` and `lib/supabase/proxy.ts` keep the session cookies
  fresh on every request.
