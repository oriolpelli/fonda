-- ============================================================================
-- Fonda — per-user Home layouts (APP_UX_PROPOSAL.md §3.5)
--
-- Home's order stopped being a property of `page.tsx` and became data in
-- `lib/home-widgets.ts`. This table is where that data stops being a constant
-- and becomes the user's: one row holds the ordered array of widget keys they
-- chose, with the ones they switched off still in the array so the Customize
-- panel can show them unchecked in the place they left them.
--
-- Per-user rather than per-hotel, deliberately. An owner and a GM open Home
-- for different reasons — the owner wants the numbers and the fortnight ahead,
-- the manager wants who is arriving and who is waiting on a reply — and a
-- shared layout would make one of them lose that argument every morning.
-- `users.id` IS `auth.users.id`, so the primary key doubles as the RLS subject
-- and there is no join to get wrong.
--
-- `hotel_id` is carried even though `user_id` already implies it. It is what
-- the policies scope on, so a layout saved at one hotel cannot be read or
-- rewritten from a session at another, and it gives the row a second cascade:
-- delete the hotel and the layouts go with it, without waiting for the user
-- rows to be cleaned up first.
--
-- AN ABSENT ROW IS NOT AN ERROR — it is the default layout, which is why there
-- is no backfill and no insert at signup. `lib/home-layout.ts` resolves a
-- missing row from `users.role`, and resolves a *stale* one too: unknown keys
-- are dropped on read and newly-shipped widgets are appended. So shipping a
-- widget, renaming one, or retiring one never needs a migration over this
-- table and never leaves a user staring at a layout that silently lost a card.
--
-- Nothing here is PII. A row is a list of widget keys and booleans — no guest
-- data, no hotel data, nothing that reads back as a record of anyone's stay.
-- Keep it that way: this is a preferences table, not a place to park state.
-- ============================================================================

create table if not exists public.dashboard_layouts (
  user_id    uuid primary key references public.users (id) on delete cascade,
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  widgets    jsonb not null check (jsonb_typeof(widgets) = 'array'),
  updated_at timestamptz not null default now()
);

comment on table public.dashboard_layouts is
  'One row per user holding their Home layout. Absent = the role defaults in '
  'lib/home-layout.ts; there is no backfill and no row created at signup.';
comment on column public.dashboard_layouts.widgets is
  'Ordered array of {key, enabled}. Order is the render order; enabled false '
  'keeps a widget in the Customize list without rendering it. "needs-you" is '
  'never stored — it is pinned by the registry, not chosen by the user. '
  'Unknown keys are ignored on read, so retiring a widget breaks no saved '
  'layout.';

-- The hotel cascade above has no index to work with otherwise, and every
-- delete of a hotel would seq-scan this table. Same reason users_hotel_id_idx
-- exists in 0001.
create index if not exists dashboard_layouts_hotel_id_idx
  on public.dashboard_layouts (hotel_id);

-- RLS: your row, at your hotel, and nothing else.
--
-- Both halves are load-bearing. `user_id = auth.uid()` is what makes the table
-- per-user; `hotel_id = public.current_hotel_id()` — the same helper every
-- policy in 0001 uses — is what keeps a row from being written against someone
-- else's tenant. Writes come from the user's own session through the
-- RLS-scoped server client, never the service role: there is no server job
-- that needs to author a layout on a user's behalf.
--
-- No delete policy. The two cascades above are the only way a row should ever
-- disappear; "reset to defaults" is a delete the product doesn't need, because
-- saving the default array is the same thing.
alter table public.dashboard_layouts enable row level security;

drop policy if exists "dashboard_layouts: read own" on public.dashboard_layouts;
create policy "dashboard_layouts: read own"
  on public.dashboard_layouts for select to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "dashboard_layouts: insert own" on public.dashboard_layouts;
create policy "dashboard_layouts: insert own"
  on public.dashboard_layouts for insert to authenticated
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

drop policy if exists "dashboard_layouts: update own" on public.dashboard_layouts;
create policy "dashboard_layouts: update own"
  on public.dashboard_layouts for update to authenticated
  using (user_id = auth.uid() and hotel_id = public.current_hotel_id())
  with check (user_id = auth.uid() and hotel_id = public.current_hotel_id());

notify pgrst, 'reload schema';
