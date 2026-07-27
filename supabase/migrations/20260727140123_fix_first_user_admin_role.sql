/*
# First user becomes admin on signup

## Purpose
The MASTER_SPEC states the first account created should automatically become
the Admin role. The current handle_new_user() trigger hardcodes 'manager' for
every new profile, so the first user can never reach admin-only pages (e.g.
Settings) and there is no UI to promote users. This migration updates the
trigger function to assign 'admin' when no profiles exist yet, and 'manager'
for all subsequent signups — matching the spec and the existing UI's assumption.

## Changes
- handle_new_user(): role is now 'admin' if the profiles table is empty at
  signup time, otherwise 'manager'. The function remains SECURITY DEFINER with
  a pinned search_path so it can read/write public.profiles regardless of the
  caller's RLS.

## Security impact
- No new tables or columns. No policy changes. The function still only runs via
  the on_auth_user_created trigger (EXECUTE revoked from anon/authenticated/PUBLIC).
- RLS on profiles is unchanged; admins and self can still read/update.

## Notes
1. This only affects NEW signups. Existing profiles keep their current role.
2. Idempotent: CREATE OR REPLACE FUNCTION is safe to re-run.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'admin' ELSE 'manager' END
    INTO assigned_role;
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    assigned_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
