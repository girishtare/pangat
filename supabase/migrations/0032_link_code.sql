-- Short links (owner, 19 Nov): each household gets a second, shorter key for the
-- links in WhatsApp messages, /i/<link_code> (reply) and /i/<link_code>/<mr|en>
-- (card). Ten letters and digits (about 59 bits): far too many to guess. The
-- 22-character token stays, so printed QR codes and links already sent keep working.
-- Additive: a new column, filled for every household, with a default for new ones.

alter table public.households
  add column link_code text not null
  default substr(translate(encode(extensions.gen_random_bytes(15), 'base64'), '+/=', ''), 1, 10);

alter table public.households
  add constraint households_link_code_format check (link_code ~ '^[A-Za-z0-9]{10}$');

create unique index households_link_code_key on public.households (link_code);
