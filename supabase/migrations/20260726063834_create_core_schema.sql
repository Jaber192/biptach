/*
# Create core schema: profiles, customers, technicians, work_orders

## Summary
This migration creates the foundational database tables for Biptach, an HVAC
Field Service Management SaaS. It establishes four tables (profiles, customers,
technicians, work_orders) plus the auth trigger that auto-creates a profile when
a new user signs up. All data is shared company-wide among authenticated users
(single-tenant per deployment), so Row Level Security policies grant access to
any authenticated user.

## 1. New Tables

### profiles
Extends `auth.users` with app-specific fields.
- `id` (uuid, primary key, references auth.users) — one row per auth user
- `name` (text, not null) — display name
- `role` (text, not null, default 'technician') — one of admin/manager/technician
- `phone` (text, nullable) — contact phone
- `is_active` (boolean, default true) — whether the user can log in
- `created_at`, `updated_at` (timestamptz)

### customers
Company's customer records (HVAC service customers).
- `id` (uuid, primary key)
- `name` (text, not null)
- `email`, `phone`, `address`, `city`, `state`, `zip` (text, nullable)
- `notes` (text, nullable) — free-form notes
- `created_by` (uuid, nullable, references profiles) — who created the record
- `created_at`, `updated_at` (timestamptz)

### technicians
Technician records for dispatching and scheduling.
- `id` (uuid, primary key)
- `name` (text, not null)
- `phone`, `email` (text, nullable)
- `color` (text, not null) — hex color used in the scheduling board
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

### work_orders
Jobs dispatched to technicians.
- `id` (uuid, primary key)
- `title` (text, not null)
- `description` (text, nullable)
- `job_type` (text, not null, default 'other')
- `priority` (text, not null, default 'medium')
- `status` (text, not null, default 'pending')
- `customer_id` (uuid, nullable, references customers)
- `assigned_to` (uuid, nullable, references technicians)
- `created_by` (uuid, nullable, references profiles)
- `scheduled_date` (timestamptz, nullable)
- `clock_in_time`, `clock_out_time` (timestamptz, nullable)
- `tech_notes` (text, nullable)
- `photos` (text[], default '{}') — storage paths
- `signature_storage_id` (text, nullable) — storage path
- `created_at`, `updated_at` (timestamptz)

## 2. Security (RLS)
- RLS enabled on all four tables.
- All policies scope to `authenticated` users. Data is shared company-wide
  (single-tenant deployment), so CRUD is granted to any authenticated user.
- `profiles`: users can read all profiles; updates restricted to self or admin.

## 3. Auth Integration
- `is_admin()` helper: security-definer function.
- `handle_new_user()` trigger: fires on insert into auth.users, creates a
  matching profiles row. First user becomes admin; rest default to technician.

## Important Notes
1. profiles created first so the auth trigger can reference it.
2. FKs from work_orders use ON DELETE SET NULL to avoid losing work orders.
3. `photos` is a text array of storage paths; frontend resolves to signed URLs.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('admin','manager','technician')),
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;
CREATE POLICY "profiles_update_self_or_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- IS_ADMIN helper + handle_new_user trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_authenticated" ON customers;
CREATE POLICY "customers_select_authenticated" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
CREATE POLICY "customers_insert_authenticated" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;
CREATE POLICY "customers_update_authenticated" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
CREATE POLICY "customers_delete_authenticated" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TECHNICIANS
-- ============================================================
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#0ea5e9',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "technicians_select_authenticated" ON technicians;
CREATE POLICY "technicians_select_authenticated" ON technicians FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "technicians_insert_authenticated" ON technicians;
CREATE POLICY "technicians_insert_authenticated" ON technicians FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "technicians_update_authenticated" ON technicians;
CREATE POLICY "technicians_update_authenticated" ON technicians FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "technicians_delete_authenticated" ON technicians;
CREATE POLICY "technicians_delete_authenticated" ON technicians FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- WORK ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  job_type text NOT NULL DEFAULT 'other' CHECK (job_type IN ('repair','install','maintenance','inspection','emergency','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','completed','cancelled')),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES technicians(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_date timestamptz,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  tech_notes text,
  photos text[] NOT NULL DEFAULT '{}',
  signature_storage_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_orders_select_authenticated" ON work_orders;
CREATE POLICY "work_orders_select_authenticated" ON work_orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
CREATE POLICY "work_orders_insert_authenticated" ON work_orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "work_orders_update_authenticated" ON work_orders;
CREATE POLICY "work_orders_update_authenticated" ON work_orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "work_orders_delete_authenticated" ON work_orders;
CREATE POLICY "work_orders_delete_authenticated" ON work_orders FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date);

-- ============================================================
-- UPDATED_AT trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS customers_set_updated_at ON customers;
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS technicians_set_updated_at ON technicians;
CREATE TRIGGER technicians_set_updated_at BEFORE UPDATE ON technicians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS work_orders_set_updated_at ON work_orders;
CREATE TRIGGER work_orders_set_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
