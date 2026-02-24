/*
  # Add Super Admin Role to User Profiles

  1. Changes
    - Alter user_profiles role column to include 'super_admin' role type
    - Add check constraint to ensure only valid roles are used
    - Update is_admin() helper function to also check for super_admin
    - Create new is_super_admin() helper function for template access control
    - Update email_template_patterns RLS policies to use super_admin instead of admin
    - Update user management policies to allow both admin and super_admin access

  2. Security
    - RLS policies updated to restrict template access to super_admin only
    - User management (user_profiles, invitations) accessible to both admin and super_admin
    - All other resources remain accessible to all authenticated users
    - Password changes restricted to own account only

  3. Notes
    - Existing admin users will retain their admin role
    - To promote a user to super_admin, update their role in user_profiles table
    - The role determines navigation menu access and feature permissions

  4. Manual Application
    - This file needs to be applied manually to your Supabase database
    - Run this SQL in the Supabase SQL Editor
*/

-- Step 1: Update the role check constraint on user_profiles if it exists
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_role_check'
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

-- Add new check constraint that includes super_admin
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Step 2: Update is_admin() function to include super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Step 3: Create is_super_admin() helper function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Step 4: Update email_template_patterns policies to require super_admin
DROP POLICY IF EXISTS "Admins can view templates" ON email_template_patterns;
DROP POLICY IF EXISTS "Admins can insert templates" ON email_template_patterns;
DROP POLICY IF EXISTS "Admins can update templates" ON email_template_patterns;
DROP POLICY IF EXISTS "Admins can delete templates" ON email_template_patterns;

-- Super admins can view all templates
CREATE POLICY "Super admins can view templates"
  ON email_template_patterns
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can insert templates
CREATE POLICY "Super admins can insert templates"
  ON email_template_patterns
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Super admins can update templates
CREATE POLICY "Super admins can update templates"
  ON email_template_patterns
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Super admins can delete templates
CREATE POLICY "Super admins can delete templates"
  ON email_template_patterns
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Step 5: Update invitations table policies to allow both admin and super_admin
DROP POLICY IF EXISTS "Admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

-- Admins and super admins can view all invitations
CREATE POLICY "Admins can view invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins and super admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins and super admins can update invitations
CREATE POLICY "Admins can update invitations"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins and super admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 6: Ensure user_profiles policies allow admins to view all users
-- The existing "Admins can view all profiles" policy already uses is_admin()
-- which now includes super_admin, so no changes needed there

-- Step 7: Update handle_new_user function to support super_admin role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role from invitation if exists
  SELECT role INTO user_role
  FROM public.invitations
  WHERE email = NEW.email
  AND used = false
  LIMIT 1;

  -- If no invitation found, default to 'user'
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;

  -- Validate role is one of the allowed values
  IF user_role NOT IN ('user', 'admin', 'super_admin') THEN
    user_role := 'user';
  END IF;

  -- Insert the user profile
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, user_role);

  -- Mark invitation as used if it exists
  UPDATE public.invitations
  SET used = true
  WHERE email = NEW.email
  AND used = false;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;
