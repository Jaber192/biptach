-- Move RLS helper functions out of the `public` (REST-exposed) schema into a
-- dedicated `rls_helpers` schema. Supabase's Data API only exposes the
-- `public` schema, so functions in `rls_helpers` are unreachable via
-- /rest/v1/rpc/ — eliminating the "authenticated can execute SECURITY
-- DEFINER function" finding while keeping them usable from RLS policies.

CREATE SCHEMA IF NOT EXISTS rls_helpers;

CREATE OR REPLACE FUNCTION rls_helpers.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION rls_helpers.has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = ANY(roles)
  );
$$;

-- Update column defaults BEFORE dropping old functions.
ALTER TABLE public.customers ALTER COLUMN company_id SET DEFAULT rls_helpers.current_company_id();
ALTER TABLE public.notifications ALTER COLUMN company_id SET DEFAULT rls_helpers.current_company_id();
ALTER TABLE public.technicians ALTER COLUMN company_id SET DEFAULT rls_helpers.current_company_id();
ALTER TABLE public.work_orders ALTER COLUMN company_id SET DEFAULT rls_helpers.current_company_id();

-- Update all RLS policies to reference the new schema.
ALTER POLICY "update_owner_companies" ON public.companies
  USING (rls_helpers.has_role(ARRAY['owner'::text]))
  WITH CHECK (rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "delete_owner_memberships" ON public.company_memberships
  USING ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "insert_owner_memberships" ON public.company_memberships
  WITH CHECK ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "select_member_memberships" ON public.company_memberships
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_owner_memberships" ON public.company_memberships
  USING ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]))
  WITH CHECK ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "select_member_company_settings" ON public.company_settings
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_owner_company_settings" ON public.company_settings
  USING (rls_helpers.has_role(ARRAY['owner'::text]))
  WITH CHECK (rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "delete_company_customers" ON public.customers
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "insert_company_customers" ON public.customers
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "select_company_customers" ON public.customers
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_company_customers" ON public.customers
  USING (company_id = rls_helpers.current_company_id())
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "delete_owner_invitations" ON public.invitations
  USING ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "insert_owner_invitations" ON public.invitations
  WITH CHECK ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "select_member_invitations" ON public.invitations
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_owner_invitations" ON public.invitations
  USING ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]))
  WITH CHECK ((company_id = rls_helpers.current_company_id()) AND rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "delete_company_notifications" ON public.notifications
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "insert_company_notifications" ON public.notifications
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "select_company_notifications" ON public.notifications
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_company_notifications" ON public.notifications
  USING (company_id = rls_helpers.current_company_id())
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "select_self_or_company_profiles" ON public.profiles
  USING ((auth.uid() = id) OR (company_id = rls_helpers.current_company_id()));

ALTER POLICY "update_owner_company_profiles" ON public.profiles
  USING (rls_helpers.has_role(ARRAY['owner'::text]) AND (company_id = rls_helpers.current_company_id()))
  WITH CHECK (rls_helpers.has_role(ARRAY['owner'::text]) AND (company_id = rls_helpers.current_company_id()));

ALTER POLICY "select_owner_subscriptions" ON public.subscriptions
  USING (rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "update_owner_subscriptions" ON public.subscriptions
  USING (rls_helpers.has_role(ARRAY['owner'::text]))
  WITH CHECK (rls_helpers.has_role(ARRAY['owner'::text]));

ALTER POLICY "delete_company_technicians" ON public.technicians
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "insert_company_technicians" ON public.technicians
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "select_company_technicians" ON public.technicians
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_company_technicians" ON public.technicians
  USING (company_id = rls_helpers.current_company_id())
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "delete_company_work_orders" ON public.work_orders
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "insert_company_work_orders" ON public.work_orders
  WITH CHECK (company_id = rls_helpers.current_company_id());

ALTER POLICY "select_company_work_orders" ON public.work_orders
  USING (company_id = rls_helpers.current_company_id());

ALTER POLICY "update_company_work_orders" ON public.work_orders
  USING (company_id = rls_helpers.current_company_id())
  WITH CHECK (company_id = rls_helpers.current_company_id());

-- Now drop the old public-schema functions (no more dependents).
DROP FUNCTION IF EXISTS public.current_company_id();
DROP FUNCTION IF EXISTS public.has_role(text[]);

-- Revoke all access to the rls_helpers schema from anon/authenticated.
REVOKE ALL ON SCHEMA rls_helpers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA rls_helpers FROM PUBLIC, anon, authenticated;