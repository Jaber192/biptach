/*
# Revoke EXECUTE on SECURITY DEFINER functions (security hardening)

## Purpose
Ensures that SECURITY DEFINER functions which are invoked internally by the
application logic (via triggers or RLS policy evaluation) are NOT callable via
the REST RPC endpoint (/rest/v1/rpc/) by anon, authenticated, or PUBLIC roles.

## Functions hardened
- `accept_invitation(invite_code text)` — called only via frontend .rpc() by
  authenticated users, but this is already GRANTed to authenticated. This
  migration revokes from anon and PUBLIC only, keeping the authenticated grant.
- `create_company(company_name text)` — same as above.
- `current_company_id()` — internal helper used in RLS policies. No REST access.
- `has_role(text[])` — internal helper used in RLS policies. No REST access.
- `handle_new_user()` — trigger function on auth.users. No REST access.

## Security impact
- After this migration, anon and PUBLIC cannot invoke any of these functions.
- authenticated users can still call create_company() and accept_invitation()
  (needed by the frontend), but not the internal helpers.
- RLS policy evaluation and trigger invocation are unaffected — they run with
  the table owner's privileges and do not require explicit EXECUTE grants.

## Notes
1. REVOKE ... FROM PUBLIC covers any roles not explicitly named.
2. No data is lost — these are permission metadata changes only.
3. Idempotent: REVOKE is safe to re-run.
*/

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM anon, PUBLIC;