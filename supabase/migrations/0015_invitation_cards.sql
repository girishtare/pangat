-- Pangat: the invitation card (PDF), in English and Marathi, per event.
-- The owner uploads it on Event settings; guests open it from a link in the
-- WhatsApp message and a button on their reply page, in their household's
-- slip language (households.slip_lang).
--
-- Files live in a private Storage bucket. No storage policies: only server
-- code (service role) reads or writes; guests and hosts get short-lived
-- signed links through Pangat's own routes.

alter table public.events
  add column card_en_path text,
  add column card_mr_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cards', 'cards', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
