-- Pangat: the import carries each household's language (owner, 14 Nov):
-- slip_lang from the Excel "Language" column or Add household (blank = both).

create or replace function public.import_households(p_event uuid, p_households jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  added integer;
begin
  -- Every function id must belong to this event.
  if exists (
    select 1
    from jsonb_array_elements(p_households) h,
         jsonb_array_elements_text(h->'function_ids') f(id)
    where not exists (
      select 1 from public.functions fn where fn.id = f.id::uuid and fn.event_id = p_event
    )
  ) then
    raise exception 'function does not belong to event %', p_event;
  end if;

  with rows as (
    select *
    from jsonb_to_recordset(p_households) as r(
      side public.side, name_en text, name_mr text, mobile text,
      token text, short_code text, soft_cap int, location text, notes text, slip_lang text, function_ids uuid[]
    )
  ),
  ins as (
    insert into public.households (event_id, side, name_en, name_mr, mobile, token, short_code, soft_cap, location, notes, slip_lang)
    select p_event, side, name_en, name_mr, mobile, token, short_code, soft_cap, location, notes, coalesce(slip_lang, 'both') from rows
    returning id, token
  )
  insert into public.invites (household_id, function_id)
  select ins.id, unnest(rows.function_ids)
  from ins join rows on rows.token = ins.token;

  select jsonb_array_length(p_households) into added;
  return added;
end $$;

revoke all on function public.import_households(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_households(uuid, jsonb) to service_role;
