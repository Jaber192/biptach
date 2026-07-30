/*
# Create company multi-tenant foundation

## Purpose
Rebuilds the authentication/authorization backbone around the Company entity,
replacing the old single-tenant user_id-scoped model. Companies are now the
root entity: every user belongs to exactly one company, and every business
object inherits its company from the authenticated user's membership.

This is Milestone 2 (Authentication & Multi-Tenant Foundation) of the Biptach
HVAC field-service SaaS.

## New Tables
- `companies` — root entity. name, created_by (owner), timestamps.
- `company_memberships` — links profiles to companies with a role
  (owner/manager/dispatcher/technician). One membership per user.
- `invitations` — pending invites to join a company. role pre-assigned,
  unique invite_code, expires after 7 days, single-use.
- `company_settings` — per-company settings (1:1 with companies).
- `subscriptions` — per-company subscription (1:1). Stubbed; no Stripe yet.

## Modified Tables
- `profiles` — role CHECK updated to 4-role set; `company_id` column added
  (nullable until the user creates/joins a company).

## New Functions (defined after tables exist)
- `current_company_id()` — caller's company_id from company_memberships.
- `has_role(roles text[])` — true if caller's role is in the list.
- `create_company(company_name text)` — creates company + owner membership.
- `accept_invitation(invite_code text)` — accepts invite, joins company.
- `handle_new_user()` — updated to default role 'technician'.

## Security (RLS)
- companies: members SELECT; owner UPDATE.
- company_memberships: members SELECT; owner INSERT/UPDATE/DELETE.
- invitations: members SELECT; owner INSERT/UPDATE/DELETE.
- company_settings: members SELECT; owner UPDATE.
- subscriptions: owner SELECT/UPDATE.
- profiles: self-or-company-owner SELECT/UPDATE.

## Notes
1. Clean slate: no existing rows migrated. Old business data truncated next.
2. Internal helpers: EXECUTE revoked from anon/authenticated/PUBLIC.
   create_company + accept_invitation granted to authenticated (frontend .rpc()).
3. Email confirmation stays OFF.
4. Circular FK (companies.created_by -> profiles, profiles.company_id ->
   companies) resolved by creating companies first, then adding the
   profiles.company_id column + FK afterward.
*/

-- ============================================================
-- Update profiles role CHECK to the 4-role set (no column change yet)
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner','manager','dispatcher','technician'));

-- ============================================================
-- companies (created_by FK -> profiles already exists)
-- ============================================================
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

-- ============================================================
-- Now add profiles.company_id (FK -> companies now exists)
-- ============================================================
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

-- ============================================================
-- company_memberships
-- ============================================================
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

-- ============================================================
-- invitations
-- ============================================================
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

-- ============================================================
-- company_settings (1:1 with companies)
-- ============================================================
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

-- ============================================================
-- subscriptions (1:1 with companies, stubbed — no Stripe yet)
-- ============================================================
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

-- ============================================================
-- Helper functions (defined AFTER all tables exist)
-- ============================================================
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

-- ============================================================
-- create_company(company_name)
-- ============================================================
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
  INSERT INTO public.subscriptions (company_id, plan, seats, status) VALUES (new_company_id, 'trial', 5, 'trialing');

  INSERT INTO public.company_memberships (company_id, user_id, role)
  VALUES (new_company_id, uid, 'owner');

  UPDATE public.profiles SET role = 'owner', company_id = new_company_id WHERE id = uid;

  RETURN new_company_id;
END;
$$;

-- ============================================================
-- accept_invitation(invite_code)
-- ============================================================
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

-- ============================================================
-- Update handle_new_user(): default role 'technician' (no company yet)
-- ============================================================
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

-- ============================================================
-- RLS policies (after helpers exist)
-- ============================================================
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

-- ============================================================
-- Function execute grants
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_company(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Drop the now-unused is_admin() function.
DROP FUNCTION IF EXISTS public.is_admin();
