-- Pangat: the pilot record, per function.
--
-- The pilot is judged on three numbers per function (CLAUDE.md):
--   baseline  what the family would have ordered anyway (written down by 12 Nov)
--   predicted the tool's expected headcount, frozen on 14 Dec
--   actual    counted on the day
-- plus the predicted and actual veg / non-veg split. The caterer gets the
-- higher of baseline and predicted. Hosts of the event can read these; only
-- server code writes them, after checking the host may manage the event.

create table public.function_numbers (
  function_id      uuid primary key references public.functions(id) on delete cascade,
  baseline         int check (baseline between 0 and 100000),
  baseline_set_at  timestamptz,
  predicted        int check (predicted between 0 and 100000),
  predicted_veg    int check (predicted_veg >= 0),
  predicted_nonveg int check (predicted_nonveg >= 0),
  predicted_at     timestamptz,
  predicted_by     uuid references auth.users(id) on delete set null,
  actual           int check (actual between 0 and 100000),
  actual_veg       int check (actual_veg >= 0),
  actual_nonveg    int check (actual_nonveg >= 0),
  actual_set_at    timestamptz,
  updated_by       uuid references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now()
);

alter table public.function_numbers enable row level security;

create policy function_numbers_read_host on public.function_numbers
  for select to authenticated
  using (exists (select 1 from public.functions f where f.id = function_id and private.is_host(f.event_id)));

revoke all on public.function_numbers from anon;
revoke insert, update, delete, truncate on public.function_numbers from authenticated;
