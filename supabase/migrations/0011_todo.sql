-- Pangat: a to-do list for the family. Who is doing what, by when.
--
-- `helpers` are the people tasks are given to: relatives and friends who never
-- sign in. Each belongs to the bride's or the groom's side. `tasks` are given
-- to one helper, may be tied to one function, and carry a deadline and a
-- status. A task's side is always its helper's side (kept by triggers), so the
-- usual per-side rule applies: the owner sees both sides, a co-owner their own.
--
-- As elsewhere, hosts only READ through row-level security; every write goes
-- through server code with the service-role key after a permission check.

create table public.helpers (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  phone       text check (phone is null or char_length(phone) <= 20),
  side        public.side not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);
create index helpers_event_side_idx on public.helpers(event_id, side);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  helper_id    uuid not null references public.helpers(id) on delete restrict,
  side         public.side not null,
  title        text not null check (char_length(title) between 1 and 200),
  note         text check (note is null or char_length(note) <= 1000),
  function_id  uuid references public.functions(id) on delete set null,
  due_on       date not null,
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null
);
create index tasks_event_side_idx on public.tasks(event_id, side, due_on);
create index tasks_helper_idx on public.tasks(helper_id);
create index tasks_function_idx on public.tasks(function_id);

-- A task takes its side from its helper, and the helper must belong to the
-- same event (so must the function, if there is one).
create function public.tasks_take_helper_side() returns trigger
language plpgsql set search_path = '' as $$
declare
  h record;
begin
  select event_id, side into h from public.helpers where id = new.helper_id;
  if h.event_id is distinct from new.event_id then
    raise exception 'helper % is not part of event %', new.helper_id, new.event_id;
  end if;
  if new.function_id is not null and not exists (
    select 1 from public.functions f where f.id = new.function_id and f.event_id = new.event_id
  ) then
    raise exception 'function % is not part of event %', new.function_id, new.event_id;
  end if;
  new.side := h.side;
  new.updated_at := now();
  return new;
end;
$$;
create trigger tasks_take_helper_side
  before insert or update on public.tasks
  for each row execute function public.tasks_take_helper_side();

-- Moving a helper to the other side moves their tasks with them.
create function public.helpers_carry_side() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.side is distinct from old.side then
    update public.tasks set side = new.side where helper_id = new.id;
  end if;
  return new;
end;
$$;
create trigger helpers_carry_side
  after update of side on public.helpers
  for each row execute function public.helpers_carry_side();

revoke all on function public.tasks_take_helper_side(), public.helpers_carry_side() from public, anon, authenticated;

alter table public.helpers enable row level security;
alter table public.tasks enable row level security;

create policy helpers_read_side on public.helpers
  for select to authenticated using (private.can_see_side(event_id, side));
create policy tasks_read_side on public.tasks
  for select to authenticated using (private.can_see_side(event_id, side));

revoke all on public.helpers, public.tasks from anon;
revoke insert, update, delete, truncate on public.helpers, public.tasks from authenticated;
