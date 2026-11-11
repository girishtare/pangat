-- Pangat: response_history goes with its household and function.
--
-- 0001 made response_history without foreign keys, so deleting an event (or a
-- household or function) left its history rows behind, pointing at nothing.
-- Seen 11 Nov: after every test event and the real event were deleted, 59
-- history rows remained and no household or function they belong to existed.
--
-- 1. Remove those orphan rows (they belong to deleted events only).
-- 2. Add the missing foreign keys, cascading like every other table, so
--    "Delete this event" really deletes everything.
--
-- A household or function can only be deleted while it has no replies (the
-- app refuses otherwise), so in practice this cascade only runs when a whole
-- event is deleted.

delete from public.response_history rh
where not exists (select 1 from public.households h where h.id = rh.household_id)
   or not exists (select 1 from public.functions f where f.id = rh.function_id);

alter table public.response_history
  add constraint response_history_household_id_fkey
    foreign key (household_id) references public.households(id) on delete cascade,
  add constraint response_history_function_id_fkey
    foreign key (function_id) references public.functions(id) on delete cascade;

create index if not exists response_history_function_id_idx on public.response_history(function_id);
