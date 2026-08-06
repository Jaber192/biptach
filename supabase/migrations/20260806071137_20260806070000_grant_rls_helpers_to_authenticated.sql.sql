
-- Grant USAGE on the rls_helpers schema and EXECUTE on its functions to the
-- authenticated role. RLS policy expressions reference these SECURITY DEFINER
-- functions; the calling role must have USAGE on the schema and EXECUTE on the
-- function for policy evaluation to succeed. The previous migration
-- (20260806000200) revoked all access, which broke every company-scoped query
-- for authenticated users — causing profile loads to fail on page reload and
-- forcing users back to the sign-in page.
--
-- anon and PUBLIC remain revoked: the functions live outside the `public`
-- schema so they are not reachable via the Data API, and anon has no reason
-- to call them.

GRANT USAGE ON SCHEMA rls_helpers TO authenticated;
GRANT EXECUTE ON FUNCTION rls_helpers.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION rls_helpers.has_role(text[]) TO authenticated;
