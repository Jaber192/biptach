/*
# Fix security issues on helper functions

## Purpose
Resolves four security advisories flagged by Supabase's security advisor:
1. Mutable search_path on `set_updated_at`.
2. Public/anon can execute `handle_new_user()` (SECURITY DEFINER) via REST RPC.
3. Public/anon can execute `is_admin()` (SECURITY DEFINER) via REST RPC.
4. Authenticated can execute `handle_new_user()` and `is_admin()` via REST RPC.

## Changes
- `set_updated_at()`: added `SET search_path = public` so the search path is
  immutable (not role-mutable). Function body already only references `now()`
  and the trigger's NEW record, so no schema-qualified calls were needed.
- `handle_new_user()`: this is a trigger function fired by the database on
  INSERT into auth.users — it should never be callable via REST RPC. Revoked
  EXECUTE from `anon` and `authenticated` (and PUBLIC) so only the database
  superuser / trigger invocation can run it. Kept SECURITY DEFINER because it
  must write to public.profiles as the system user.
- `is_admin()`: this is referenced by RLS policies on profiles (and indirectly
  by other tables). It must stay SECURITY DEFINER so it can read profiles
  regardless of the caller's RLS, but it should never be callable via REST RPC
  by anon or authenticated users. Revoked EXECUTE from `anon`, `authenticated`,
  and PUBLIC. RLS policy evaluation runs with the table owner's privileges and
  does not require explicit EXECUTE grants for the calling role.

## Security impact
- After this migration, `POST /rest/v1/rpc/handle_new_user` and
  `POST /rest/v1/rpc/is_admin` return 403 for anon and authenticated roles.
- The signup trigger (`on_auth_user_created`) still works because trigger
  functions execute with the privileges of their owner (postgres), not the
  calling role, and do not require explicit EXECUTE grants for the invoker.
- RLS policies referencing `is_admin()` still work because policy evaluation
  calls the function internally as the schema owner.

## Notes
1. `REVOKE ... FROM PUBLIC` covers any roles not explicitly named.
2. No data is lost — these are permission/function metadata changes only.
*/

-- 1. Pin search_path on set_updated_at (fixes "mutable search_path" advisory)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Revoke EXECUTE on handle_new_user from anon, authenticated, and PUBLIC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 3. Revoke EXECUTE on is_admin from anon, authenticated, and PUBLIC
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
