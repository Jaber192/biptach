/*
# Revoke EXECUTE on company RPC functions (security hardening)

## Purpose
The Supabase security advisor flags that `create_company` and
`accept_invitation` are SECURITY DEFINER functions callable by the
`authenticated` role via /rest/v1/rpc/. These operations have been moved
behind edge functions (supabase/functions/create-company and
supabase/functions/accept-invitation) which use the service role key
internally and validate the caller's JWT. The RPC functions are no longer
called directly by the frontend, so EXECUTE is revoked from all roles.

## Changes
- REVOKE EXECUTE on `create_company(company_name text)` from authenticated,
  anon, and PUBLIC.
- REVOKE EXECUTE on `accept_invitation(invite_code text)` from authenticated,
  anon, and PUBLIC.
- The functions remain SECURITY DEFINER (they are still referenced internally
  by the edge functions via the service role key, which bypasses EXECUTE
  grants). The service role has superuser privileges and is not affected by
  REVOKE.

## Security impact
- After this migration, neither anon nor authenticated users can invoke
  these functions via /rest/v1/rpc/create_company or
  /rest/v1/rpc/accept_invitation.
- The edge functions handle these operations with proper JWT validation and
  service-role database access.
- The RPC function bodies remain as the canonical logic, but they are now
  callable only by the service role (used by the edge functions).

## Notes
1. Idempotent: REVOKE is safe to re-run.
2. No data is modified; no schema/column changes.
*/

REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM PUBLIC;