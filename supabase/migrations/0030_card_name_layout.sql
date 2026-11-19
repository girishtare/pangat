-- Pangat: the guest's name and place written on their invitation card
-- (owner, 19 Nov). Where on page 1 they go, per card ("bride-en", "groom-mr" …),
-- as fractions of the page: { x, w, y1, gap, size }. Null or a missing key =
-- the plain card. Additive only.

alter table public.events add column card_name_layout jsonb;

comment on column public.events.card_name_layout is
  'Where the household''s name (line 1) and location (line 2) go on page 1 of each invitation card, keyed side-lang; fractions of the page.';
