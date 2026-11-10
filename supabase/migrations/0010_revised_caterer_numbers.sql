-- Pangat: a revised number for the caterer after the first count.
--
-- The caterer's first count is due on one date (e.g. 15 Dec) but can change
-- until a later one (e.g. 24 Dec). The pilot is judged on the tool's number
-- frozen for the first count ("predicted"); a later revision is frozen and
-- recorded separately ("revised"). The caterer gets the higher of the
-- baseline and the latest frozen tool number.

alter table public.function_numbers
  add column revised        int check (revised between 0 and 100000),
  add column revised_veg    int check (revised_veg >= 0),
  add column revised_nonveg int check (revised_nonveg >= 0),
  add column revised_at     timestamptz,
  add column revised_by     uuid references auth.users(id) on delete set null;

-- Per event: when the caterer needs the first count, and the last day it can change.
alter table public.events
  add column caterer_due_on   date,
  add column caterer_final_on date,
  add constraint events_caterer_dates check (caterer_final_on is null or caterer_due_on is null or caterer_final_on >= caterer_due_on);
