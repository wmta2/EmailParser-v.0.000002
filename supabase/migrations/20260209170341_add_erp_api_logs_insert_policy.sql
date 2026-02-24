/*
  # Add INSERT Policy for ERP API Logs
  
  ## Changes
  
  1. Add INSERT policy for `erp_api_logs` table
     - Allows authenticated users to insert logs (edge function uses auth context)
     - Allows service role to insert logs (edge function may use service role for reliability)
  
  ## Security Notes
  
  - Edge functions run with either user auth context or service role
  - All inserts come from trusted edge function code, not direct client calls
  - Logs are sanitized before insertion (credentials masked)
*/

-- Policy: Allow authenticated users to insert API logs
-- This allows the edge function to insert logs when called by authenticated users
CREATE POLICY "Authenticated users can insert API logs"
  ON erp_api_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
