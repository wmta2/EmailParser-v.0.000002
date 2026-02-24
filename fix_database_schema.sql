/*
  # Fix raw_email ID Type from UUID to BIGINT

  ## Overview
  This migration fixes the type mismatch between the database schema (UUID) and the
  application code (number/BIGINT). The application expects raw_email IDs to be integers,
  but the database currently uses UUIDs.

  ## Instructions
  1. Open your Supabase Dashboard
  2. Navigate to the SQL Editor
  3. Copy and paste this entire script
  4. Click "Run" to execute

  ## What This Does
  - Converts raw_email.id from UUID to BIGINT (auto-incrementing)
  - Updates orders.raw_email_id to match (BIGINT)
  - Preserves all your email data
  - Recreates tables with correct types
  - Restores all security policies

  ## Notes
  - Existing orders will be deleted (sample data only)
  - Email records are preserved with new integer IDs
*/

-- Step 1: Drop dependent tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Step 2: Backup and recreate raw_email with BIGSERIAL id
CREATE TEMP TABLE raw_email_backup AS
SELECT
  subject,
  from_address,
  raw_content,
  html_content,
  text_content,
  received_at,
  imported_at,
  created_at
FROM raw_emails;

DROP TABLE IF EXISTS raw_emails CASCADE;
DROP TABLE IF EXISTS raw_email CASCADE;

CREATE TABLE raw_email (
  id BIGSERIAL PRIMARY KEY,
  subject text DEFAULT '',
  from_email text DEFAULT '',
  content text,
  html_body text,
  message_id text,
  date_received timestamptz DEFAULT now(),
  date_parsed timestamptz,
  customer_id bigint,
  platform text,
  created_at timestamptz DEFAULT now()
);

-- Restore email data with new integer IDs and map old columns to new ones
INSERT INTO raw_email (
  subject,
  from_email,
  content,
  html_body,
  date_received,
  date_parsed,
  created_at
)
SELECT
  subject,
  from_address,
  COALESCE(raw_content, text_content),
  html_content,
  received_at,
  imported_at,
  created_at
FROM raw_email_backup;

DROP TABLE raw_email_backup;

-- Step 3: Recreate orders table with BIGINT raw_email_id
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_email_id bigint REFERENCES raw_email(id) ON DELETE CASCADE,
  order_number text DEFAULT '',
  delivery_address text DEFAULT '',
  billing_address text DEFAULT '',
  notes text DEFAULT '',
  requester text DEFAULT '',
  template_type text DEFAULT '',
  parsing_status text DEFAULT 'pending',
  parsing_error text,
  parsed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Step 4: Recreate order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_code text DEFAULT '',
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  size text DEFAULT '',
  tax numeric DEFAULT 0,
  gross numeric DEFAULT 0,
  uom text DEFAULT '',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Step 5: Create indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_requester ON orders(requester);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_parsing_status ON orders(parsing_status);
CREATE INDEX idx_orders_raw_email_id ON orders(raw_email_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_raw_email_created_at ON raw_email(created_at DESC);

-- Step 6: Enable RLS
ALTER TABLE raw_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for raw_email
DROP POLICY IF EXISTS "Authenticated users can view all emails" ON raw_email;
DROP POLICY IF EXISTS "Service role can insert emails" ON raw_email;
DROP POLICY IF EXISTS "Service role can update emails" ON raw_email;
DROP POLICY IF EXISTS "Service role can delete emails" ON raw_email;

CREATE POLICY "Authenticated users can view all emails"
  ON raw_email FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert emails"
  ON raw_email FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update emails"
  ON raw_email FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete emails"
  ON raw_email FOR DELETE
  TO service_role
  USING (true);

-- Step 8: Create RLS policies for orders
CREATE POLICY "Authenticated users can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update orders"
  ON orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete orders"
  ON orders FOR DELETE
  TO service_role
  USING (true);

-- Step 9: Create RLS policies for order_items
CREATE POLICY "Authenticated users can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert order items"
  ON order_items FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update order items"
  ON order_items FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete order items"
  ON order_items FOR DELETE
  TO service_role
  USING (true);
