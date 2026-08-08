-- Ownership transfers table + RLS policies (idempotent — safe to re-run in the Supabase SQL Editor)
-- NOTE: The 6-digit verification code and 10-minute expiry are set by the transfer-ownership
-- edge function, so this table only needs the columns to exist.

-- 1) Ownership transfers table
CREATE TABLE IF NOT EXISTS public.ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ownership_transfers_company_id ON public.ownership_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_to_user_id ON public.ownership_transfers(to_user_id);

ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;

-- 2) RLS policies
-- The edge function uses the service role and bypasses RLS. These policies protect the
-- direct REST path: only the company owner can read/write transfer records.
DROP POLICY IF EXISTS "select_owner_transfers" ON public.ownership_transfers;
CREATE POLICY "select_owner_transfers" ON public.ownership_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.ownership_transfers.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "insert_owner_transfers" ON public.ownership_transfers;
CREATE POLICY "insert_owner_transfers" ON public.ownership_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.ownership_transfers.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "update_owner_transfers" ON public.ownership_transfers;
CREATE POLICY "update_owner_transfers" ON public.ownership_transfers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.ownership_transfers.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "delete_owner_transfers" ON public.ownership_transfers;
CREATE POLICY "delete_owner_transfers" ON public.ownership_transfers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = public.ownership_transfers.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );
