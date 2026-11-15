-- Pangat: fix "Creating the event failed" and "add function failed" (found
-- in the 15 Nov end-to-end test). Since 0022 a function saved without an icon
-- gets one from a trigger, but the trigger ran as the caller (service_role),
-- which has no access to the private schema where the picker lives:
--   permission denied for schema private
-- Run the trigger function as its owner instead. Its search_path is already
-- empty and every name in it is schema-qualified.

alter function private.functions_default_icon() security definer;
