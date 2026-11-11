-- Pangat: a co-owner can cover both sides.
--
-- Until now side null meant "owner". A co-owner may now also have side null:
-- they see and work on both sides (guests, slips, WhatsApp, to-do), but, like
-- every co-owner, can't change event settings or the caterer numbers. Access
-- already reads side null as "both" (private.can_see_side and friends), and
-- what only the owner may do is decided by role, so no policy changes.
--
-- Still at most 3 co-owners per side; a both-sides co-owner counts on each.

alter table public.hosts drop constraint hosts_role_side;
alter table public.hosts add constraint hosts_owner_no_side check (role <> 'owner' or side is null);

create or replace function private.check_co_owner_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  s public.side;
begin
  if new.role = 'co_owner' then
    foreach s in array (case when new.side is null then array['bride', 'groom']::public.side[] else array[new.side] end) loop
      if (
        select count(*) from public.hosts h
        where h.event_id = new.event_id and h.role = 'co_owner' and h.user_id <> new.user_id
          and (h.side is null or h.side = s)
      ) >= 3 then
        raise exception 'at most 3 co-owners per side' using errcode = 'check_violation';
      end if;
    end loop;
  end if;
  return new;
end $$;
