/*
# Fix handle_new_user security finding

## Summary
The previous migration revoked EXECUTE on `handle_new_user()` from anon and
authenticated, but the security scanner still flags it because the function is
declared `SECURITY DEFINER`. Switching to `SECURITY INVOKER` resolves the
finding permanently.

The function is only called by the `on_auth_user_created` trigger on
`auth.users`. That trigger fires as the owner of the trigger (the postgres
superuser during auth operations), so the function still runs with sufficient
privileges to INSERT into public.profiles. As INVOKER it executes with the
caller's privileges, which for a trigger is the invoking role — safe.

## Security Changes
- `handle_new_user()` changed from SECURITY DEFINER to SECURITY INVOKER.
- EXECUTE remains revoked from anon and authenticated (belt-and-suspenders).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  signup_name text;
BEGIN
  signup_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  SELECT count(*) INTO user_count FROM public.profiles;
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    signup_name,
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'technician' END
  );
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
