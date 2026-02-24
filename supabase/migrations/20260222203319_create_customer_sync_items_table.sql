/*
  # Create Customer Sync Items Table

  ## Overview
  This migration creates a table to track individual customers processed during each sync operation.
  Enables detailed audit logging and allows users to view specific customers that were created, updated, or skipped.

  ## New Tables

  ### 1. customer_sync_items
    - `id` (uuid, primary key) - Unique identifier for each sync item record
    - `sync_log_id` (uuid, foreign key) - Reference to the parent customer_sync_log
    - `customer_id` (uuid, foreign key, nullable) - Reference to the customer record (null if customer wasn't created)
    - `external_id` (text) - The account number/external identifier from Orderwise
    - `action` (text) - What happened: 'created', 'updated', or 'skipped'
    - `customer_snapshot` (jsonb) - Full customer data at the time of sync for audit purposes
    - `error_message` (text, nullable) - Error details if the customer was skipped due to an error
    - `created_at` (timestamptz) - When this record was created

  ## Security (RLS Policies)
    - Enable RLS on customer_sync_items table
    - Authenticated users can view sync items
    - Authenticated users can insert sync items (via app/edge function during sync)

  ## Indexes
    - Index on sync_log_id for efficient filtering by sync operation
    - Index on action for filtering by action type
    - Index on customer_id for looking up sync history for a specific customer
    - Composite index on (sync_log_id, action) for common query pattern

  ## Notes
    - customer_snapshot stores the complete customer data as it was received from Orderwise
    - This enables historical auditing even if the customer record is later modified
    - The action field uses a CHECK constraint to ensure valid values
*/

-- Create customer_sync_items table
CREATE TABLE IF NOT EXISTS customer_sync_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id uuid NOT NULL REFERENCES customer_sync_log(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'skipped')),
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_sync_items_sync_log ON customer_sync_items(sync_log_id);
CREATE INDEX IF NOT EXISTS idx_customer_sync_items_action ON customer_sync_items(action);
CREATE INDEX IF NOT EXISTS idx_customer_sync_items_customer ON customer_sync_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sync_items_sync_log_action ON customer_sync_items(sync_log_id, action);

-- Enable RLS on customer_sync_items
ALTER TABLE customer_sync_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_sync_items
CREATE POLICY "Authenticated users can view customer sync items"
  ON customer_sync_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer sync items"
  ON customer_sync_items FOR INSERT
  TO authenticated
  WITH CHECK (true);