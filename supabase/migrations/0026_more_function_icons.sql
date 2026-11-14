-- Pangat: 15 more function icons and more name words (owner, 14 Nov: "pull
-- the icons based on what function name the user added"). Keys and words
-- match src/lib/functionIcons.ts (FUNCTION_ICONS, ICON_WORDS).

alter table public.functions drop constraint if exists functions_icon_check;
alter table public.functions add constraint functions_icon_check check (icon in (
  'sun', 'flower', 'heart', 'gem', 'party', 'music', 'hand', 'flame', 'utensils', 'sparkles',
  'star', 'moon', 'gift', 'crown', 'camera', 'car', 'house', 'leaf', 'drum', 'wine',
  'cake', 'mic', 'bell', 'sunrise', 'sunset', 'guitar', 'coffee', 'martini', 'chef', 'handshake',
  'hearthands', 'baby', 'ribbon', 'tent', 'plane'
));

create or replace function private.pick_function_icon(p_event uuid, p_name text, p_self uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  n text := lower(coalesce(p_name, ''));
  wanted text[] := array[]::text[];
  all_icons text[] := array[
    'sun', 'flower', 'heart', 'gem', 'party', 'music', 'hand', 'flame', 'utensils', 'sparkles',
    'star', 'moon', 'gift', 'crown', 'camera', 'car', 'house', 'leaf', 'drum', 'wine',
    'cake', 'mic', 'bell', 'sunrise', 'sunset', 'guitar', 'coffee', 'martini', 'chef', 'handshake',
    'hearthands', 'baby', 'ribbon', 'tent', 'plane'
  ];
  i text;
begin
  -- Every matching group, in order (the first free icon wins), as in ICON_WORDS.
  if n ~ 'haldi|halad' then wanted := wanted || array['sun', 'flower']; end if;
  if n ~ 'meh[e]?n?di|mehndi' then wanted := wanted || array['hand', 'leaf']; end if;
  if n ~ 'sangeet|sangit|dandiya|garba|dance' then wanted := wanted || array['music', 'mic', 'drum']; end if;
  if n ~ 'engage|sakhar|ring|tilak|roka' then wanted := wanted || array['gem', 'crown']; end if;
  if n ~ 'wedding|lagna|lagn|vivah|shaadi|shadi|pheras|saptapadi|mangalashtak' then wanted := wanted || array['heart', 'hearthands', 'gem']; end if;
  if n ~ 'reception|swagat' then wanted := wanted || array['party', 'sparkles']; end if;
  if n ~ 'puja|pooja|havan|satyanarayan|ganpati|ganesh|devak|gondhal' then wanted := wanted || array['flame', 'bell']; end if;
  if n ~ 'breakfast|nashta|tea|chai' then wanted := wanted || array['coffee']; end if;
  if n ~ 'lunch|dinner|meal|jevan|bhojan|feast|kelvan' then wanted := wanted || array['utensils', 'chef']; end if;
  if n ~ 'baraat|barat|varat' then wanted := wanted || array['car', 'drum']; end if;
  if n ~ 'griha|house|vastu' then wanted := wanted || array['house']; end if;
  if n ~ 'cocktail|bar\y' then wanted := wanted || array['martini', 'wine']; end if;
  if n ~ 'party' then wanted := wanted || array['party', 'wine']; end if;
  if n ~ 'cake' then wanted := wanted || array['cake']; end if;
  if n ~ 'morning|sunrise' then wanted := wanted || array['sunrise']; end if;
  if n ~ 'evening|sunset' then wanted := wanted || array['sunset']; end if;
  if n ~ 'welcome|meet|milan' then wanted := wanted || array['handshake']; end if;
  if n ~ 'photo|shoot' then wanted := wanted || array['camera']; end if;
  if n ~ 'travel|trip|journey|departure' then wanted := wanted || array['plane', 'car']; end if;
  if n ~ 'baby|naming|barsa|naamkaran|namkaran|dohale|seemant|simant' then wanted := wanted || array['baby']; end if;
  if n ~ 'mandap' then wanted := wanted || array['tent']; end if;
  if n ~ 'rukhwat|gift|aher' then wanted := wanted || array['gift', 'ribbon']; end if;
  if n ~ 'music|concert|band' then wanted := wanted || array['guitar', 'music']; end if;

  foreach i in array wanted || all_icons loop
    if not exists (
      select 1 from public.functions f
      where f.event_id = p_event and f.icon = i and f.id is distinct from p_self
    ) then
      return i;
    end if;
  end loop;
  return null;
end;
$$;
