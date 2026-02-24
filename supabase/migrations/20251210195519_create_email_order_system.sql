/*
  # Email Order System Schema

  1. New Tables
    - `raw_emails`
      - `id` (uuid, primary key) - unique identifier for each email
      - `subject` (text) - email subject line
      - `from_address` (text) - sender email address
      - `raw_content` (text) - complete raw email content
      - `html_content` (text) - HTML version if available
      - `text_content` (text) - plain text version
      - `received_at` (timestamptz) - when email was received
      - `imported_at` (timestamptz) - when email was imported to system
      - `created_at` (timestamptz) - record creation timestamp
      
    - `email_template_patterns`
      - `id` (uuid, primary key) - unique identifier
      - `template_name` (text) - friendly name for template
      - `template_type` (text) - type identifier (e.g., 'template_1', 'template_2')
      - `detection_patterns` (jsonb) - patterns for template detection
      - `parsing_rules` (jsonb) - rules for extracting data
      - `priority` (integer) - detection priority order
      - `active` (boolean) - whether template is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `orders`
      - `id` (uuid, primary key) - unique identifier
      - `raw_email_id` (uuid, foreign key) - links to raw_emails
      - `order_number` (text) - order/invoice number
      - `delivery_address` (text) - delivery address
      - `billing_address` (text) - billing address
      - `notes` (text) - order notes or comments
      - `requester` (text) - restaurant/business name
      - `template_type` (text) - which template was detected
      - `parsing_status` (text) - success, failed, pending
      - `parsing_error` (text) - error details if failed
      - `parsed_at` (timestamptz) - when parsing completed
      - `created_at` (timestamptz)
      
    - `order_items`
      - `id` (uuid, primary key) - unique identifier
      - `order_id` (uuid, foreign key) - links to orders
      - `product_code` (text) - product/SKU code
      - `product_name` (text) - product description
      - `quantity` (numeric) - quantity ordered
      - `unit_price` (numeric) - price per unit
      - `total` (numeric) - line total (quantity * unit_price)
      - `position` (integer) - display order position
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to view all emails and orders
    - Only system/service role can insert/update/delete

  3. Indexes
    - Index on order_number for fast lookups
    - Index on requester for filtering
    - Index on created_at for chronological sorting
    - Index on parsing_status for status filtering
*/

-- Create raw_emails table
CREATE TABLE IF NOT EXISTS raw_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text DEFAULT '',
  from_address text DEFAULT '',
  raw_content text NOT NULL,
  html_content text,
  text_content text,
  received_at timestamptz DEFAULT now(),
  imported_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create email_template_patterns table
CREATE TABLE IF NOT EXISTS email_template_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text UNIQUE NOT NULL,
  detection_patterns jsonb DEFAULT '{}',
  parsing_rules jsonb DEFAULT '{}',
  priority integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_email_id uuid REFERENCES raw_emails(id) ON DELETE CASCADE,
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

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_code text DEFAULT '',
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_requester ON orders(requester);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_parsing_status ON orders(parsing_status);
CREATE INDEX IF NOT EXISTS idx_orders_raw_email_id ON orders(raw_email_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_raw_emails_created_at ON raw_emails(created_at DESC);

-- Enable Row Level Security
ALTER TABLE raw_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raw_emails
CREATE POLICY "Authenticated users can view all emails"
  ON raw_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert emails"
  ON raw_emails FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update emails"
  ON raw_emails FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete emails"
  ON raw_emails FOR DELETE
  TO service_role
  USING (true);

-- RLS Policies for email_template_patterns
CREATE POLICY "Authenticated users can view templates"
  ON email_template_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage templates"
  ON email_template_patterns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for orders
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

-- RLS Policies for order_items
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

-- Insert some default template patterns for common email formats
INSERT INTO email_template_patterns (template_name, template_type, detection_patterns, priority, active)
VALUES 
  (
    'Standard Order Template',
    'template_1',
    '{"keywords": ["Order Number", "Delivery Address", "Product Code"], "structure": "table"}'::jsonb,
    1,
    true
  ),
  (
    'Alternative Order Template',
    'template_2',
    '{"keywords": ["Invoice", "Ship To", "Item #"], "structure": "list"}'::jsonb,
    2,
    true
  )
ON CONFLICT (template_type) DO NOTHING;