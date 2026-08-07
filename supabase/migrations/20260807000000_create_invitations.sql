-- Invitations table + RLS policies (idempotent — safe to re-run in the Supabase SQL Editor)
-- NOTE: The 6-digit invite_code and 7-day expiry are set by the send-invitation edge function,
-- so this table only needs the columns to exist and invite_code to be UNIQUE.

-- 1) Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'dispatcher', 'technician')),
  invite_code text UNIQUE NOT NULL,
  accepted_by uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON public.invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 2) RLS policies
-- SELECT: any member of the company can view its invitations (used by the Settings page list).
-- INSERT/DELETE: company owners only (the edge function uses the service role and bypasses RLS,
--   but keeping owner policies here protects the direct REST path too).
DROP POLICY IF EXISTS "select_member_invitations" ON public.invitations;
CREATE POLICY "select_member_invitations" ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.invitations.company_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_owner_invitations" ON public.invitations;
CREATE POLICY "insert_owner_invitations" ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.invitations.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "delete_owner_invitations" ON public.invitations;
CREATE POLICY "delete_owner_invitations" ON public.invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.invitations.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );
