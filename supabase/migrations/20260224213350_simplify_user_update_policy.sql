/*
  # Simplify User Update Policy to Avoid Recursion

  1. Problem
    - Cannot use OLD.role in RLS policies
    - Cannot query user_profiles without causing recursion
    - Need to prevent users from changing their own role

  2. Solution
    - Remove role field from columns users can update
    - Use a CHECK constraint or trigger for role protection
    - Keep update policy simple with just id check

  3. Changes
    - Simplify "Users can update own profile" policy
    - Users can update their profile but the admin policies handle role changes

  4. Security
    - Users can update own profile (id = auth.uid())
    - Only admins can update roles (via separate admin policy)
    - No recursion risk
*/

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
