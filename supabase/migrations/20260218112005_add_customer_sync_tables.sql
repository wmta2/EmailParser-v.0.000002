/*
  # Add Customer Sync Infrastructure

  ## Overview
  This migration adds support for syncing customers from Orderwise ERP to local database.
  Enables incremental daily sync and manual on-demand sync operations.

  ## Changes Made

  ### 1. Customers Table Updates
    - Add `account_number` column (text, nullable)
      - Stores the Orderwise account number for customer identification
      - Used for matching and updating existing customer records
    - Add index on `external_id` for faster lookups during sync
    - Add index on `account_number` for faster lookups during sync
    - Add trigger to auto-update `updated_at` timestamp

  ### 2. New Table: customer_sync_log
    - `id` (uuid, primary key)
    - `erp_destination_id` (uuid, foreign key to erp_destinations)
    - `sync_type` (text: 'manual' or 'scheduled')
    - `status` (text: 'running', 'completed', 'failed')
    - `customers_fetched` (integer) - Total customers received from Orderwise
    - `customers_created` (integer) - New customer records created
    - `customers_updated` (integer) - Existing customer records updated
    - `customers_skipped` (integer) - Customers skipped due to errors/validation
    - `error_message` (text, nullable) - High-level error description
    - `error_details` (jsonb, nullable) - Detailed error information
    - `started_at` (timestamptz) - Sync operation start time
    - `completed_at` (timestamptz, nullable) - Sync operation completion time
    - `last_modified_since` (timestamptz, nullable) - Timestamp used for incremental sync
    - `created_at` (timestamptz) - Record creation time

  ### 3. Security (RLS Policies)
    - Enable RLS on `customer_sync_log` table
    - Authenticated users can view customer sync logs
    - Only authenticated users can create sync log entries (via app/edge function)

  ### 4. Indexes
    - Index on `customers.external_id` for fast customer lookup
    - Index on `customers.account_number` for fast customer lookup
    - Index on `customer_sync_log.erp_destination_id` for filtering logs
    - Index on `customer_sync_log.started_at` for chronological sorting

  ## Notes
    - Customer sync is one-way: Orderwise → Local (never Local → Orderwise)
    - Existing customer data is preserved and updated, not replaced
    - Account number serves as the primary matching key
    - Supports incremental sync via `last_modified_since` parameter
*/

-- Add account_number column to customers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_number text;
  END IF;
END $$;

-- Add indexes for faster customer lookups during sync
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(external_id);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);

-- Create trigger to auto-update customers.updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON customers;
CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Create customer_sync_log table
CREATE TABLE IF NOT EXISTS customer_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('manual', 'scheduled')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  customers_fetched integer NOT NULL DEFAULT 0,
  customers_created integer NOT NULL DEFAULT 0,
  customers_updated integer NOT NULL DEFAULT 0,
  customers_skipped integer NOT NULL DEFAULT 0,
  error_message text,
  error_details jsonb,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  last_modified_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create indexes on customer_sync_log
CREATE INDEX IF NOT EXISTS idx_customer_sync_log_erp_destination ON customer_sync_log(erp_destination_id);
CREATE INDEX IF NOT EXISTS idx_customer_sync_log_started_at ON customer_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sync_log_status ON customer_sync_log(status);

-- Enable RLS on customer_sync_log
ALTER TABLE customer_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_sync_log
CREATE POLICY "Authenticated users can view customer sync logs"
  ON customer_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer sync logs"
  ON customer_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer sync logs"
  ON customer_sync_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);