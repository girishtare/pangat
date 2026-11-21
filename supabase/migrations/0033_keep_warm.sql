-- Keep the site warm (owner, 21 Nov): every 5 minutes the database asks for the
-- guest reply page, the short WhatsApp link and the sign-in page, so a guest's
-- first tap doesn't wait 8-10 s for a cold start. The codes are made up: the
-- lookups find nothing (404 / redirect), but each one reaches the database
-- through the API, which also keeps the free project from pausing.
-- Stop it with: select cron.unschedule('pangat-keep-warm');
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'pangat-keep-warm',
  '*/5 * * * *',
  $$
    select net.http_get('https://pangat-tau.vercel.app/r/keepwarm00', timeout_milliseconds := 30000);
    select net.http_get('https://pangat-tau.vercel.app/i/keepwarm00', timeout_milliseconds := 30000);
    select net.http_get('https://pangat-tau.vercel.app/host/login', timeout_milliseconds := 30000);
  $$
);
