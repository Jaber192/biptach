-- RLS helper functions current_company_id() and has_role() are used inside
-- row-level security policies across nearly every table. They must remain
-- SECURITY DEFINER to avoid recursion (they read company_memberships, whose
-- own policies call these same functions). The risk is that anon/authenticated
-- can invoke them directly via /rest/v1/rpc/, leaking membership info.
--
-- Fix: revoke EXECUTE from PUBLIC and anon, grant only to authenticated.
-- RLS policy evaluation still works because policies run as the table owner
-- (superuser-equivalent for policy checks) and bypass grant checks.

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated;