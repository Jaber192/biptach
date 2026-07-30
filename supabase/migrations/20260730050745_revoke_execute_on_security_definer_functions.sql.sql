-- Revoke EXECUTE on SECURITY DEFINER functions that should not be callable via REST RPC.
-- These functions are invoked internally by the application logic, not via /rest/v1/rpc.

REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM PUBLIC;
