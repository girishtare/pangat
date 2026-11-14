-- Pangat: an icon per function (owner, 14 Nov), picked from a fixed list on
-- Event settings and shown on the Guest list ("Invited to") with a legend.
-- No two functions of one event share an icon.
--
-- The list of keys must match src/lib/functionIcons.ts.
-- A function saved without an icon (create_event, a new function where none
-- was picked, and the backfill below) gets one from its name, else the first
-- icon still free in its event.

alter table public.functions
  add column icon text check (icon in (
    'sun', 'flower', 'heart', 'gem', 'party', 'music', 'hand', 'flame', 'utensils', 'sparkles',
    'star', 'moon', 'gift', 'crown', 'camera', 'car', 'house', 'leaf', 'drum', 'wine'
  ));

create unique index functions_event_icon_key on public.functions (event_id, icon) where icon is not null;

create or replace function private.pick_function_icon(p_event uuid, p_name text, p_self uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  n text := lower(coalesce(p_name, ''));
  wanted text[];
  all_icons text[] := array[
    'sun', 'flower', 'heart', 'gem', 'party', 'music', 'hand', 'flame', 'utensils', 'sparkles',
    'star', 'moon', 'gift', 'crown', 'camera', 'car', 'house', 'leaf', 'drum', 'wine'
  ];
  i text;
begin
  wanted := case
    when n ~ 'haldi|halad' then array['sun', 'flower']
    when n ~ 'meh[e]?n?di|mehndi' then array['hand', 'leaf']
    when n ~ 'sangeet|sangit' then array['music', 'drum']
    when n ~ 'engage|sakhar|ring' then array['gem', 'crown']
    when n ~ 'wedding|lagna|lagn|vivah|shaadi|shadi' then array['heart', 'gem']
    when n ~ 'reception' then array['party', 'sparkles']
    when n ~ 'puja|pooja|havan|satyanarayan|ganpati' then array['flame', 'star']
    when n ~ 'lunch|dinner|meal|jevan|bhojan' then array['utensils']
    when n ~ 'baraat|barat|varat' then array['car']
    when n ~ 'griha|house|vastu' then array['house']
    when n ~ 'cocktail|party' then array['wine', 'party']
    else array[]::text[]
  end;
  foreach i in array wanted || all_icons loop
    if not exists (
      select 1 from public.functions f
      where f.event_id = p_event and f.icon = i and f.id is distinct from p_self
    ) then
      return i;
    end if;
  end loop;
  return null; -- more functions than icons: leave it blank
end;
$$;

create or replace function private.functions_default_icon()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.icon is null then
    new.icon := private.pick_function_icon(new.event_id, new.name_en, new.id);
  end if;
  return new;
end;
$$;

create trigger functions_default_icon
  before insert on public.functions
  for each row execute function private.functions_default_icon();

-- Existing functions, one at a time in date order, so each sees the icons already given.
do $$
declare
  r record;
begin
  for r in select id, event_id, name_en from public.functions order by event_id, starts_at, sort_order loop
    update public.functions
      set icon = private.pick_function_icon(r.event_id, r.name_en, r.id)
      where id = r.id;
  end loop;
end;
$$;
