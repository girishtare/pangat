-- Test data: the same sample wedding as demo mode, in a real database.
-- For testing the guest flow and host access against Supabase before the
-- dry run. Not for production. Safe to re-run: it replaces the event.
--
-- Guest pages: /r/demo-family-1 .. /r/demo-family-8 (4 bride side, 4 groom side).

delete from public.events where slug = 'demo-wedding';

with ev as (
  insert into public.events (slug, name_en, name_mr, cutoff_at)
  values ('demo-wedding', 'Sample Wedding', 'नमुना विवाह सोहळा', '2026-12-13 23:59+05:30')
  returning id
),
fns as (
  insert into public.functions (event_id, name_en, name_mr, starts_at, venue, sort_order)
  select ev.id, f.name_en, f.name_mr, f.starts_at::timestamptz, f.venue, f.sort_order
  from ev, (values
    ('Haldi', 'हळद', '2026-12-27 10:00+05:30', 'Family home', 1),
    ('Wedding', 'विवाह', '2026-12-28 11:30+05:30', 'Sample Hall', 2),
    ('Reception', 'स्वागत समारंभ', '2026-12-28 19:00+05:30', 'Sample Hall', 3)
  ) as f(name_en, name_mr, starts_at, venue, sort_order)
  returning id, name_en
),
hh as (
  insert into public.households (event_id, side, name_en, name_mr, token, short_code, soft_cap)
  select ev.id, h.side::public.side, h.name_en, h.name_mr, h.token, h.short_code, 6
  from ev, (values
    ('bride', 'Shri. A. Joshi & family',   'श्री. अ. जोशी सहपरिवार',   'demo-family-1', 'DEMAA2'),
    ('bride', 'Shri. B. Kulkarni & family','श्री. ब. कुलकर्णी सहपरिवार','demo-family-2', 'DEMBB3'),
    ('bride', 'Smt. C. Deshpande',          'श्रीमती क. देशपांडे',        'demo-family-3', 'DEMCC4'),
    ('bride', 'Shri. D. Patil & family',    'श्री. ड. पाटील सहपरिवार',   'demo-family-4', 'DEMDD5'),
    ('groom', 'Shri. E. Kale & family',     'श्री. इ. काळे सहपरिवार',    'demo-family-5', 'DEMEE6'),
    ('groom', 'Shri. F. Gokhale & family',  'श्री. फ. गोखले सहपरिवार',   'demo-family-6', 'DEMFF7'),
    ('groom', 'Dr. G. Sathe',               'डॉ. ग. साठे',               'demo-family-7', 'DEMGG8'),
    ('groom', 'Shri. H. More & family',     'श्री. ह. मोरे सहपरिवार',    'demo-family-8', 'DEMHH9')
  ) as h(side, name_en, name_mr, token, short_code)
  returning id, token
)
insert into public.invites (household_id, function_id)
select hh.id, fns.id
from hh, fns
where fns.name_en <> 'Haldi'
   or hh.token in ('demo-family-1', 'demo-family-4', 'demo-family-8');
