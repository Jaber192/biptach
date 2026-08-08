-- Backfill: link existing invited technicians to their user accounts.
--
-- Previously, the accept-invitation edge function only created a
-- company_memberships row and updated the profile's role/company_id.
-- It never created a `technicians` record, so there was no reliable
-- way to resolve "which technician am I?" for invited technicians.
--
-- This migration creates a `technicians` row (with user_id set) for any
-- profile with role = 'technician' that does not already have a linked
-- technician record. It is safe to re-run; it only inserts missing rows.

INSERT INTO technicians (user_id, company_id, name, email, color, is_active, created_at, updated_at)
SELECT
  p.id,
  p.company_id,
  p.name,
  u.email,
  '#0ea5e9',
  true,
  now(),
  now()
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role = 'technician'
  AND p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM technicians t
    WHERE t.user_id = p.id
  );
