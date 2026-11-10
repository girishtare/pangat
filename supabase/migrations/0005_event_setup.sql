-- Pangat: events, functions and hosts are managed on the page, not in SQL.
--
-- Hosts of both sides (hosts.side is null) manage an event: details,
-- functions, and who else is a host. All writes go through server code with
-- the service-role key after that check; these functions are callable only
-- with that key.

alter table public.events
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.events
  add constraint events_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$');

-- Create an event, its starting functions and its first host in one go.
create function public.create_event(
  p_user uuid, p_slug text, p_name_en text, p_name_mr text, p_cutoff timestamptz, p_functions jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  ev uuid;
begin
  insert into public.events (slug, name_en, name_mr, cutoff_at, created_by)
  values (p_slug, p_name_en, p_name_mr, p_cutoff, p_user)
  returning id into ev;

  insert into public.functions (event_id, name_en, name_mr, starts_at, venue, catered, sort_order)
  select ev, f.name_en, f.name_mr, f.starts_at, f.venue, coalesce(f.catered, true), coalesce(f.sort_order, 0)
  from jsonb_to_recordset(p_functions) as f(
    name_en text, name_mr text, starts_at timestamptz, venue text, catered boolean, sort_order int
  );

  insert into public.hosts (event_id, user_id, side) values (ev, p_user, null);
  return ev;
end $$;

-- Look up a sign-in account by email (auth.users is not exposed to the API).
create function public.user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

-- Hosts of an event with their emails, for the settings page.
create function public.event_hosts(p_event uuid)
returns table (user_id uuid, email text, side public.side, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.user_id, u.email::text, h.side, u.last_sign_in_at
  from public.hosts h join auth.users u on u.id = h.user_id
  where h.event_id = p_event
  order by h.side nulls first, u.email;
$$;

revoke all on function public.create_event(uuid, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.event_hosts(uuid) from public, anon, authenticated;
grant execute on function public.create_event(uuid, text, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.user_id_by_email(text) to service_role;
grant execute on function public.event_hosts(uuid) to service_role;
