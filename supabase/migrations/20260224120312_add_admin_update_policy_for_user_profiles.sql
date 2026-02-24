/*
  # Add admin update policy for user_profiles

  1. Changes
    - Add UPDATE policy allowing admins and super_admins to update other users' profiles
    - Super admins can update any user
    - Admins can update users and other admins (but not super_admins)

  2. Security
    - Admins cannot escalate privileges to super_admin
    - Users cannot modify their own role (only admins can do that)
*/

CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() AND (
      (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
      OR
      (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
        AND role != 'super_admin'
      )
    )
  )
  WITH CHECK (
    is_admin() AND (
      (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
      OR
      (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
        AND role != 'super_admin'
      )
    )
  );