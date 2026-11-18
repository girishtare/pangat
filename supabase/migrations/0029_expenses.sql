-- Pangat: expenses (owner, 18 Nov). Every cost of the event, split between
-- the bride's and the groom's side, the payments made against it, and
-- settlements between the two sides. The event's owner only.
--
-- Additive only: three new tables, their read policies, a private Storage
-- bucket for bills, and one function for saving an expense with its payments
-- in one go. Nothing existing is altered.
--
-- Money is whole paise in bigint. As elsewhere, hosts only READ through
-- row-level security (here: the owner only); every write goes through server
-- code with the service-role key after a permission check.

create table public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 120),
  vendor             text check (vendor is null or char_length(vendor) <= 120),
  vendor_phone       text check (vendor_phone is null or vendor_phone ~ '^\+[1-9][0-9]{7,14}$'),
  function_id        uuid references public.functions(id) on delete set null,
  category           text not null check (category in (
                       'catering', 'venue', 'decor', 'clothes', 'jewellery', 'gifts',
                       'music', 'photography', 'printing', 'travel_stay', 'rituals', 'other')),
  amount_paise       bigint not null check (amount_paise > 0 and amount_paise <= 100000000000),
  split              text not null check (split in ('bride', 'groom', 'shared_pct', 'shared_amount')),
  bride_share_paise  bigint not null check (bride_share_paise >= 0),
  groom_share_paise  bigint not null check (groom_share_paise >= 0),
  bride_pct_bp       int check (bride_pct_bp is null or bride_pct_bp between 0 and 10000),
  due_date           date,
  bill_path          text,
  notes              text check (notes is null or char_length(notes) <= 1000),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint expenses_shares_add_up check (bride_share_paise + groom_share_paise = amount_paise),
  constraint expenses_split_shape check (
    (split = 'bride' and groom_share_paise = 0 and bride_pct_bp is null)
    or (split = 'groom' and bride_share_paise = 0 and bride_pct_bp is null)
    or (split = 'shared_pct' and bride_pct_bp is not null)
    or (split = 'shared_amount' and bride_pct_bp is null))
);
create index expenses_event_idx on public.expenses(event_id, due_date);
create index expenses_function_idx on public.expenses(function_id);

create table public.expense_payments (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references public.expenses(id) on delete cascade,
  event_id      uuid not null references public.events(id) on delete cascade,
  paid_on       date not null,
  amount_paise  bigint not null check (amount_paise > 0),
  paid_by       text not null check (paid_by in ('bride', 'groom')),
  method        text not null check (method in ('upi', 'cash', 'bank', 'cheque', 'card')),
  note          text check (note is null or char_length(note) <= 200),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index expense_payments_expense_idx on public.expense_payments(expense_id);
create index expense_payments_event_idx on public.expense_payments(event_id);

-- Money one side hands the other to square up (the page for these comes next).
create table public.expense_settlements (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  from_side     text not null check (from_side in ('bride', 'groom')),
  to_side       text not null check (to_side in ('bride', 'groom')),
  amount_paise  bigint not null check (amount_paise > 0),
  paid_on       date not null,
  method        text not null check (method in ('upi', 'cash', 'bank', 'cheque', 'card')),
  note          text check (note is null or char_length(note) <= 200),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint expense_settlements_two_sides check (from_side <> to_side)
);
create index expense_settlements_event_idx on public.expense_settlements(event_id);

alter table public.expenses enable row level security;
alter table public.expense_payments enable row level security;
alter table public.expense_settlements enable row level security;

-- Read: the event's owner only (private.is_owner, migration 0017).
create policy expenses_read_owner on public.expenses
  for select to authenticated using (private.is_owner(event_id));
create policy expense_payments_read_owner on public.expense_payments
  for select to authenticated using (private.is_owner(event_id));
create policy expense_settlements_read_owner on public.expense_settlements
  for select to authenticated using (private.is_owner(event_id));

revoke all on public.expenses, public.expense_payments, public.expense_settlements from anon;
revoke insert, update, delete, truncate on public.expenses, public.expense_payments, public.expense_settlements from authenticated;

-- Saves one expense and its payments together: inserts or updates the
-- expense, keeps the payments listed in p_keep, deletes its other payments,
-- adds p_new, and refuses if the payments come to more than the amount.
-- Service role only; the server action has checked the owner first.
create function public.save_expense(
  p_event uuid,
  p_id uuid,
  p_user uuid,
  p jsonb,
  p_keep uuid[],
  p_new jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_fn uuid := nullif(p->>'function_id', '')::uuid;
  v_amount bigint;
  v_paid bigint;
begin
  if v_fn is not null and not exists (select 1 from public.functions f where f.id = v_fn and f.event_id = p_event) then
    raise exception 'function % is not part of event %', v_fn, p_event;
  end if;

  if p_id is null then
    insert into public.expenses (
      event_id, title, vendor, vendor_phone, function_id, category, amount_paise, split,
      bride_share_paise, groom_share_paise, bride_pct_bp, due_date, notes, created_by
    ) values (
      p_event, p->>'title', p->>'vendor', p->>'vendor_phone', v_fn, p->>'category', (p->>'amount_paise')::bigint, p->>'split',
      (p->>'bride_share_paise')::bigint, (p->>'groom_share_paise')::bigint, (p->>'bride_pct_bp')::int,
      (p->>'due_date')::date, p->>'notes', p_user
    ) returning id into v_id;
  else
    update public.expenses set
      title = p->>'title',
      vendor = p->>'vendor',
      vendor_phone = p->>'vendor_phone',
      function_id = v_fn,
      category = p->>'category',
      amount_paise = (p->>'amount_paise')::bigint,
      split = p->>'split',
      bride_share_paise = (p->>'bride_share_paise')::bigint,
      groom_share_paise = (p->>'groom_share_paise')::bigint,
      bride_pct_bp = (p->>'bride_pct_bp')::int,
      due_date = (p->>'due_date')::date,
      notes = p->>'notes',
      updated_at = now()
    where id = p_id and event_id = p_event
    returning id into v_id;
    if v_id is null then
      raise exception 'expense % not found in event %', p_id, p_event;
    end if;
    delete from public.expense_payments
    where expense_id = v_id and not (id = any (coalesce(p_keep, '{}'::uuid[])));
  end if;

  insert into public.expense_payments (expense_id, event_id, paid_on, amount_paise, paid_by, method, note, created_by)
  select v_id, p_event, (x->>'paid_on')::date, (x->>'amount_paise')::bigint, x->>'paid_by', x->>'method', nullif(x->>'note', ''), p_user
  from jsonb_array_elements(coalesce(p_new, '[]'::jsonb)) as x;

  select amount_paise into v_amount from public.expenses where id = v_id;
  select coalesce(sum(amount_paise), 0) into v_paid from public.expense_payments where expense_id = v_id;
  if v_paid > v_amount then
    raise exception 'payments_exceed_amount' using detail = format('paid %s, amount %s', v_paid, v_amount);
  end if;

  return v_id;
end;
$$;
revoke all on function public.save_expense(uuid, uuid, uuid, jsonb, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.save_expense(uuid, uuid, uuid, jsonb, uuid[], jsonb) to service_role;

-- Bills and receipts: a private bucket; only server code reads or writes, and
-- the owner gets short-lived signed links (as for invitation cards).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bills', 'bills', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
