/*
  # Fix Infinite Recursion in user_profiles RLS Policy

  1. Problem
    - The SELECT policy queries user_profiles to check admin role
    - This causes infinite recursion when accessing the table

  2. Solution
    - Use auth.jwt() to check role from JWT metadata instead
    - This avoids querying the table during policy evaluation

  3. Changes
    - Drop existing SELECT policy
    - Create new policy using JWT-based role check
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;

-- Create new policy that doesn't cause recursion
-- Users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
  );

-- Separate policy for admins to view all profiles
-- Uses JWT app_metadata to avoid recursion
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
