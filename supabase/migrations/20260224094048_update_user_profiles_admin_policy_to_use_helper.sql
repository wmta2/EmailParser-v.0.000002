/*
  # Update user_profiles Admin Policy to Use Helper Function

  1. Purpose
    - Use consistent is_admin() helper function

  2. Changes
    - Drop existing admin policy
    - Recreate using is_admin() function
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
