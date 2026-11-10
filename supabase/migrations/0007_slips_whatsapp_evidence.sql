-- Pangat: slips, WhatsApp messages, and the evidence the 3 January review needs.

-- Who guests can call (printed on slips, used in messages), and the WhatsApp
-- message texts, per event. Null text = the built-in default.
alter table public.events
  add column contact_phone_bride text,
  add column contact_phone_groom text,
  add column wa_invite_text text check (char_length(wa_invite_text) <= 1500),
  add column wa_reminder_text text check (char_length(wa_reminder_text) <= 1500);

-- Each time a host opens a prefilled WhatsApp message for a household.
create table public.nudges (
  id           bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  kind         text not null check (kind in ('invite', 'reminder')),
  sent_by      uuid references auth.users(id) on delete set null,
  sent_at      timestamptz not null default now()
);
create index nudges_household_idx on public.nudges(household_id);

-- Time and phone calls the family spent chasing replies, logged by hosts.
create table public.effort_log (
  id         bigint generated always as identity primary key,
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  logged_on  date not null,
  minutes    int not null default 0 check (minutes between 0 and 1440),
  calls      int not null default 0 check (calls between 0 and 500),
  note       text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index effort_log_event_idx on public.effort_log(event_id);

-- Each time a host opens the dashboard: did the parents look, and when?
create table public.dashboard_views (
  id        bigint generated always as identity primary key,
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index dashboard_views_event_idx on public.dashboard_views(event_id, user_id);

alter table public.nudges          enable row level security;
alter table public.effort_log      enable row level security;
alter table public.dashboard_views enable row level security;

create policy nudges_read_side on public.nudges
  for select to authenticated using (private.can_see_household(household_id));
create policy effort_log_read_host on public.effort_log
  for select to authenticated using (private.is_host(event_id));
create policy dashboard_views_read_host on public.dashboard_views
  for select to authenticated using (private.is_host(event_id));

revoke all on public.nudges, public.effort_log, public.dashboard_views from anon;
revoke insert, update, delete, truncate on public.nudges, public.effort_log, public.dashboard_views from authenticated;
