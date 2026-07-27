/*
# Fix security vulnerabilities

## Summary
Addresses all security findings from the Bolt security audit:

1. **Function Search Path Mutable** — `set_updated_at()` had a mutable
   search_path. Fixed by adding `SET search_path = public` to the function
   definition so it always resolves in the public schema.

2. **RLS Policy Always True** — customers, technicians, and work_orders had
   INSERT/UPDATE/DELETE policies with `WITH CHECK (true)` / `USING (true)`,
   effectively granting unrestricted write access to any authenticated user.
   Replaced with role-based predicates:
   - customers: only admin and manager roles can write
   - technicians: only admin role can write
   - work_orders: admin and manager can write; technicians can UPDATE work
     orders assigned to them (for field actions: clock in/out, notes, photos,
     signature, complete)

3. **Public/Authenticated Can Execute SECURITY DEFINER Functions** —
   `handle_new_user()` and `is_admin()` were callable by anon and authenticated
   roles via the REST API. Fixed:
   - `handle_new_user()`: EXECUTE revoked from anon and authenticated (only
     used by the auth trigger, which runs with owner privileges).
   - `is_admin()`: switched from SECURITY DEFINER to SECURITY INVOKER and
     EXECUTE revoked from anon. Authenticated retains EXECUTE because RLS
     policies on profiles call it. As INVOKER, it runs with the caller's
     privileges — the profiles SELECT policy (USING true for authenticated)
     lets any signed-in user read the role column, so no recursion risk.

## Tables Modified
- No structural changes. Only policies and functions are replaced.

## Security Changes
- All write policies now have real ownership/role predicates instead of `true`.
- Internal functions locked down against direct RPC invocation.
*/

-- ============================================================
-- 1. Fix set_updated_at search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Fix is_admin — switch to SECURITY INVOKER, revoke anon
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ============================================================
-- 3. Fix handle_new_user — revoke anon and authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ============================================================
-- 4. Replace customers write policies with role-based checks
-- ============================================================
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
CREATE POLICY "customers_insert_authenticated" ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  );

DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;
CREATE POLICY "customers_update_authenticated" ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  );

DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
CREATE POLICY "customers_delete_authenticated" ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  );

-- ============================================================
-- 5. Replace technicians write policies with role-based checks
-- ============================================================
DROP POLICY IF EXISTS "technicians_insert_authenticated" ON technicians;
CREATE POLICY "technicians_insert_authenticated" ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "technicians_update_authenticated" ON technicians;
CREATE POLICY "technicians_update_authenticated" ON technicians FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "technicians_delete_authenticated" ON technicians;
CREATE POLICY "technicians_delete_authenticated" ON technicians FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 6. Replace work_orders write policies with role-based checks
--    Technicians can UPDATE only work orders assigned to them.
-- ============================================================
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
CREATE POLICY "work_orders_insert_authenticated" ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  );

DROP POLICY IF EXISTS "work_orders_update_authenticated" ON work_orders;
CREATE POLICY "work_orders_update_authenticated" ON work_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
    OR assigned_to = (SELECT t.id FROM technicians t WHERE t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
    OR assigned_to = (SELECT t.id FROM technicians t WHERE t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "work_orders_delete_authenticated" ON work_orders;
CREATE POLICY "work_orders_delete_authenticated" ON work_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
  );
