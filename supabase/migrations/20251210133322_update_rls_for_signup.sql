/*
  # Update RLS Policies for User Signup

  1. Changes
    - Add policy to allow service role to insert user profiles
    - This enables the trigger function to create profiles during signup
    - Maintain security by only allowing this for service role

  2. Security
    - Service role can bypass RLS (used by triggers)
    - Regular users still restricted to their own data
    - No changes to user-facing permissions
*/

-- Drop the existing insert policy to recreate it
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create new policy that allows both authenticated users and service role
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated, service_role
  WITH CHECK (auth.uid() = id OR current_user = 'postgres');

-- Ensure service role can update invitations
DROP POLICY IF EXISTS "Service can update invitations" ON invitations;
CREATE POLICY "Service can update invitations"
  ON invitations FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);