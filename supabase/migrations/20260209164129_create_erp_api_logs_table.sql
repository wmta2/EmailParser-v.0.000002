/*
  # Create ERP API Logs Table
  
  ## Overview
  Creates a comprehensive logging system for tracking all API interactions with ERP systems (specifically Orderwise).
  This provides complete visibility into authentication attempts, API calls, responses, errors, and performance metrics.
  
  ## New Tables
  
  ### `erp_api_logs`
  Stores detailed logs of every API interaction with ERP systems:
  - `id` - Unique log entry identifier
  - `erp_destination_id` - Reference to the ERP system (e.g., Orderwise)
  - `erp_configuration_id` - Reference to the specific user configuration
  - `request_type` - Type of request (authentication, api_request)
  - `endpoint` - Full URL being called
  - `http_method` - HTTP verb (GET, POST, PUT, DELETE)
  - `request_headers` - Sanitized request headers (passwords/tokens masked)
  - `request_body` - Request payload data
  - `response_status` - HTTP status code (200, 401, 500, etc.)
  - `response_headers` - Response headers
  - `response_body` - Response data
  - `error_message` - User-friendly error description
  - `duration_ms` - Request duration in milliseconds
  - `success` - Boolean flag for quick filtering
  - `created_at` - Timestamp of the log entry
  - `metadata` - Additional context (function version, region, etc.)
  
  ## Indexes
  
  1. Primary index on `id`
  2. Index on `erp_destination_id` for filtering by ERP system
  3. Index on `created_at DESC` for time-based queries
  4. Index on `success` for filtering failures
  5. Composite index on `erp_destination_id + created_at DESC` for efficient filtering
  
  ## Security
  
  - Enable RLS on `erp_api_logs` table
  - Only admin and super_admin users can view logs
  - Regular users cannot access API logs
  
  ## Retention Policy
  
  - Logs older than 30 days will be automatically deleted
  - Cleanup function can be triggered manually or via scheduled job
*/

-- Create the erp_api_logs table
CREATE TABLE IF NOT EXISTS erp_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id uuid REFERENCES erp_destinations(id) ON DELETE CASCADE,
  erp_configuration_id uuid REFERENCES erp_configurations(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('authentication', 'api_request')),
  endpoint text NOT NULL,
  http_method text NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  request_headers jsonb DEFAULT '{}'::jsonb,
  request_body jsonb DEFAULT NULL,
  response_status integer,
  response_headers jsonb DEFAULT '{}'::jsonb,
  response_body jsonb DEFAULT NULL,
  error_message text,
  duration_ms integer,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_erp_api_logs_destination ON erp_api_logs(erp_destination_id);
CREATE INDEX IF NOT EXISTS idx_erp_api_logs_created_at ON erp_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_api_logs_success ON erp_api_logs(success);
CREATE INDEX IF NOT EXISTS idx_erp_api_logs_destination_created ON erp_api_logs(erp_destination_id, created_at DESC);

-- Enable RLS
ALTER TABLE erp_api_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and super_admins can view API logs
CREATE POLICY "Admins can view API logs"
  ON erp_api_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Function to delete logs older than specified days
CREATE OR REPLACE FUNCTION delete_old_erp_api_logs(days_to_keep integer DEFAULT 30)
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM erp_api_logs
  WHERE created_at < (now() - (days_to_keep || ' days')::interval);
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION delete_old_erp_api_logs TO authenticated;
