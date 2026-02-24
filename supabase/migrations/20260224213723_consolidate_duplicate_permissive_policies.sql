/*
  # Consolidate Duplicate Permissive Policies

  1. Problem
    - Multiple permissive policies for the same action create confusion
    - user_profiles has 2 SELECT policies and 2 UPDATE policies
    - This is inefficient and harder to maintain

  2. Solution
    - Combine multiple permissive policies into single policies with OR conditions
    - One SELECT policy covering both users and admins
    - One UPDATE policy covering both users and admins

  3. Changes
    - Drop separate user/admin policies
    - Create consolidated policies with OR logic
    - Maintains same security guarantees with simpler structure

  4. Benefits
    - Easier to understand and maintain
    - Better performance (fewer policy evaluations)
    - Cleaner policy list
*/

-- Drop the separate policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Create consolidated SELECT policy
CREATE POLICY "View own profile or all if admin"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own profile
    id = (SELECT auth.uid())
    OR
    -- Admins can view all profiles
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Create consolidated UPDATE policy
CREATE POLICY "Update own profile or any if admin"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    id = (SELECT auth.uid())
    OR
    -- Admins can update any profile
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    -- Users can only update their own profile
    (
      id = (SELECT auth.uid())
      AND id = (SELECT auth.uid())
    )
    OR
    -- Super admins can update any profile
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
    OR
    -- Regular admins can update non-super-admin profiles
    (
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      AND role != 'super_admin'
    )
  );
