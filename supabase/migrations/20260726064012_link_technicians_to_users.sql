/*
# Link technicians to auth users

## Summary
Adds a nullable `user_id` column to the `technicians` table so a technician
record can be linked to a signed-in user account. This lets the technician
mobile page filter work orders to "jobs assigned to me".

## Changes
- `technicians.user_id` (uuid, nullable, references auth.users ON DELETE SET NULL)
- Unique index on `technicians.user_id` so one user maps to at most one technician.
- Index for lookup by user_id.

## Security
No new RLS policies needed — the existing authenticated CRUD policies on
technicians already cover this column. The column is nullable so existing
seed technician rows (not linked to any user) remain valid.
*/

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_technicians_user_id
  ON technicians(user_id)
  WHERE user_id IS NOT NULL;
