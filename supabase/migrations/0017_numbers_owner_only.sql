-- Pangat: the caterer numbers (family's guess, frozen counts, actuals) are the
-- owner's. The page already hides them from co-owners, but the read policy let
-- any host of the event fetch them with their own session. Owner only now.
-- (Server code reads them with the service role, so nothing else changes.)

create function private.is_owner(p_event uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hosts h
    where h.user_id = (select auth.uid()) and h.event_id = p_event and h.role = 'owner'
  );
$$;
revoke all on function private.is_owner(uuid) from public, anon;
grant execute on function private.is_owner(uuid) to authenticated;

drop policy function_numbers_read_host on public.function_numbers;
create policy function_numbers_read_owner on public.function_numbers
  for select to authenticated
  using (exists (select 1 from public.functions f where f.id = function_id and private.is_owner(f.event_id)));
