-- Enforce one membership per user on company_memberships.
--
-- Why: The create-company edge function's "already belongs to a company" guard
-- is a non-atomic check-then-insert. A double-submit / concurrent invocation can
-- race past the check and create duplicate company + settings + subscription +
-- membership rows. The company_memberships.user_id UNIQUE constraint is the
-- atomic, database-level guard that makes the edge function's conflict handling
-- reliable (it catches the 23505 unique violation and rolls back the loser).
--
-- This migration:
--   1. De-duplicates any existing duplicate memberships (keeps the earliest
--      created_at per user, deletes the rest) so the constraint can be added.
--   2. Adds a UNIQUE constraint on user_id if one does not already exist.
--
-- Safe to re-run (idempotent).

-- 1) De-duplicate: keep the earliest membership per user, drop the rest.
--    Deleting a membership cascades nothing here; the company itself is kept so
--    we don't destroy the winning company's data. Only the losing membership
--    rows are removed.
DELETE FROM public.company_memberships cm
USING public.company_memberships cm2
WHERE cm.user_id = cm2.user_id
  AND cm.id <> cm2.id
  AND cm.created_at > cm2.created_at;

-- 2) Add the UNIQUE constraint if it isn't already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_memberships_user_id_key'
      AND conrelid = 'public.company_memberships'::regclass
  ) THEN
    ALTER TABLE public.company_memberships
      ADD CONSTRAINT company_memberships_user_id_key UNIQUE (user_id);
  END IF;
END $$;
