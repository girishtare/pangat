-- Pangat: invitation cards per side. The bride's and groom's families each
-- print their own card, so each side has an English and a Marathi PDF; a
-- guest gets their own household's side. Replaces 0015's one pair (unused so
-- far: no event had uploaded a card).

alter table public.events
  drop column card_en_path,
  drop column card_mr_path,
  add column card_bride_en_path text,
  add column card_bride_mr_path text,
  add column card_groom_en_path text,
  add column card_groom_mr_path text;
