-- Pangat v1 schema.
-- Guests never talk to the database directly: the Next.js server uses the
-- service-role key and looks households up by token. RLS is on with no
-- anonymous policies, so the public key can read nothing.
-- Host policies (one side each) arrive with host sign-in in stage 2.

create extension if not exists pgcrypto;

create table events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name_en       text not null,
  name_mr       text,
  cutoff_at     timestamptz not null,
  yes_show_rate     numeric not null default 0.90 check (yes_show_rate between 0 and 1),
  pending_show_rate numeric not null default 0.40 check (pending_show_rate between 0 and 1),
  created_at    timestamptz not null default now()
);

create table functions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  name_en    text not null,
  name_mr    text,
  starts_at  timestamptz not null,
  venue      text,
  map_url    text,
  catered    boolean not null default true,
  sort_order int not null default 0
);
create index on functions(event_id);

create type side as enum ('bride', 'groom');

create table hosts (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references events(id) on delete cascade,
  user_id   uuid not null,
  side      side,            -- null = both sides
  unique (event_id, user_id)
);

create table households (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  side         side not null,
  name_en      text not null,
  name_mr      text,
  mobile       text,
  token        text not null unique,
  short_code   text not null,
  soft_cap     int,
  card_sent_on date,
  created_at   timestamptz not null default now(),
  unique (event_id, short_code)
);
create index on households(event_id);
create index on households(event_id, mobile);

create table invites (
  household_id uuid not null references households(id) on delete cascade,
  function_id  uuid not null references functions(id) on delete cascade,
  primary key (household_id, function_id)
);

create type response_status as enum ('yes', 'no');
create type response_source as enum ('qr', 'link', 'code', 'on_behalf');

create table responses (
  household_id uuid not null references households(id) on delete cascade,
  function_id  uuid not null references functions(id) on delete cascade,
  status       response_status not null,
  heads        int not null default 0 check (heads between 0 and 30),
  veg          int not null default 0 check (veg >= 0),
  nonveg       int not null default 0 check (nonveg >= 0),
  arrival_slot text,
  source       response_source not null,
  updated_by   uuid,          -- host user for on_behalf entries
  updated_at   timestamptz not null default now(),
  primary key (household_id, function_id),
  check (veg + nonveg <= heads),
  check (status = 'yes' or heads = 0)
);

-- Every change is kept, so the review can show how answers moved.
create table response_history (
  id           bigint generated always as identity primary key,
  household_id uuid not null,
  function_id  uuid not null,
  status       response_status not null,
  heads        int not null,
  veg          int not null,
  nonveg       int not null,
  arrival_slot text,
  source       response_source not null,
  updated_by   uuid,
  recorded_at  timestamptz not null default now()
);
create index on response_history(household_id, function_id);

create function log_response() returns trigger language plpgsql as $$
begin
  insert into response_history
    (household_id, function_id, status, heads, veg, nonveg, arrival_slot, source, updated_by)
  values
    (new.household_id, new.function_id, new.status, new.heads, new.veg, new.nonveg,
     new.arrival_slot, new.source, new.updated_by);
  return new;
end $$;

create trigger responses_history
  after insert or update on responses
  for each row execute function log_response();

alter table events           enable row level security;
alter table functions        enable row level security;
alter table hosts            enable row level security;
alter table households       enable row level security;
alter table invites          enable row level security;
alter table responses        enable row level security;
alter table response_history enable row level security;
