# Pangat

Know who is really coming. Guests reply through a personal link or QR code; the host sees a headcount per function.

Stage 1 of the v1 spec, built 10 November 2026. Project context for Claude Code is in `CLAUDE.md`.

## Run it

```
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local`, the app runs in **demo mode**: a sample wedding with eight households, held in memory and reset on restart. The home page links to each guest page and to the host dashboard.

Other commands: `npm test`, `npm run typecheck`, `npm run build` (Next.js build plus the Cloudflare Workers bundle in `.open-next`), `npm run build:next` (Next.js only).

## What is built

- Guest flow at `/r/<token>`: "is this you?", reply per function (coming, headcount, vegetarian count, arrival), summary, change until the cut-off. Marathi and English.
- Host dashboard at `/host` (demo mode only): replies and expected headcount per function.
- Forecast, validation and token logic in `src/lib`, with tests in `tests`.
- Database schema in `supabase/migrations/0001_init.sql`.
- Supabase data layer in `src/lib/store/supabase.ts`.

## Not built yet

- Host sign-in and per-side access (the dashboard is switched off outside demo mode until this exists).
- Guest list import, late additions, mark on behalf.
- Printable slips with QR codes and short codes.
- "Not us" mobile-number lookup and approval queue.
- WhatsApp nudge links.

## Not yet verified

- `npm run build` and the pages in a browser. They type-check, but have not been run.
- The Supabase data layer against a live project.
- The Marathi wording in `src/lib/i18n.ts`. Have a native reader check it before guests see it.

## Connecting Supabase

1. Create a project and run `supabase/migrations/0001_init.sql`.
2. Set these environment variables on the host (Cloudflare: Worker → Settings → Variables and Secrets):
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only; store it as a secret.
   - `PANGAT_EVENT_SLUG`: slug of the event the host dashboard shows (defaults to `demo-wedding`).

   Leave both Supabase variables unset to run in demo mode. There is deliberately no `.env.example`: Cloudflare's import form turns every variable in it into a required field, which blocks a demo-mode deploy.
3. The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or commit it.

QR codes on printed slips should point at `/r/<token>?s=q` so replies record which channel was used.
