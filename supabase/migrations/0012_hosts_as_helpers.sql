-- Pangat: the owner and co-owners are on the to-do list by default, with names.
--
-- * hosts get a full name (owners and co-owners have only an email otherwise).
-- * Every host has a matching `helpers` row (host_user_id), kept in step by a
--   trigger: name, side; removed when they stop being a host.
-- * The owner has no side: their helper row has side null, meaning "both
--   sides", and every host of the event can see it and give them tasks.
--   Tasks given to the owner have side null too.

alter table public.hosts
  add column full_name text check (full_name is null or char_length(full_name) between 1 and 120);

alter table public.helpers
  add column host_user_id uuid references auth.users(id) on delete cascade;
alter table public.helpers alter column side drop not null;
create unique index helpers_event_host_idx on public.helpers(event_id, host_user_id) where host_user_id is not null;

alter table public.tasks alter column side drop not null;

-- Checked at the end of the statement, not row by row: deleting an event
-- removes its tasks and its helpers in one go. Removing a host whose helper
-- row still has tasks is still refused.
alter table public.tasks drop constraint tasks_helper_id_fkey;
alter table public.tasks add constraint tasks_helper_id_fkey foreign key (helper_id) references public.helpers(id);

-- A person or task with no side (the owner's) is visible to every host.
drop policy helpers_read_side on public.helpers;
create policy helpers_read_side on public.helpers
  for select to authenticated
  using (case when side is null then private.is_host(event_id) else private.can_see_side(event_id, side) end);

drop policy tasks_read_side on public.tasks;
create policy tasks_read_side on public.tasks
  for select to authenticated
  using (case when side is null then private.is_host(event_id) else private.can_see_side(event_id, side) end);

-- The name shown for a host: the one typed in, else their Google name, else their email.
create function private.host_display_name(p_user uuid, p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select left(coalesce(
    nullif(btrim(p_name), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    u.email,
    'Host'
  ), 120)
  from auth.users u where u.id = p_user;
$$;
revoke all on function private.host_display_name(uuid, text) from public, anon, authenticated;

create function public.hosts_sync_helper() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.helpers where event_id = old.event_id and host_user_id = old.user_id;
    return old;
  end if;
  insert into public.helpers (event_id, host_user_id, full_name, side)
  values (new.event_id, new.user_id, coalesce(private.host_display_name(new.user_id, new.full_name), 'Host'), new.side)
  on conflict (event_id, host_user_id) where host_user_id is not null
  do update set full_name = excluded.full_name, side = excluded.side;
  return new;
end;
$$;
revoke all on function public.hosts_sync_helper() from public, anon, authenticated;

create trigger hosts_sync_helper
  after insert or update of full_name, side or delete on public.hosts
  for each row execute function public.hosts_sync_helper();

-- Existing hosts join the list now.
insert into public.helpers (event_id, host_user_id, full_name, side)
select h.event_id, h.user_id, coalesce(private.host_display_name(h.user_id, h.full_name), 'Host'), h.side
from public.hosts h
on conflict (event_id, host_user_id) where host_user_id is not null do nothing;
