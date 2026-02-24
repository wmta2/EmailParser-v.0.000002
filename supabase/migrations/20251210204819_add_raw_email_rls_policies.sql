/*
  # Add RLS Policies for raw_email Table

  1. Changes
    - Add SELECT policy for authenticated users on raw_email table
    - Allow authenticated users to view all email records
  
  2. Security
    - Authenticated users can read all raw_email records
    - Service role maintains full access
*/

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view all emails" ON raw_email;
  DROP POLICY IF EXISTS "Service role can insert emails" ON raw_email;
  DROP POLICY IF EXISTS "Service role can update emails" ON raw_email;
  DROP POLICY IF EXISTS "Service role can delete emails" ON raw_email;
END $$;

-- Add SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view all emails"
  ON raw_email
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for service role to insert emails
CREATE POLICY "Service role can insert emails"
  ON raw_email
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add policy for service role to update emails
CREATE POLICY "Service role can update emails"
  ON raw_email
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add policy for service role to delete emails
CREATE POLICY "Service role can delete emails"
  ON raw_email
  FOR DELETE
  TO service_role
  USING (true);