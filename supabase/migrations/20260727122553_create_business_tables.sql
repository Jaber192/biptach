/*
# Create business data tables (multi-user, owner-scoped)

## Purpose
Creates the core business data tables for the Biptach HVAC field-service app:
customers, technicians, work_orders, and notifications. All tables are scoped
to the authenticated user (owner) via user_id with DEFAULT auth.uid().

## New Tables
- customers: name, email, phone, address, city, state, zip, notes — owner-scoped
- technicians: name, phone, email, color, is_active — owner-scoped
- work_orders: title, description, job_type, priority, status, customer_id (FK), assigned_to (FK), created_by (FK profiles), scheduled_date, clock_in/out, tech_notes, photos[], signature_storage_id — owner-scoped
- notifications: type, title, message, work_order_id (FK), recipient_role, read — owner-scoped

## Security (RLS)
All tables: RLS enabled, four policies each (SELECT/INSERT/UPDATE/DELETE) scoped TO authenticated
with auth.uid() = user_id. Owner columns default to auth.uid().

## Notes
1. work_orders.customer_id and assigned_to use ON DELETE SET NULL (preserve history).
2. photos is a text array of Storage URLs.
3. created_by references profiles (ON DELETE SET NULL).
*/

-- ============ customers ============
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
CREATE POLICY "select_own_customers" ON public.customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
CREATE POLICY "insert_own_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
CREATE POLICY "update_own_customers" ON public.customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;
CREATE POLICY "delete_own_customers" ON public.customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ technicians ============
CREATE TABLE IF NOT EXISTS public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#0ea5e9',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_technicians" ON public.technicians;
CREATE POLICY "select_own_technicians" ON public.technicians FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_technicians" ON public.technicians;
CREATE POLICY "insert_own_technicians" ON public.technicians FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_technicians" ON public.technicians;
CREATE POLICY "update_own_technicians" ON public.technicians FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_technicians" ON public.technicians;
CREATE POLICY "delete_own_technicians" ON public.technicians FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS technicians_set_updated_at ON public.technicians;
CREATE TRIGGER technicians_set_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ work_orders ============
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  job_type text NOT NULL DEFAULT 'repair' CHECK (job_type IN ('repair','install','maintenance','inspection','emergency','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','completed','cancelled')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_date timestamptz,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  tech_notes text,
  photos text[] NOT NULL DEFAULT '{}',
  signature_storage_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_user_id ON public.work_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON public.work_orders(scheduled_date);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_work_orders" ON public.work_orders;
CREATE POLICY "select_own_work_orders" ON public.work_orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_work_orders" ON public.work_orders;
CREATE POLICY "insert_own_work_orders" ON public.work_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_work_orders" ON public.work_orders;
CREATE POLICY "update_own_work_orders" ON public.work_orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_work_orders" ON public.work_orders;
CREATE POLICY "delete_own_work_orders" ON public.work_orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS work_orders_set_updated_at ON public.work_orders;
CREATE TRIGGER work_orders_set_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  recipient_role text NOT NULL DEFAULT 'manager',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
CREATE POLICY "insert_own_notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
