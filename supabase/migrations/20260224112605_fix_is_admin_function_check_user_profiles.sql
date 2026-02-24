/*
  # Fix is_admin function to check user_profiles table

  1. Changes
    - Update is_admin() function to check both JWT claims AND user_profiles table
    - This ensures admin access works even before JWT is refreshed

  2. Security
    - Function checks authenticated user's role from user_profiles as fallback
    - Maintains existing JWT-based check for performance
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First check JWT claims (fast path)
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'),
    false
  )
  OR
  -- Fallback to user_profiles table
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;
