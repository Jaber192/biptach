/*
# Re-scope business tables to company_id (multi-tenant)

## Purpose
Migrates customers, technicians, work_orders, and notifications from the old
single-tenant user_id-scoped model to the new company-scoped model. Per the
user's decision, this is a CLEAN SLATE — all existing rows are truncated; no
data is migrated.

## Changes per table
1. Truncate all existing rows (clean slate, in FK-safe order).
2. Add `company_id` column (NOT NULL, DEFAULT current_company_id(), FK -> companies).
3. Drop old user_id-scoped RLS policies.
4. Add company-scoped RLS policies using current_company_id().
5. Add company_id index.

## Security
- Every policy enforces company isolation via current_company_id().
- No cross-company access is possible.
- user_id columns remain for audit but are NOT used in any policy.

## Notes
1. Truncate is intentional and user-approved (clean slate).
2. After this migration the app must call create_company() or
   accept_invitation() before any business data can be inserted.
*/

-- Clean slate: truncate in dependency-safe order (children before parents)
TRUNCATE TABLE work_orders, notifications, customers, technicians;

-- ============================================================
-- customers
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN company_id uuid NOT NULL DEFAULT public.current_company_id()
      REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);

DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;

CREATE POLICY "select_company_customers" ON public.customers FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_customers" ON public.customers FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_customers" ON public.customers FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================
-- technicians
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'technicians' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.technicians
      ADD COLUMN company_id uuid NOT NULL DEFAULT public.current_company_id()
      REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON public.technicians(company_id);

DROP POLICY IF EXISTS "select_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "insert_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "update_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "delete_own_technicians" ON public.technicians;

CREATE POLICY "select_company_technicians" ON public.technicians FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_technicians" ON public.technicians FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_technicians" ON public.technicians FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_technicians" ON public.technicians FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================
-- work_orders
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.work_orders
      ADD COLUMN company_id uuid NOT NULL DEFAULT public.current_company_id()
      REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON public.work_orders(company_id);

DROP POLICY IF EXISTS "select_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "insert_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "update_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "delete_own_work_orders" ON public.work_orders;

CREATE POLICY "select_company_work_orders" ON public.work_orders FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_work_orders" ON public.work_orders FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_work_orders" ON public.work_orders FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_work_orders" ON public.work_orders FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================
-- notifications
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN company_id uuid NOT NULL DEFAULT public.current_company_id()
      REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;

CREATE POLICY "select_company_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_notifications" ON public.notifications FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());