/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - The "Admins can view all profiles" policy queries user_profiles table
    - This creates infinite recursion when checking permissions on user_profiles
    - Error: "infinite recursion detected in policy for relation user_profiles"

  2. Solution
    - Create a helper function `is_admin()` that bypasses RLS using SECURITY DEFINER
    - Drop and recreate the problematic admin policy to use the helper function
    - This prevents the recursion by having the function bypass RLS checks

  3. Changes
    - New function: `is_admin()` - checks if current user has admin role
    - Updated policy: "Admins can view all profiles" - uses is_admin() function
    - Function uses SECURITY DEFINER to bypass RLS and prevent recursion

  4. Security
    - Function is marked STABLE to allow caching within a transaction
    - Only checks the current user's own role, no privilege escalation
    - Still maintains proper access control for all users
*/

-- Create a helper function to check if the current user is an admin
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Recreate the policy using the helper function
-- This prevents recursion because the function bypasses RLS
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;