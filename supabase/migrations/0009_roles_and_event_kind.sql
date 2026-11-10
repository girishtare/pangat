-- Pangat: open sign-up. Anyone can create an event and becomes its owner;
-- the owner adds up to 3 co-owners per side.
--
--   owner     side null, one per event. Sees both sides; the only one who
--             changes event settings, functions, co-owners, caterer numbers.
--   co_owner  side bride or groom, at most 3 per side. Sees and works on
--             their side only (guests, slips, WhatsApp).

alter table public.hosts
  add column role text not null default 'co_owner' check (role in ('owner', 'co_owner'));

update public.hosts set role = 'owner' where side is null;

alter table public.hosts
  add constraint hosts_role_side check ((role = 'owner') = (side is null));

create unique index hosts_one_owner_per_event on public.hosts(event_id) where role = 'owner';

create function private.check_co_owner_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role = 'co_owner' and (
    select count(*) from public.hosts h
    where h.event_id = new.event_id and h.side = new.side and h.role = 'co_owner' and h.user_id <> new.user_id
  ) >= 3 then
    raise exception 'at most 3 co-owners per side' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger hosts_co_owner_limit
  before insert or update on public.hosts
  for each row execute function private.check_co_owner_limit();

-- What kind of event. Only weddings today; the sides (bride, groom) are a wedding idea.
alter table public.events
  add column kind text not null default 'wedding' check (kind in ('wedding'));

-- create_event: the creator becomes the owner.
create or replace function public.create_event(
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

  insert into public.hosts (event_id, user_id, side, role) values (ev, p_user, null, 'owner');
  return ev;
end $$;

-- Hosts with role, for the settings page.
drop function public.event_hosts(uuid);
create function public.event_hosts(p_event uuid)
returns table (user_id uuid, email text, side public.side, role text, last_sign_in_at timestamptz, confirmed boolean)
language sql stable security definer set search_path = '' as $$
  select h.user_id, u.email::text, h.side, h.role, u.last_sign_in_at, u.email_confirmed_at is not null
  from public.hosts h join auth.users u on u.id = h.user_id
  where h.event_id = p_event
  order by h.role desc, h.side, u.email;
$$;
revoke all on function public.event_hosts(uuid) from public, anon, authenticated;
grant execute on function public.event_hosts(uuid) to service_role;

revoke all on function public.create_event(uuid, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.create_event(uuid, text, text, text, timestamptz, jsonb) to service_role;

-- How many events a user owns (open sign-up: cap them).
create function public.owned_event_count(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.hosts where user_id = p_user and role = 'owner';
$$;
revoke all on function public.owned_event_count(uuid) from public, anon, authenticated;
grant execute on function public.owned_event_count(uuid) to service_role;
