-- Explicitly revoke EXECUTE from the anon role on the RLS helper functions.
-- The previous migration only revoked from PUBLIC, but anon had an explicit
-- grant that persisted.

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon;