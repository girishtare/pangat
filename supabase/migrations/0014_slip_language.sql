-- Pangat: the language each household's slip is printed in.
--   both  English lines, then Marathi (the default, as before)
--   en    English only
--   mr    Marathi only
-- Set by hosts on the Slips page (server-side, service role); hosts read it
-- through the existing households policies.

alter table public.households
  add column slip_lang text not null default 'both' check (slip_lang in ('both', 'en', 'mr'));
