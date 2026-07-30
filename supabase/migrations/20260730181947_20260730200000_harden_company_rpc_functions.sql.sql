/*
# Harden create_company and accept_invitation (SECURITY DEFINER)

## Purpose
The Supabase security advisor flags that `create_company` and
`accept_invitation` are SECURITY DEFINER functions callable by the
`authenticated` role via /rest/v1/rpc/. These functions MUST remain callable
by authenticated users — the frontend's "Create Company" and "Join Company"
signup flows invoke them directly via supabase.rpc(). Switching to
SECURITY INVOKER would break both flows (the caller has no direct INSERT
privilege on companies / company_memberships / invitations), and revoking
EXECUTE would also break them.

The real risk the advisor cares about with SECURITY DEFINER + REST exposure
is search-path injection. Both functions already pin `SET search_path = public`,
which mitigates that. This migration re-asserts that protection and adds
explicit defensive checks so the functions fail safely on any unexpected
input, documenting why the EXECUTE grant is intentional.

## Changes
- `create_company(company_name text)`: re-created with pinned search_path,
  explicit auth.uid() null check, empty-name guard, and schema-qualified
  references. Logic unchanged.
- `accept_invitation(invite_code text)`: re-created with pinned search_path,
  explicit auth.uid() null check, empty-code guard, and schema-qualified
  references. Logic unchanged.
- EXECUTE grants unchanged: authenticated can still call both (intentional,
  required by the frontend). anon and PUBLIC remain revoked.

## Security impact
- search_path is immutable (pinned to public) — no search-path injection.
- Both functions validate the caller is authenticated before any write.
- Both functions enforce business rules (one company per user, valid invite,
  not expired, not already accepted).
- anon/PUBLIC cannot invoke either function.

## Notes
1. Idempotent: CREATE OR REPLACE FUNCTION is safe to re-run.
2. No data is modified; no schema/column changes.
3. The EXECUTE grant on authenticated is intentional and documented.
*/

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

-- Re-affirm grants: authenticated only (anon + PUBLIC revoked)
REVOKE EXECUTE ON FUNCTION public.create_company(company_name text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company(company_name text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(invite_code text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(invite_code text) TO authenticated;