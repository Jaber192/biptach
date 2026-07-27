/*
# Allow admins to update team member profiles

## Purpose
The Settings page's Team Management tab lets an admin change a team member's
role (admin/manager/technician) and activate/deactivate them. The existing
profiles UPDATE policy only allows self-updates (`auth.uid() = id`), so admin
edits to other profiles are rejected by RLS. This migration adds a separate
admin-scoped UPDATE policy so admins can manage their team while non-admins
remain restricted to their own profile.

## Changes
- New policy `update_admin_profiles`: allows UPDATE on any profile when the
  caller is an admin (verified via the existing is_admin() helper). Combined
  with the existing self-update policy, the effective rule is: you can update
  your own profile OR (if you are an admin) any profile.
- No changes to SELECT, INSERT, or DELETE policies.
- No schema/column changes.

## Security impact
- Only users whose profile role is 'admin' can update other profiles. The
  is_admin() function is SECURITY DEFINER and reads profiles as the table
  owner, so it works correctly under RLS evaluation.
- Non-admins are unaffected — they can still only update their own profile.

## Notes
1. Idempotent: DROP POLICY IF EXISTS before CREATE.
2. No data is modified.
*/

DROP POLICY IF EXISTS "update_admin_profiles" ON public.profiles;
CREATE POLICY "update_admin_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
