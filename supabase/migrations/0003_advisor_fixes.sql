-- Fixes from the Supabase advisors after the first live run (10 Nov 2026).

-- Security: pin the search path of the history trigger function.
alter function public.log_response() set search_path = '';
create or replace function public.log_response() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.response_history
    (household_id, function_id, status, heads, veg, nonveg, arrival_slot, source, updated_by)
  values
    (new.household_id, new.function_id, new.status, new.heads, new.veg, new.nonveg,
     new.arrival_slot, new.source, new.updated_by);
  return new;
end $$;

-- Performance: cover the function_id foreign keys.
create index if not exists invites_function_id_idx on public.invites(function_id);
create index if not exists responses_function_id_idx on public.responses(function_id);
