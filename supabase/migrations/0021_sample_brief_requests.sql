-- ============================================================================
-- Fonda — sample-brief requests on the existing newsletter list
--
-- /sample-brief shows a fully readable example brief and then asks, underneath
-- it, whether the reader wants one written for their own hotel. That ask is a
-- lead, not a newsletter signup, but it is the same shape of thing: a public
-- address, captured unauthenticated, confirmed by double opt-in. So it reuses
-- `newsletter_subscribers` rather than introducing a second table with a second
-- copy of the token, cooldown and consent logic to keep in step.
--
-- What separates the two is `source`. Everything already in the table came from
-- the footer form, which is why the default backfills existing rows as
-- 'newsletter'.
--
-- The RLS posture of the base table is unchanged and still deny-all: these
-- columns hold MORE identifying information than before (a person's first name
-- and their hotel), so nothing here is readable with the anon or authenticated
-- key. Only the server action's service_role client touches it.
-- ============================================================================

alter table public.newsletter_subscribers
  add column if not exists source text not null default 'newsletter'
    check (source in ('newsletter', 'sample_brief')),
  add column if not exists hotel_name text,
  add column if not exists first_name text,
  add column if not exists sample_requested_at timestamptz;

comment on column public.newsletter_subscribers.source is
  'Which capture point created this row: newsletter = the footer form; '
  'sample_brief = the request form under the sample brief. A sample_brief row '
  'is a sales lead and carries hotel_name; a newsletter row does not.';
comment on column public.newsletter_subscribers.hotel_name is
  'The hotel the requester says they run. Free text, required by the request '
  'form, null for newsletter signups. Guest-facing PII rules apply: do not log '
  'it and do not return it to any client.';
comment on column public.newsletter_subscribers.first_name is
  'How to address the reply. Optional, and null for newsletter signups.';
comment on column public.newsletter_subscribers.sample_requested_at is
  'When a sample brief was last requested. Kept separate from source so that a '
  'newsletter subscriber who later asks for a brief is still identifiable as '
  'having done both, even though source now reads sample_brief.';

-- Lets sales pull the leads without scanning the whole list.
create index if not exists newsletter_subscribers_source_idx
  on public.newsletter_subscribers (source, created_at desc);

notify pgrst, 'reload schema';
