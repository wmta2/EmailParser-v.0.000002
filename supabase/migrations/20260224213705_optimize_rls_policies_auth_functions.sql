/*
  # Optimize RLS Policies with Auth Function Caching

  1. Problem
    - Current policies call auth.uid() and auth.jwt() for every row
    - This causes poor performance at scale
    - Functions should be evaluated once per query, not per row

  2. Solution
    - Wrap auth functions in SELECT to cache the result
    - Use (SELECT auth.uid()) instead of auth.uid()
    - Use (SELECT auth.jwt()) instead of auth.jwt()

  3. Changes
    - Update all user_profiles policies to use cached auth functions
    - This evaluates the function once per query instead of per row

  4. Performance Impact
    - Significantly faster queries on tables with many rows
    - Reduced function call overhead
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Recreate policies with cached auth functions

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    -- Super admins can do anything
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
    OR
    -- Regular admins cannot create or modify super_admins
    (
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      AND role != 'super_admin'
    )
  );
