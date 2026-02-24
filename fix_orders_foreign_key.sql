/*
  # Fix Orders Table Schema

  ## Changes
  - Drop and recreate `orders` table with correct foreign key type
  - Drop and recreate `order_items` table (dependent on orders)
  - Change `raw_email_id` from UUID to BIGINT to match raw_email.id type
  - Restore complete order_items schema with all fields
  - Restore all indexes for query performance
  - Restore all RLS policies

  ## Security
  - Enable RLS on both tables
  - Authenticated users can view all orders and order items
  - Service role can insert/update/delete (for system operations)
*/

-- Drop existing tables (CASCADE handles dependencies)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Recreate orders table with correct raw_email_id type
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

-- Recreate order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_code text DEFAULT '',
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  position integer DEFAULT 0,
  size text DEFAULT '',
  tax numeric DEFAULT 0,
  gross numeric DEFAULT 0,
  uom text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_requester ON orders(requester);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_parsing_status ON orders(parsing_status);
CREATE INDEX IF NOT EXISTS idx_orders_raw_email_id ON orders(raw_email_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table
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

-- RLS Policies for order_items table
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
