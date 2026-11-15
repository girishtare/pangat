-- Pangat: the invitation card can be an image as well as a PDF (owner, 15 Nov).
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'cards';
