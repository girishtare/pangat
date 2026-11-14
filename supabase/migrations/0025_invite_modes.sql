-- Pangat: how each household is to be invited, and which of those have gone
-- out (owner, 14 Nov). Replaces the single invite_via drop-down (0021):
--   invite_by_card / invite_by_wa   the modes chosen (at least one)
--   card_sent_at / wa_sent_at       ticked as sent (null = not yet)
-- invite_via and invite_sent_at stay for now but are no longer read.

alter table public.households
  add column invite_by_card boolean not null default true,
  add column invite_by_wa boolean not null default false,
  add column card_sent_at timestamptz,
  add column wa_sent_at timestamptz;

update public.households set
  invite_by_card = invite_via is null or invite_via in ('card', 'both'),
  invite_by_wa = invite_via in ('whatsapp', 'both'),
  card_sent_at = case when invite_via in ('card', 'both') then invite_sent_at end,
  wa_sent_at = case when invite_via in ('whatsapp', 'both') then invite_sent_at end
where invite_via is not null;

alter table public.households
  add constraint households_invite_mode check (invite_by_card or invite_by_wa);

-- The import carries the modes (blank = the defaults: card only).
create or replace function public.import_households(p_event uuid, p_households jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  added integer;
begin
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
      token text, short_code text, soft_cap int, location text, notes text, slip_lang text,
      invite_by_card boolean, invite_by_wa boolean, function_ids uuid[]
    )
  ),
  ins as (
    insert into public.households (event_id, side, name_en, name_mr, mobile, token, short_code, soft_cap, location, notes, slip_lang, invite_by_card, invite_by_wa)
    select p_event, side, name_en, name_mr, mobile, token, short_code, soft_cap, location, notes,
           coalesce(slip_lang, 'both'), coalesce(invite_by_card, true), coalesce(invite_by_wa, false)
    from rows
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
