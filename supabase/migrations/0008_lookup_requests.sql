-- Pangat stage 2.5: "Not us" lookup with a host approval queue.
--
-- A guest who opens a link that isn't theirs leaves their mobile number. The
-- server looks for a household of the event with that mobile but tells the
-- guest nothing either way. Hosts see the request (on the side of the link
-- that was opened, or of the matched household) and either send the matched
-- household its own link on WhatsApp, or dismiss it.

create table public.lookup_requests (
  id                   bigint generated always as identity primary key,
  event_id             uuid not null references public.events(id) on delete cascade,
  opened_household_id  uuid not null references public.households(id) on delete cascade,
  mobile               text not null check (char_length(mobile) <= 20),
  matched_household_id uuid references public.households(id) on delete set null,
  status               text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  created_at           timestamptz not null default now(),
  resolved_by          uuid references auth.users(id) on delete set null,
  resolved_at          timestamptz
);
create index lookup_requests_event_status_idx on public.lookup_requests(event_id, status);
create index lookup_requests_opened_idx on public.lookup_requests(opened_household_id, created_at);
create index lookup_requests_matched_idx on public.lookup_requests(matched_household_id);

alter table public.lookup_requests enable row level security;

create policy lookup_requests_read_side on public.lookup_requests
  for select to authenticated
  using (
    private.can_see_household(opened_household_id)
    or (matched_household_id is not null and private.can_see_household(matched_household_id))
  );

revoke all on public.lookup_requests from anon;
revoke insert, update, delete, truncate on public.lookup_requests from authenticated;
