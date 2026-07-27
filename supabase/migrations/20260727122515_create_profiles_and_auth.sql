/*
# Create profiles table and auth automation

## Purpose
Sets up the authentication backbone for the Biptach HVAC field-service app.
Creates a `profiles` table mirroring Supabase auth users, stores role (admin/manager/technician),
and auto-creates a profile row on signup.

## New Tables
- `profiles`
  - `id` (uuid PK, references auth.users ON DELETE CASCADE)
  - `name` (text, not null)
  - `role` (text, not null, default 'manager', CHECK in admin/manager/technician)
  - `phone` (text, nullable)
  - `is_active` (boolean, default true)
  - `created_at`, `updated_at` (timestamptz)

## New Functions
- `is_admin()` — SECURITY DEFINER, returns true if current user's profile role is 'admin'.
- `set_updated_at()` — trigger function to auto-update updated_at.
- `handle_new_user()` — SECURITY DEFINER, AFTER INSERT on auth.users, inserts profile row.

## New Triggers
- `profiles_set_updated_at` — BEFORE UPDATE on profiles.
- `on_auth_user_created` — AFTER INSERT on auth.users.

## Security (RLS)
- RLS enabled on profiles.
- SELECT: own profile OR admin.
- UPDATE: own profile OR admin.
- INSERT: own profile (for edge cases).

## Notes
1. First user gets 'manager' role by default. Promote to admin via: UPDATE profiles SET role='admin' WHERE id='<uuid>';
2. Email confirmation OFF.
3. Trigger reads raw_user_meta_data->>'name' set by frontend signUp().
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'technician')),
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- is_admin() helper — must exist before policies reference it
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

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

-- Auto-create profile on signup
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
    'manager',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "select_own_or_admin_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "update_own_or_admin_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
