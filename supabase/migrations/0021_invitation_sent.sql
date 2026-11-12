-- Pangat: whether each household's invitation has gone out, and how
-- (owner, 12 Nov: "have checkbox for those whom invitations are sent ...
-- also add how the invitation was sent - physical card or whatsapp").
--   invite_via      null = not sent yet; card | whatsapp | both
--   invite_sent_at  when it was marked sent (cleared when unmarked)
-- Ticked by hosts on the Guest list (server-side, service role, side-checked);
-- hosts read it through the existing households policies.

alter table public.households
  add column invite_via text check (invite_via in ('card', 'whatsapp', 'both')),
  add column invite_sent_at timestamptz;
