-- Pangat: functions that serve vegetarian food only.
--
-- Food for a function is now one of three (Event settings):
--   no food           catered = false
--   veg only          catered = true,  veg_only = true   (no veg question; everyone counts as veg)
--   veg and non-veg   catered = true,  veg_only = false  (asks how many are vegetarian)

alter table public.functions add column veg_only boolean not null default false;
