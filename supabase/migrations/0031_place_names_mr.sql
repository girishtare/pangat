-- Pangat: places in Marathi for the invitation card's envelope (owner, 19 Nov:
-- "the location of marathi patrika is coming in english"). One Marathi
-- spelling per place the event's households stay at, keyed by the place as
-- typed: { "Borivali, Mumbai": "बोरिवली, मुंबई" }. A place without one prints
-- as typed. Additive only.

alter table public.events add column place_names_mr jsonb;

comment on column public.events.place_names_mr is
  'Marathi spelling of each household location (as typed), for the Marathi invitation card''s envelope line.';
