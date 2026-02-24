/*
  # Extend Orders and Order Items for Multi-Channel Support

  ## Overview
  Adds channel tracking, customer linking, and WooCommerce-specific fields to the
  existing orders and order_items tables.

  ## Changes to `orders`
  - `channel_source` (text, default 'email') - Quick-access label for the source channel
  - `channel_id` (uuid, FK to sales_channels) - Relational link to the channel
  - `customer_id` (uuid, FK to customers) - Link to the unified customers table
  - `external_order_id` (text) - The order ID from the source system
  - `order_status` (text, default 'pending') - Generalized status across channels
  - `currency` (text, default 'GBP') - Order currency
  - `order_total` (numeric, default 0) - Cached total for quick display
  - `shipping_total` (numeric, default 0) - Shipping cost
  - `tax_total` (numeric, default 0) - Total tax
  - `discount_total` (numeric, default 0) - Total discounts

  ## Changes to `order_items`
  - `sku` (text) - Standardized product identifier across channels
  - `discount` (numeric, default 0) - Per-line discount

  ## Indexes
  - Index on orders.channel_source for channel filtering
  - Index on orders.channel_id for relational lookups
  - Index on orders.external_order_id for deduplication
  - Index on orders.order_status for status filtering
*/

-- Add new columns to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'channel_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN channel_source text NOT NULL DEFAULT 'email';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'channel_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN channel_id uuid REFERENCES sales_channels(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'external_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN external_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_status text NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'currency'
  ) THEN
    ALTER TABLE orders ADD COLUMN currency text NOT NULL DEFAULT 'GBP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_total'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_total numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_total'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_total numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax_total'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_total numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_total'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_total numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add new columns to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'sku'
  ) THEN
    ALTER TABLE order_items ADD COLUMN sku text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'discount'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount numeric DEFAULT 0;
  END IF;
END $$;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_orders_channel_source ON orders(channel_source);
CREATE INDEX IF NOT EXISTS idx_orders_channel_id ON orders(channel_id);
CREATE INDEX IF NOT EXISTS idx_orders_external_order_id ON orders(external_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
