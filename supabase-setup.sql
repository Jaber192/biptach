-- ============================================================================
-- BIPTACH — Complete database setup (consolidated from all migrations)
-- Run this in your Supabase SQL Editor on a fresh project.
-- Idempotent: safe to re-run. Creates the full multi-tenant schema from scratch.
-- ============================================================================

-- ============================================================================
-- 1. Helper functions (needed as DEFAULTs / by policies)
-- ============================================================================
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

-- current_company_id() and has_role() are defined after company_memberships
-- exists (they query it). They are referenced by DEFAULT clauses on business
-- tables, but Postgres evaluates DEFAULT expressions at INSERT time, so the
-- function only needs to exist before rows are inserted, not at CREATE TABLE.
-- We define them as soon as their dependency (company_memberships) exists below.

-- ============================================================================
-- 2. profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'technician'
    CHECK (role IN ('owner','manager','dispatcher','technician')),
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,  -- FK added after companies table exists
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner','manager','dispatcher','technician'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. companies (root entity)
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

-- Now add profiles.company_id FK -> companies
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
-- 4. company_memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'technician'
    CHECK (role IN ('owner','manager','dispatcher','technician')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON public.company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON public.company_memberships(user_id);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. invitations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'technician'
    CHECK (role IN ('manager','dispatcher','technician')),
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
-- 6. company_settings (1:1 with companies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. subscriptions (1:1 with companies, stubbed — no Stripe yet)
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

-- ============================================================================
-- 8. Company-scoped helper functions (now that company_memberships exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid();
$$;

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

-- ============================================================================
-- 9. Business tables (company-scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id()
    REFERENCES public.companies(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id()
    REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#0ea5e9',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON public.technicians(company_id);
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id()
    REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  job_type text NOT NULL DEFAULT 'repair'
    CHECK (job_type IN ('repair','install','maintenance','inspection','emergency','other')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scheduled','in_progress','completed','cancelled')),
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

CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON public.work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON public.work_orders(scheduled_date);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL DEFAULT public.current_company_id()
    REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  recipient_role text NOT NULL DEFAULT 'manager',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RPC functions (create_company, accept_invitation, handle_new_user)
-- ============================================================================
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

  IF EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = uid) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  INSERT INTO public.companies (name, created_by)
  VALUES (company_name, uid)
  RETURNING id INTO new_company_id;

  INSERT INTO public.company_settings (company_id) VALUES (new_company_id);
  INSERT INTO public.subscriptions (company_id, plan, seats, status)
    VALUES (new_company_id, 'trial', 5, 'trialing');

  INSERT INTO public.company_memberships (company_id, user_id, role)
  VALUES (new_company_id, uid, 'owner');

  UPDATE public.profiles SET role = 'owner', company_id = new_company_id WHERE id = uid;

  RETURN new_company_id;
END;
$$;

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

  SELECT * INTO inv FROM public.invitations WHERE invite_code = accept_invitation.invite_code;

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

-- ============================================================================
-- 11. Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS company_memberships_set_updated_at ON public.company_memberships;
CREATE TRIGGER company_memberships_set_updated_at
BEFORE UPDATE ON public.company_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS company_settings_set_updated_at ON public.company_settings;
CREATE TRIGGER company_settings_set_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS technicians_set_updated_at ON public.technicians;
CREATE TRIGGER technicians_set_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS work_orders_set_updated_at ON public.work_orders;
CREATE TRIGGER work_orders_set_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 12. RLS policies
-- ============================================================================

-- companies
DROP POLICY IF EXISTS "select_member_companies" ON public.companies;
CREATE POLICY "select_member_companies" ON public.companies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = auth.uid() AND company_id = companies.id)
  );

DROP POLICY IF EXISTS "update_owner_companies" ON public.companies;
CREATE POLICY "update_owner_companies" ON public.companies FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- company_memberships
DROP POLICY IF EXISTS "select_member_memberships" ON public.company_memberships;
CREATE POLICY "select_member_memberships" ON public.company_memberships FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "insert_owner_memberships" ON public.company_memberships;
CREATE POLICY "insert_owner_memberships" ON public.company_memberships FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

DROP POLICY IF EXISTS "update_owner_memberships" ON public.company_memberships;
CREATE POLICY "update_owner_memberships" ON public.company_memberships FOR UPDATE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  ) WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

DROP POLICY IF EXISTS "delete_owner_memberships" ON public.company_memberships;
CREATE POLICY "delete_owner_memberships" ON public.company_memberships FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

-- invitations
DROP POLICY IF EXISTS "select_member_invitations" ON public.invitations;
CREATE POLICY "select_member_invitations" ON public.invitations FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "insert_owner_invitations" ON public.invitations;
CREATE POLICY "insert_owner_invitations" ON public.invitations FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

DROP POLICY IF EXISTS "update_owner_invitations" ON public.invitations;
CREATE POLICY "update_owner_invitations" ON public.invitations FOR UPDATE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  ) WITH CHECK (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

DROP POLICY IF EXISTS "delete_owner_invitations" ON public.invitations;
CREATE POLICY "delete_owner_invitations" ON public.invitations FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id() AND public.has_role(ARRAY['owner'])
  );

-- company_settings
DROP POLICY IF EXISTS "select_member_company_settings" ON public.company_settings;
CREATE POLICY "select_member_company_settings" ON public.company_settings FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "update_owner_company_settings" ON public.company_settings;
CREATE POLICY "update_owner_company_settings" ON public.company_settings FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- subscriptions
DROP POLICY IF EXISTS "select_owner_subscriptions" ON public.subscriptions;
CREATE POLICY "select_owner_subscriptions" ON public.subscriptions FOR SELECT
  TO authenticated USING (public.has_role(ARRAY['owner']));

DROP POLICY IF EXISTS "update_owner_subscriptions" ON public.subscriptions;
CREATE POLICY "update_owner_subscriptions" ON public.subscriptions FOR UPDATE
  TO authenticated USING (public.has_role(ARRAY['owner']))
  WITH CHECK (public.has_role(ARRAY['owner']));

-- profiles: self OR company owner
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;

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

-- customers (company-scoped)
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

-- technicians (company-scoped)
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

-- work_orders (company-scoped)
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

-- notifications (company-scoped)
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

-- ============================================================================
-- 13. Function execute grants
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_company(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Drop legacy helper no longer used
DROP FUNCTION IF EXISTS public.is_admin();
