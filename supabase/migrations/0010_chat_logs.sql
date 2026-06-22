-- ============================================================================
-- Fonda — Ask Your Hotel chat logs
--
-- Records chat turns for quality review. Guest names in the assistant's answers
-- are already pseudonymised (first name + last initial) by the context builder.
-- ============================================================================

create table public.chat_logs (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index chat_logs_hotel_created_idx on public.chat_logs (hotel_id, created_at desc);

-- RLS: hotel members read their own chat history. Writes come from the chat
-- route via the service_role key (bypasses RLS), so no client write policies.
alter table public.chat_logs enable row level security;

create policy "chat_logs: read own hotel"
  on public.chat_logs for select to authenticated
  using (hotel_id = public.current_hotel_id());
