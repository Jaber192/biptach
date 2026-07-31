-- ============================================================================
-- BIPTACH — HVAC Field-Service Management Platform
-- Complete Database Setup Script (Consolidated)
-- ============================================================================
-- This script creates the full database schema for a fresh Supabase project.
-- It consolidates all migrations into a single, idempotent script that you can
-- run in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- ARCHITECTURE: Company-scoped multi-tenant
--   - Every user belongs to exactly one company.
--   - All business data (customers, technicians, work orders, notifications)
--     is scoped to the user's company via company_id.
--   - Row-Level Security (RLS) enforces company isolation on every table.
--   - Company creation and invitation acceptance happen via Edge Functions
--     (supabase/functions/create-company and accept-invitation) which use
--     the service role key. The RPC functions are NOT callable via REST by
--     authenticated or anon users (EXECUTE revoked).
--
-- ROLES: owner, manager, dispatcher, technician
--
-- HOW TO USE:
--   1. Create a new Supabase project.
--   2. Go to Dashboard → SQL Editor → New query.
--   3. Paste this entire script and click Run.
--   4. Deploy the two Edge Functions (create-company, accept-invitation)
--      from the supabase/functions/ directory.
--   5. Set the environment variables in your frontend (.env):
--        VITE_SUPABASE_URL=<your-project-url>
--        VITE_SUPABASE_ANON_KEY=<your-anon-key>
--
-- This script is idempotent — safe to re-run.
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE (mirrors auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('owner','manager','dispatcher','technician')),
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,  -- FK added after companies table is created
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================
-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile on signup (defaults to 'technician', no company yet)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'technician',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Internal helper: caller's company_id from company_memberships
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid();
$$;

-- Internal helper: check if caller has one of the given roles
CREATE OR REPLACE FUNCTION public.has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = ANY(roles)
  );
$$;

-- create_company: creates a company + owner membership for the caller
-- (Called via Edge Function with service role key — NOT callable via REST)
CREATE OR REPLACE FUNCTION public.create_company(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF company_name IS NULL OR btrim(company_name) = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = uid) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  INSERT INTO public.companies (name, created_by)
  VALUES (btrim(company_name), uid)
  RETURNING id INTO new_company_id;

  INSERT INTO public.company_settings (company_id) VALUES (new_company_id);
  INSERT INTO public.subscriptions (company_id, plan, seats, status) VALUES (new_company_id, 'trial', 5, 'trialing');

  INSERT INTO public.company_memberships (company_id, user_id, role)
  VALUES (new_company_id, uid, 'owner');

  UPDATE public.profiles SET role = 'owner', company_id = new_company_id WHERE id = uid;

  RETURN new_company_id;
END;
$$;

-- accept_invitation: accepts an invite and joins the company
-- (Called via Edge Function with service role key — NOT callable via REST)
CREATE OR REPLACE FUNCTION public.accept_invitation(invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF invite_code IS NULL OR btrim(invite_code) = '' THEN
    RAISE EXCEPTION 'Invitation code is required';
  END IF;

  SELECT * INTO inv FROM public.invitations WHERE invite_code = btrim(accept_invitation.invite_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation code';
  END IF;

  IF inv.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;

  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = uid) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  INSERT INTO public.company_memberships (company_id, user_id, role)
  VALUES (inv.company_id, uid, inv.role);

  UPDATE public.profiles SET role = inv.role, company_id = inv.company_id WHERE id = uid;

  UPDATE public.invitations
    SET accepted_by = uid, accepted_at = now()
    WHERE id = inv.id;

  RETURN inv.company_id;
END;
$$;

-- ============================================================================
-- 3. TRIGGERS ON PROFILES
-- ============================================================================
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. COMPANIES TABLE (root entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now add the profiles.company_id FK (companies table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- ============================================================================
-- 5. COMPANY MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('owner','manager','dispatcher','technician')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON public.company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON public.company_memberships(user_id);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS company_memberships_set_updated_at ON public.company_memberships;
CREATE TRIGGER company_memberships_set_updated_at
BEFORE UPDATE ON public.company_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('manager','dispatcher','technician')),
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON public.invitations(invite_code);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. COMPANY SETTINGS TABLE (1:1 with companies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS company_settings_set_updated_at ON public.company_settings;
CREATE TRIGGER company_settings_set_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. SUBSCRIPTIONS TABLE (1:1 with companies, stubbed — no Stripe yet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','business')),
  seats int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled','trialing')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id() REFERENCES public.companies(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. TECHNICIANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id() REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#0ea5e9',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON public.technicians(company_id);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS technicians_set_updated_at ON public.technicians;
CREATE TRIGGER technicians_set_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. WORK ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id() REFERENCES public.companies(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON public.work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON public.work_orders(scheduled_date);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS work_orders_set_updated_at ON public.work_orders;
CREATE TRIGGER work_orders_set_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 12. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id() REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  recipient_role text NOT NULL DEFAULT 'manager',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. RLS POLICIES — PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "select_self_or_company_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_self_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_owner_company_profiles" ON public.profiles;

CREATE POLICY "select_self_or_company_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR company_id = public.current_company_id()
  );

CREATE POLICY "update_self_profiles" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update_owner_company_profiles" ON public.profiles FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']) AND company_id = public.current_company_id())
  WITH CHECK (public.has_role(ARRAY['owner']) AND company_id = public.current_company_id());

-- ============================================================================
-- 14. RLS POLICIES — COMPANIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_companies" ON public.companies;
DROP POLICY IF EXISTS "update_owner_companies" ON public.companies;

CREATE POLICY "select_member_companies" ON public.companies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = auth.uid() AND company_id = companies.id)
  );

CREATE POLICY "update_owner_companies" ON public.companies FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- ============================================================================
-- 15. RLS POLICIES — COMPANY MEMBERSHIPS
-- ============================================================================
DROP POLICY IF EXISTS "select_member_memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "insert_owner_memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "update_owner_memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "delete_owner_memberships" ON public.company_memberships;

CREATE POLICY "select_member_memberships" ON public.company_memberships FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_owner_memberships" ON public.company_memberships FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

CREATE POLICY "update_owner_memberships" ON public.company_memberships FOR UPDATE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  ) WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

CREATE POLICY "delete_owner_memberships" ON public.company_memberships FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

-- ============================================================================
-- 16. RLS POLICIES — INVITATIONS
-- ============================================================================
DROP POLICY IF EXISTS "select_member_invitations" ON public.invitations;
DROP POLICY IF EXISTS "insert_owner_invitations" ON public.invitations;
DROP POLICY IF EXISTS "update_owner_invitations" ON public.invitations;
DROP POLICY IF EXISTS "delete_owner_invitations" ON public.invitations;

CREATE POLICY "select_member_invitations" ON public.invitations FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_owner_invitations" ON public.invitations FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

CREATE POLICY "update_owner_invitations" ON public.invitations FOR UPDATE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  ) WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

CREATE POLICY "delete_owner_invitations" ON public.invitations FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

-- ============================================================================
-- 17. RLS POLICIES — COMPANY SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "select_member_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "update_owner_company_settings" ON public.company_settings;

CREATE POLICY "select_member_company_settings" ON public.company_settings FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "update_owner_company_settings" ON public.company_settings FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- ============================================================================
-- 18. RLS POLICIES — SUBSCRIPTIONS
-- ============================================================================
DROP POLICY IF EXISTS "select_owner_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "update_owner_subscriptions" ON public.subscriptions;

CREATE POLICY "select_owner_subscriptions" ON public.subscriptions FOR SELECT
  TO authenticated USING (public.has_role(ARRAY['owner']));

CREATE POLICY "update_owner_subscriptions" ON public.subscriptions FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- ============================================================================
-- 19. RLS POLICIES — CUSTOMERS (company-scoped)
-- ============================================================================
DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;
DROP POLICY IF EXISTS "select_company_customers" ON public.customers;
DROP POLICY IF EXISTS "insert_company_customers" ON public.customers;
DROP POLICY IF EXISTS "update_company_customers" ON public.customers;
DROP POLICY IF EXISTS "delete_company_customers" ON public.customers;

CREATE POLICY "select_company_customers" ON public.customers FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_customers" ON public.customers FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_customers" ON public.customers FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================================
-- 20. RLS POLICIES — TECHNICIANS (company-scoped)
-- ============================================================================
DROP POLICY IF EXISTS "select_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "insert_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "update_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "delete_own_technicians" ON public.technicians;
DROP POLICY IF EXISTS "select_company_technicians" ON public.technicians;
DROP POLICY IF EXISTS "insert_company_technicians" ON public.technicians;
DROP POLICY IF EXISTS "update_company_technicians" ON public.technicians;
DROP POLICY IF EXISTS "delete_company_technicians" ON public.technicians;

CREATE POLICY "select_company_technicians" ON public.technicians FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_technicians" ON public.technicians FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_technicians" ON public.technicians FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_technicians" ON public.technicians FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================================
-- 21. RLS POLICIES — WORK ORDERS (company-scoped)
-- ============================================================================
DROP POLICY IF EXISTS "select_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "insert_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "update_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "delete_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "select_company_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "insert_company_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "update_company_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "delete_company_work_orders" ON public.work_orders;

CREATE POLICY "select_company_work_orders" ON public.work_orders FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_work_orders" ON public.work_orders FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_work_orders" ON public.work_orders FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_work_orders" ON public.work_orders FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================================
-- 22. RLS POLICIES — NOTIFICATIONS (company-scoped)
-- ============================================================================
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "select_company_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_company_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_company_notifications" ON public.notifications;
DROP POLICY IF EXISTS "delete_company_notifications" ON public.notifications;

CREATE POLICY "select_company_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "insert_company_notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "update_company_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "delete_company_notifications" ON public.notifications FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- ============================================================================
-- 23. FUNCTION EXECUTE GRANTS (Security Hardening)
-- ============================================================================
-- Internal helpers: NOT callable via REST by any role
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Company RPC functions: NOT callable via REST by any role.
-- These are invoked ONLY by Edge Functions using the service role key,
-- which bypasses EXECUTE grants (service_role has superuser privileges).
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM PUBLIC;

-- Drop the obsolete is_admin() function (replaced by has_role())
DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
-- After running this script:
--   1. The database schema is ready.
--   2. Deploy the Edge Functions:
--        - supabase/functions/create-company/index.ts
--        - supabase/functions/accept-invitation/index.ts
--   3. New users who sign up will get role='technician' and no company.
--   4. Users create a company via the "Create Company" signup flow
--      (calls the create-company Edge Function).
--   5. Users join a company via the "Join Company" signup flow
--      (calls the accept-invitation Edge Function with an invite code).
--   6. Company owners can invite team members from the Settings → Invitations page.
-- ============================================================================
