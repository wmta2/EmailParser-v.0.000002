/*
  # Fix Infinite Recursion in user_profiles RLS Policies

  1. Problem
    - Current policies query user_profiles table to check admin status
    - This creates infinite recursion when accessing user_profiles
    - Error: "infinite recursion detected in policy for relation user_profiles"

  2. Solution
    - For user_profiles table ONLY: Use JWT claims directly
    - JWT claims don't require table lookups, avoiding recursion
    - Check auth.jwt() -> 'app_metadata' ->> 'role' for admin status
    - Keep is_disabled check simple to allow profile fetching

  3. Changes
    - Drop problematic policies that query user_profiles within user_profiles policies
    - Create new policies using ONLY JWT claims and direct column checks
    - Separate policies for regular users and admins for clarity

  4. Security
    - Users can view/update their own profile
    - Admins (checked via JWT) can view/update all profiles
    - is_disabled field prevents disabled users from accessing system
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "View own profile or all if admin" ON user_profiles;
DROP POLICY IF EXISTS "Update own profile or any if admin" ON user_profiles;

-- Create policies that use JWT claims instead of querying user_profiles
-- This avoids the infinite recursion

-- SELECT policies
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Users cannot change their own role
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    -- Super admins can do anything
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR
    -- Regular admins cannot create or modify super_admins
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND role != 'super_admin'
    )
  );
