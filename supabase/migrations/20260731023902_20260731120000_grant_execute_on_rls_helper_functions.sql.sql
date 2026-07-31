-- Re-grant EXECUTE on read-only helper functions used in RLS policies.
-- These are SECURITY DEFINER functions that only SELECT data the caller already
-- has access to. They MUST be callable by authenticated users because RLS
-- policies on every business table reference them. Without EXECUTE, every
-- query on those tables fails with "permission denied for function".
--
-- The write functions (create_company, accept_invitation) remain revoked from
-- authenticated/anon/PUBLIC — they are invoked only by Edge Functions using
-- the service role key, which bypasses EXECUTE grants.

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated;

-- Re-affirm: write functions stay revoked from authenticated/anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.create_company(text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, PUBLIC;
