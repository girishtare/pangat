-- Pangat: the print list (owner, 14 Nov). "Print" / "Print Again" on the
-- Guest list puts a household on it; the Slips tab's first tab shows it and
-- prints just those slips. null = not on the list.
-- Set by hosts server-side (service role, side-checked); read through the
-- existing households policies.

alter table public.households
  add column print_requested_at timestamptz;
