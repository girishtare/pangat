-- Pangat stage 2.1: host sign-in and per-side read access.
--
-- Hosts sign in with Supabase Auth (email + password; the owner creates the
-- accounts, public sign-up stays off). A `hosts` row links a user to one event
-- and one side; side null = both sides.
--
-- Hosts can only READ, and only their own event and side. Every write (guest
-- replies, and later mark-on-behalf) still goes through server code using the
-- service-role key. Guests and the anon key still see nothing.

alter table public.hosts
  add constraint hosts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
create index hosts_user_id_idx on public.hosts(user_id);

-- Helpers live in a schema the Data API does not expose, so they cannot be
-- called as RPCs. Security definer so policies can consult `hosts` without
-- recursing through its own RLS.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_host(p_event uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hosts h
    where h.user_id = (select auth.uid()) and h.event_id = p_event
  );
$$;

create function private.can_see_side(p_event uuid, p_side public.side) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hosts h
    where h.user_id = (select auth.uid())
      and h.event_id = p_event
      and (h.side is null or h.side = p_side)
  );
$$;

create function private.can_see_household(p_household uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.households hh
    join public.hosts h on h.event_id = hh.event_id
    where hh.id = p_household
      and h.user_id = (select auth.uid())
      and (h.side is null or h.side = hh.side)
  );
$$;

revoke all on function private.is_host(uuid), private.can_see_side(uuid, public.side),
  private.can_see_household(uuid) from public, anon;
grant execute on function private.is_host(uuid), private.can_see_side(uuid, public.side),
  private.can_see_household(uuid) to authenticated;

-- Read policies for signed-in hosts.
create policy hosts_read_own on public.hosts
  for select to authenticated using (user_id = (select auth.uid()));

create policy events_read_host on public.events
  for select to authenticated using (private.is_host(id));

create policy functions_read_host on public.functions
  for select to authenticated using (private.is_host(event_id));

create policy households_read_side on public.households
  for select to authenticated using (private.can_see_side(event_id, side));

create policy invites_read_side on public.invites
  for select to authenticated using (private.can_see_household(household_id));

create policy responses_read_side on public.responses
  for select to authenticated using (private.can_see_household(household_id));

create policy response_history_read_side on public.response_history
  for select to authenticated using (private.can_see_household(household_id));

-- Defence in depth: the browser-facing roles get no write privileges at all,
-- and anon gets nothing, whatever policies are added later by mistake.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon, authenticated;
